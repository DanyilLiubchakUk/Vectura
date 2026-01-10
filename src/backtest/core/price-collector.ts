import { calculateDaysBetween, formatDay } from "@/backtest/storage/dateUtils";
import type { PricePoint } from "../types";
import {
    MARKET_OPEN_HOUR_UTC,
    MARKET_OPEN_MINUTE_UTC,
    MARKET_CLOSE_HOUR_UTC,
} from "@/backtest/constants";

interface DataPoint {
    price: PricePoint;
    equity?: PricePoint;
    cash?: PricePoint;
}

export class PriceCollector {
    private dataPoints: Map<string, DataPoint> = new Map(); // Use Map to avoid duplicates by time
    private lastSampleTime: string | null = null;
    private nextSampleTime: string | null = null;
    private sampleInterval: number; // in milliseconds
    private lastPriceSeen: number | null = null;
    private lastEquitySeen: number | null = null;
    private lastCashSeen: number | null = null;
    private lastTimestampSeen: string | null = null;
    private collectedDays: Set<string> = new Set();

    constructor(startDate: string, endDate: string) {
        this.sampleInterval = this.calculateSampleInterval(startDate, endDate);
    }

    /**
     * Check if a timestamp is within trading hours (14:30 UTC to 21:00 UTC exclusive)
     */
    private isWithinTradingHours(timestamp: string): boolean {
        const date = new Date(timestamp);
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();

        if (hours < MARKET_OPEN_HOUR_UTC) return false;
        if (hours === MARKET_OPEN_HOUR_UTC && minutes < MARKET_OPEN_MINUTE_UTC) return false;
        if (hours >= MARKET_CLOSE_HOUR_UTC) return false;
        return true;
    }

    /**
     * Check if a timestamp is on a weekend (Saturday or Sunday)
     */
    private isWeekend(timestamp: string): boolean {
        const date = new Date(timestamp);
        const dayOfWeek = date.getUTCDay(); // 0 = Sunday, 6 = Saturday
        return dayOfWeek === 0 || dayOfWeek === 6;
    }

    /**
     * Check if a timestamp should be included (within trading hours and not weekend)
     */
    private shouldIncludeTimestamp(timestamp: string): boolean {
        if (this.isWeekend(timestamp)) return false;
        return this.isWithinTradingHours(timestamp);
    }

    /**
     * Check if we've collected data for a specific day
     * Used to skip gap-filling on closed days (holidays)
     */
    private hasCollectedDay(timestamp: string): boolean {
        const day = formatDay(new Date(timestamp));
        return this.collectedDays.has(day);
    }

    /**
     * Mark a day as collected when we actually collect data for it
     */
    private markDayAsCollected(timestamp: string): void {
        const day = formatDay(new Date(timestamp));
        this.collectedDays.add(day);
    }

    /**
     * Calculate adaptive sample interval based on backtest duration
     */
    private calculateSampleInterval(startDate: string, endDate: string): number {
        const days = calculateDaysBetween(startDate, endDate, true);
        const months = days / 30;

        // < 1 month
        if (months < 1) {
            return 1000 * 60 * 5; // 5 minutes
        }
        // 1-6 months
        else if (months < 6) {
            return 1000 * 60 * 60; // 1 hour
        }
        // 6-12 months
        else if (months < 12) {
            return 1000 * 60 * 60 * 4; // 4 hours
        }
        // > 12 months
        else {
            return 1000 * 60 * 60 * 24; // 1 day
        }
    }

    /**
     * Collect a price point if it meets the sampling criteria
     */
    collectPrice(timestamp: string, price: number, equity?: number, cash?: number): void {
        const timestampMs = new Date(timestamp).getTime();
        const timeKey = timestamp;

        // Track the last values seen (for final collection and filling gaps)
        this.lastPriceSeen = price;
        if (equity !== undefined) this.lastEquitySeen = equity;
        if (cash !== undefined) this.lastCashSeen = cash;
        this.lastTimestampSeen = timestamp;

        // Always collect the first price point (only if within trading hours and weekday)
        if (this.dataPoints.size === 0) {
            if (this.shouldIncludeTimestamp(timestamp)) {
                const dataPoint: DataPoint = {
                    price: {
                        time: timestamp,
                        value: price,
                    },
                };
                if (equity !== undefined) {
                    dataPoint.equity = {
                        time: timestamp,
                        value: equity,
                    };
                } else if (this.lastEquitySeen !== null) {
                    dataPoint.equity = {
                        time: timestamp,
                        value: this.lastEquitySeen,
                    };
                }
                if (cash !== undefined) {
                    dataPoint.cash = {
                        time: timestamp,
                        value: cash,
                    };
                } else if (this.lastCashSeen !== null) {
                    dataPoint.cash = {
                        time: timestamp,
                        value: this.lastCashSeen,
                    };
                }
                this.dataPoints.set(timeKey, dataPoint);
                this.markDayAsCollected(timestamp);
                this.lastSampleTime = timestamp;
                this.nextSampleTime = new Date(timestampMs + this.sampleInterval).toISOString();
            }
            return;
        }

        // Fill missed intervals before processing current point
        if (this.lastSampleTime && this.nextSampleTime) {
            let nextSampleMs = new Date(this.nextSampleTime).getTime();
            let filledCount = 0;
            const MAX_FILL_ITERATIONS = 1000;

            // Fill in any missed intervals before this timestamp
            while (nextSampleMs <= timestampMs && filledCount < MAX_FILL_ITERATIONS) {
                const gapDay = formatDay(new Date(this.nextSampleTime));
                const lastSampleDay = this.lastSampleTime ? formatDay(new Date(this.lastSampleTime)) : null;
                const currentDay = formatDay(new Date(timestamp));

                const isUnknownDay = !this.hasCollectedDay(this.nextSampleTime) &&
                    gapDay !== lastSampleDay &&
                    gapDay !== currentDay;

                // Only include data points within trading hours, on weekdays, and on days we've collected data for
                if (!isUnknownDay && this.shouldIncludeTimestamp(this.nextSampleTime) && this.lastPriceSeen !== null) {
                    const missedDataPoint: DataPoint = {
                        price: {
                            time: this.nextSampleTime,
                            value: this.lastPriceSeen,
                        },
                    };
                    if (this.lastEquitySeen !== null) {
                        missedDataPoint.equity = {
                            time: this.nextSampleTime,
                            value: this.lastEquitySeen,
                        };
                    }
                    if (this.lastCashSeen !== null) {
                        missedDataPoint.cash = {
                            time: this.nextSampleTime,
                            value: this.lastCashSeen,
                        };
                    }
                    this.dataPoints.set(this.nextSampleTime, missedDataPoint);
                    this.markDayAsCollected(this.nextSampleTime);
                    // Update lastSampleTime only when we actually collect a point
                    this.lastSampleTime = this.nextSampleTime;
                }

                // Move to next interval (always advance, even if we skip this point)
                nextSampleMs += this.sampleInterval;
                this.nextSampleTime = new Date(nextSampleMs).toISOString();
                filledCount++;
            }

            // If we hit the limit, skip ahead to current timestamp
            if (filledCount >= MAX_FILL_ITERATIONS && nextSampleMs <= timestampMs) {
                // Only set if current timestamp is valid, otherwise find next valid
                if (this.shouldIncludeTimestamp(timestamp)) {
                    this.lastSampleTime = timestamp;
                    this.nextSampleTime = new Date(timestampMs + this.sampleInterval).toISOString();
                } else {
                    // Find next valid timestamp
                    let nextValidMs = timestampMs + this.sampleInterval;
                    let attempts = 0;
                    while (attempts < 100) {
                        const candidate = new Date(nextValidMs).toISOString();
                        if (this.shouldIncludeTimestamp(candidate)) {
                            this.nextSampleTime = candidate;
                            break;
                        }
                        nextValidMs += this.sampleInterval;
                        attempts++;
                    }
                }
            }
        }

        // Check if we should sample this point based on interval
        // Only include points within trading hours and on weekdays
        if (this.shouldIncludeTimestamp(timestamp)) {
            if (this.lastSampleTime) {
                const lastSampleMs = new Date(this.lastSampleTime).getTime();
                const timeSinceLastSample = timestampMs - lastSampleMs;

                if (timeSinceLastSample >= this.sampleInterval) {
                    const dataPoint: DataPoint = {
                        price: {
                            time: timestamp,
                            value: price,
                        },
                    };
                    // If equity/cash were provided, use them; otherwise use last seen values
                    if (equity !== undefined) {
                        dataPoint.equity = {
                            time: timestamp,
                            value: equity,
                        };
                    } else if (this.lastEquitySeen !== null) {
                        dataPoint.equity = {
                            time: timestamp,
                            value: this.lastEquitySeen,
                        };
                    }
                    if (cash !== undefined) {
                        dataPoint.cash = {
                            time: timestamp,
                            value: cash,
                        };
                    } else if (this.lastCashSeen !== null) {
                        dataPoint.cash = {
                            time: timestamp,
                            value: this.lastCashSeen,
                        };
                    }
                    this.dataPoints.set(timeKey, dataPoint);
                    this.markDayAsCollected(timestamp);
                    this.lastSampleTime = timestamp;
                    this.nextSampleTime = new Date(timestampMs + this.sampleInterval).toISOString();
                } else {
                    // Update equity/cash for existing point if this timestamp already exists
                    const existing = this.dataPoints.get(timeKey);
                    if (existing) {
                        if (equity !== undefined) {
                            existing.equity = {
                                time: timestamp,
                                value: equity,
                            };
                        } else if (this.lastEquitySeen !== null) {
                            existing.equity = {
                                time: timestamp,
                                value: this.lastEquitySeen,
                            };
                        }
                        if (cash !== undefined) {
                            existing.cash = {
                                time: timestamp,
                                value: cash,
                            };
                        } else if (this.lastCashSeen !== null) {
                            existing.cash = {
                                time: timestamp,
                                value: this.lastCashSeen,
                            };
                        }
                    }
                }
            }
        }
    }

    /**
     * Update equity and cash for a specific timestamp (if price was already collected)
     * This should be called after collectPrice for the same timestamp
     */
    updateAccount(timestamp: string, equity: number, cash: number): void {
        const timeKey = timestamp;
        const existing = this.dataPoints.get(timeKey);

        if (existing) {
            existing.equity = {
                time: timestamp,
                value: equity,
            };
            existing.cash = {
                time: timestamp,
                value: cash,
            };
        }

        this.lastEquitySeen = equity;
        this.lastCashSeen = cash;
    }

    /**
     * Force collect a price point (and optionally equity/cash) at a specific time (for action creation/execution)
     * This ensures we have price data at exact action times
     */
    forceCollectPrice(timestamp: string, price: number, equity?: number, cash?: number): void {
        const timeKey = timestamp;
        const timestampMs = new Date(timestamp).getTime();

        // Track last values
        this.lastPriceSeen = price;
        if (equity !== undefined) this.lastEquitySeen = equity;
        if (cash !== undefined) this.lastCashSeen = cash;
        this.lastTimestampSeen = timestamp;

        const existing = this.dataPoints.get(timeKey);

        if (existing) {
            existing.price = {
                time: timestamp,
                value: price,
            };
            if (equity !== undefined) {
                existing.equity = {
                    time: timestamp,
                    value: equity,
                };
            } else if (this.lastEquitySeen !== null) {
                existing.equity = {
                    time: timestamp,
                    value: this.lastEquitySeen,
                };
            }
            if (cash !== undefined) {
                existing.cash = {
                    time: timestamp,
                    value: cash,
                };
            } else if (this.lastCashSeen !== null) {
                existing.cash = {
                    time: timestamp,
                    value: this.lastCashSeen,
                };
            }
        } else {
            // Create new data point for execution
            const dataPoint: DataPoint = {
                price: {
                    time: timestamp,
                    value: price,
                },
            };
            if (equity !== undefined) {
                dataPoint.equity = {
                    time: timestamp,
                    value: equity,
                };
            } else if (this.lastEquitySeen !== null) {
                dataPoint.equity = {
                    time: timestamp,
                    value: this.lastEquitySeen,
                };
            }
            if (cash !== undefined) {
                dataPoint.cash = {
                    time: timestamp,
                    value: cash,
                };
            } else if (this.lastCashSeen !== null) {
                dataPoint.cash = {
                    time: timestamp,
                    value: this.lastCashSeen,
                };
            }
            this.dataPoints.set(timeKey, dataPoint);
            this.markDayAsCollected(timestamp);
        }

        // Update sample times if this is a new point
        if (!this.lastSampleTime || timestampMs > new Date(this.lastSampleTime).getTime()) {
            this.lastSampleTime = timestamp;
            this.nextSampleTime = new Date(timestampMs + this.sampleInterval).toISOString();
        }
    }

    /**
     * Ensure the final price point (and equity/cash if available) is collected
     * This should be called after all bars are processed
     */
    ensureFinalPrice(): void {
        if (this.lastTimestampSeen && this.lastPriceSeen !== null) {
            const timeKey = this.lastTimestampSeen;
            const existing = this.dataPoints.get(timeKey);

            if (!existing) {
                const dataPoint: DataPoint = {
                    price: {
                        time: this.lastTimestampSeen,
                        value: this.lastPriceSeen,
                    },
                };
                if (this.lastEquitySeen !== null) {
                    dataPoint.equity = {
                        time: this.lastTimestampSeen,
                        value: this.lastEquitySeen,
                    };
                }
                if (this.lastCashSeen !== null) {
                    dataPoint.cash = {
                        time: this.lastTimestampSeen,
                        value: this.lastCashSeen,
                    };
                }
                this.dataPoints.set(timeKey, dataPoint);
                this.markDayAsCollected(this.lastTimestampSeen);
            } else {
                // Ensure equity/cash are set if we have them
                if (this.lastEquitySeen !== null && !existing.equity) {
                    existing.equity = {
                        time: this.lastTimestampSeen,
                        value: this.lastEquitySeen,
                    };
                }
                if (this.lastCashSeen !== null && !existing.cash) {
                    existing.cash = {
                        time: this.lastTimestampSeen,
                        value: this.lastCashSeen,
                    };
                }
            }
        }
    }

    /**
     * Get collected price data, sorted by time
     */
    getPriceData(): PricePoint[] {
        // Ensure final price is included before returning
        this.ensureFinalPrice();

        const points = Array.from(this.dataPoints.values())
            .map(dp => dp.price)
            .filter(p => p && p.value !== undefined && p.value !== null)
            // Final filter: only include points within trading hours and weekdays
            .filter(p => {
                const timeStr = typeof p.time === "string" ? p.time : new Date(p.time).toISOString();
                return this.shouldIncludeTimestamp(timeStr);
            });

        // Sort by time
        return points.sort((a, b) => {
            const timeA = typeof a.time === "string" ? new Date(a.time).getTime() : a.time;
            const timeB = typeof b.time === "string" ? new Date(b.time).getTime() : b.time;
            return timeA - timeB;
        });
    }

    /**
     * Get collected equity data, sorted by time
     */
    getEquityData(): PricePoint[] {
        // Ensure final data is included before returning
        this.ensureFinalPrice();

        const points = Array.from(this.dataPoints.values())
            .map(dp => dp.equity)
            .filter((p): p is PricePoint => p !== undefined)
            // Final filter: only include points within trading hours and weekdays
            .filter(p => {
                const timeStr = typeof p.time === "string" ? p.time : new Date(p.time).toISOString();
                return this.shouldIncludeTimestamp(timeStr);
            });

        // Sort by time
        return points.sort((a, b) => {
            const timeA = typeof a.time === "string" ? new Date(a.time).getTime() : a.time;
            const timeB = typeof b.time === "string" ? new Date(b.time).getTime() : b.time;
            return timeA - timeB;
        });
    }

    /**
     * Get collected cash data, sorted by time
     */
    getCashData(): PricePoint[] {
        // Ensure final data is included before returning
        this.ensureFinalPrice();

        const points = Array.from(this.dataPoints.values())
            .map(dp => dp.cash)
            .filter((p): p is PricePoint => p !== undefined)
            // Final filter: only include points within trading hours and weekdays
            .filter(p => {
                const timeStr = typeof p.time === "string" ? p.time : new Date(p.time).toISOString();
                return this.shouldIncludeTimestamp(timeStr);
            });

        // Sort by time
        return points.sort((a, b) => {
            const timeA = typeof a.time === "string" ? new Date(a.time).getTime() : a.time;
            const timeB = typeof b.time === "string" ? new Date(b.time).getTime() : b.time;
            return timeA - timeB;
        });
    }

    /**
     * Get collected the last stock price
     */
    getLastPrice(): number {
        return this.lastPriceSeen || 0
    }
}
