import { calculateDaysBetween } from "@/backtest/storage/dateUtils";
import type { PricePoint } from "../types";

export class PriceCollector {
    private pricePoints: Map<string, PricePoint> = new Map(); // Use Map to avoid duplicates by time
    private lastSampleTime: string | null = null;
    private sampleInterval: number; // in milliseconds
    private startDate: string;
    private endDate: string;
    private lastPriceSeen: number | null = null;
    private lastTimestampSeen: string | null = null;

    constructor(startDate: string, endDate: string) {
        this.startDate = startDate;
        this.endDate = endDate;
        this.sampleInterval = this.calculateSampleInterval(startDate, endDate);
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
    collectPrice(timestamp: string, price: number): void {
        const timestampMs = new Date(timestamp).getTime();
        const timeKey = timestamp;

        // Track the last price seen (for final price collection)
        this.lastPriceSeen = price;
        this.lastTimestampSeen = timestamp;

        // Always collect the first price point
        if (this.pricePoints.size === 0) {
            this.pricePoints.set(timeKey, {
                time: timestamp,
                value: price,
            });
            this.lastSampleTime = timestamp;
            return;
        }

        // Check if we should sample this point based on interval
        if (this.lastSampleTime) {
            const lastSampleMs = new Date(this.lastSampleTime).getTime();
            const timeSinceLastSample = timestampMs - lastSampleMs;

            if (timeSinceLastSample >= this.sampleInterval) {
                this.pricePoints.set(timeKey, {
                    time: timestamp,
                    value: price,
                });
                this.lastSampleTime = timestamp;
            }
        }
    }

    /**
     * Force collect a price point at a specific time (for action creation/execution)
     * This ensures we have price data at exact action times
     */
    forceCollectPrice(timestamp: string, price: number): void {
        const timeKey = timestamp;
        // Overwrite if exists, or add new
        this.pricePoints.set(timeKey, {
            time: timestamp,
            value: price,
        });
    }

    /**
     * Ensure the final price point is collected
     * This should be called after all bars are processed
     * Only collects the actual final price if it hasn't been collected yet via sample interval or actions
     */
    ensureFinalPrice(): void {
        if (this.lastTimestampSeen && this.lastPriceSeen !== null) {
            if (!this.pricePoints.has(this.lastTimestampSeen)) {
                this.pricePoints.set(this.lastTimestampSeen, {
                    time: this.lastTimestampSeen,
                    value: this.lastPriceSeen,
                });
            }
        }
    }

    /**
     * Get collected price data, sorted by time
     */
    getPriceData(): PricePoint[] {
        // Ensure final price is included before returning
        this.ensureFinalPrice();

        const points = Array.from(this.pricePoints.values());
        // Sort by time
        return points.sort((a, b) => {
            const timeA = typeof a.time === "string" ? new Date(a.time).getTime() : a.time;
            const timeB = typeof b.time === "string" ? new Date(b.time).getTime() : b.time;
            return timeA - timeB;
        });
    }
}
