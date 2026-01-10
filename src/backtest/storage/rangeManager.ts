import { MissingRange, DayBlob, SymbolRange } from "@/backtest/types";
import {
    previousDay,
    nextDay,
    getTodayMinusDays,
    formatDay,
    calculateDaysBetween,
} from "@/backtest/storage/dateUtils";
import { fetchDayBars } from "@/utils/backtest/execution-adapter";
import { backtestStorageAdapter } from "@/utils/backtest/execution-adapter";
import {
    BINARY_SEARCH_MAX_ITERATIONS,
    DAYS_BEFORE_TODAY,
    MINUTE_BAR_BATCH_SIZE,
    TIME_BETWEEN_BATCHES,
} from "@/backtest/constants";
import {
    emitProgressIfNeeded,
    progressManager,
} from "@/backtest/core/progressManager";
import { OLDEST_DAY } from "@/constants/time";
import type { ProgressCallback } from "@/backtest/types";

function streamDayCallback(streamDay?: (blob: DayBlob) => void) {
    return (blob: DayBlob) => {
        if (streamDay) {
            try {
                streamDay(blob);
            } catch {
                // Stream callback error - silently fail
            }
        }
    };
}

export function computeMissingRanges(
    reqFrom: string,
    reqTo: string,
    haveFrom?: string,
    haveTo?: string
): { leftRange?: MissingRange; rightRange?: MissingRange } {

    const ranges: { leftRange?: MissingRange; rightRange?: MissingRange } = {};

    if (haveFrom && reqFrom < haveFrom) {
        ranges.leftRange = { start: reqFrom, end: previousDay(haveFrom) };
    }

    if (haveTo && reqTo > haveTo) {
        ranges.rightRange = { start: nextDay(haveTo), end: reqTo };
    }

    if (!haveFrom && !haveTo) {
        ranges.rightRange = { start: reqFrom, end: reqTo };
    }


    return ranges;
}

async function fillRange(
    symbol: string,
    range: MissingRange,
    direction: "forward" | "backward",
    bucket: DayBlob[],
    currentRange: SymbolRange | null,
    streamDay?: (blob: DayBlob) => void,
    onProgress?: ProgressCallback,
    stage:
        | "downloading_before_range"
        | "downloading_after_range" = "downloading_after_range"
): Promise<SymbolRange | null> {
    let cursor = direction === "forward" ? range.start : range.end;
    const step = direction === "forward" ? nextDay : previousDay;
    const stream = streamDayCallback(streamDay);

    const totalDays = calculateDaysBetween(range.start, range.end, true);
    let daysDownloaded = 0;

    while (
        direction === "forward" ? cursor <= range.end : cursor >= range.start
    ) {
        await new Promise((resolve) =>
            setTimeout(resolve, TIME_BETWEEN_BATCHES)
        );

        try {
            const blob = await fetchDayBars(symbol, cursor);
            if (blob) {
                if (direction === "backward") {
                    bucket.unshift(blob);
                } else {
                    bucket.push(blob);
                }
                stream(blob);
                daysDownloaded++;

                let daysCompleted: number = 0;
                let daysLeft: number = 0;

                if (direction === "backward") {
                    daysCompleted = calculateDaysBetween(
                        cursor,
                        range.end,
                        true
                    );
                    daysLeft = calculateDaysBetween(range.start, cursor, true);
                } else {
                    daysCompleted = calculateDaysBetween(
                        range.start,
                        cursor,
                        true
                    );
                    daysLeft = calculateDaysBetween(cursor, range.end, true);
                }

                daysCompleted = Math.max(0, daysCompleted);
                daysLeft = Math.max(0, daysLeft);

                await emitProgressIfNeeded(
                    onProgress,
                    stage,
                    daysCompleted,
                    totalDays,
                    `${daysLeft} days remaining`
                );
            }

            if (bucket.length >= MINUTE_BAR_BATCH_SIZE) {
                currentRange =
                    await backtestStorageAdapter.flushBucketToSupabase(
                        symbol,
                        bucket,
                        currentRange
                    );
                bucket.length = 0;
            }
        } catch {
            // Fetch error - continue to next day
        }

        cursor = step(cursor);
    }

    if (bucket.length) {
        currentRange = await backtestStorageAdapter.flushBucketToSupabase(
            symbol,
            bucket,
            currentRange
        );
        bucket.length = 0;
    }

    // Send 100% completion at the end (current = total to get 100%)
    await emitProgressIfNeeded(
        onProgress,
        stage,
        totalDays,
        totalDays,
        "Download complete"
    );

    return currentRange;
}

async function checkNineDaysAround(
    symbol: string,
    candidateDay: string,
    onProgress?: (
        fetchesCompleted: number,
        totalFetches: number
    ) => Promise<void>
): Promise<string | null> {
    const daysToCheck: string[] = [];

    let day = candidateDay;
    for (let i = 0; i < 4; i++) {
        day = previousDay(day);
        daysToCheck.push(day);
    }

    daysToCheck.push(candidateDay);

    day = candidateDay;
    for (let i = 0; i < 4; i++) {
        day = nextDay(day);
        daysToCheck.push(day);
    }

    const sortedDays = [...new Set(daysToCheck)].sort();
    let earliestDayWithBars: string | null = null;
    let fetchCount = 0;

    for (const dayToCheck of sortedDays) {
        try {
            const blob = await fetchDayBars(symbol, dayToCheck);
            fetchCount++;

            if (onProgress) {
                try {
                    await onProgress(fetchCount, sortedDays.length);
                } catch {
                    // Error calling onProgress - silently fail
                }
            }

            if (blob) {
                earliestDayWithBars = dayToCheck;
                break;
            }
        } catch (error) {
            fetchCount++;

            if (onProgress) {
                try {
                    await onProgress(fetchCount, sortedDays.length);
                } catch {
                    // Progress callback error - silently fail
                }
            }
        }

        await new Promise((resolve) =>
            setTimeout(resolve, TIME_BETWEEN_BATCHES)
        );
    }

    return earliestDayWithBars;
}

export async function findFirstAvailableDay(
    symbol: string,
    onProgress?: ProgressCallback
): Promise<string | null> {

    const startDate = OLDEST_DAY;
    const maxDate = getTodayMinusDays(DAYS_BEFORE_TODAY);

    let left = new Date(startDate);
    let right = new Date(maxDate);
    let earliestFound: string | null = null;

    // Binary search
    let iterations = 0;
    const totalFetches = BINARY_SEARCH_MAX_ITERATIONS * 9;
    let completedFetches = 0;

    // Send initial progress immediately
    progressManager.reset(); // Reset for new stage
    await emitProgressIfNeeded(
        onProgress,
        "searching_first_available_day",
        0,
        totalFetches,
        `Starting search for first available day`
    );

    while (left <= right && iterations < BINARY_SEARCH_MAX_ITERATIONS) {
        iterations++;

        const midTime = (left.getTime() + right.getTime()) / 2;
        const midDate = new Date(midTime);
        const candidateDay = formatDay(midDate);

        const progressCallback = async (
            fetchesCompleted: number,
            totalInIteration: number
        ) => {
            completedFetches = (iterations - 1) * 9 + fetchesCompleted;

            await emitProgressIfNeeded(
                onProgress,
                "searching_first_available_day",
                completedFetches,
                totalFetches,
                `${totalFetches - completedFetches} fetches remaining`
            );
        };

        const earliestDayWithBars = await checkNineDaysAround(
            symbol,
            candidateDay,
            progressCallback
        );

        // Final progress update for this iteration
        completedFetches = iterations * 9;
        await emitProgressIfNeeded(
            onProgress,
            "searching_first_available_day",
            completedFetches,
            totalFetches,
            `${totalFetches - completedFetches} fetches remaining`
        );

        if (earliestDayWithBars) {
            // Found bars, record it and search left (earlier)
            earliestFound = earliestDayWithBars;
            right = new Date(previousDay(earliestDayWithBars));
            // console.log(
            //     `[rangeManager] Found bars at ${earliestDayWithBars}, searching earlier`
            // );
        } else {
            // No bars found, search right (newer)
            left = new Date(nextDay(candidateDay));
            // console.log(`[rangeManager] No bars found, searching newer dates`);
        }

        if (right < new Date(startDate)) {
            break;
        }
    }

    // Send 100% completion at the end (current = total to get 100%)
    await emitProgressIfNeeded(
        onProgress,
        "searching_first_available_day",
        totalFetches,
        totalFetches,
        earliestFound ? "Search complete" : "Search finished"
    );


    return earliestFound;
}

export function validateDateRange(
    startDate: string,
    endDate: string,
    firstAvailableDay: string | null
): void {
    const todayMinusDaysBeforeToday = getTodayMinusDays(DAYS_BEFORE_TODAY);

    if (firstAvailableDay && startDate < firstAvailableDay) {
        throw new Error(
            `Start date ${startDate} is before first available day ${firstAvailableDay} for this symbol`
        );
    }

    if (endDate > todayMinusDaysBeforeToday) {
        throw new Error(
            `End date ${endDate} must be before ${todayMinusDaysBeforeToday} (today - ${DAYS_BEFORE_TODAY} days)`
        );
    }

    if (endDate < startDate) {
        throw new Error(
            `End date ${endDate} must be greater than or equal to start date ${startDate}`
        );
    }
}

export async function fillMissingRanges(
    symbol: string,
    leftRange: MissingRange | undefined,
    rightRange: MissingRange | undefined,
    currentRange: SymbolRange | null,
    streamDay?: (blob: DayBlob) => void,
    onProgress?: ProgressCallback
): Promise<SymbolRange | null> {
    const bucket: DayBlob[] = [];

    if (leftRange) {
        currentRange = await fillRange(
            symbol,
            leftRange,
            "backward",
            bucket,
            currentRange,
            streamDay,
            onProgress,
            "downloading_before_range"
        );
    }

    if (rightRange) {
        currentRange = await fillRange(
            symbol,
            rightRange,
            "forward",
            bucket,
            currentRange,
            streamDay,
            onProgress,
            "downloading_after_range"
        );
    }

    return currentRange;
}
