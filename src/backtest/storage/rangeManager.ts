import { MissingRange, DayBlob, SymbolRange } from "@/backtest/types";
import {
    previousDay,
    nextDay,
    getTodayMinusDays,
    formatDay,
} from "@/backtest/storage/dateUtils";
import { fetchDayBarsFromAlpaca } from "@/utils/alpaca/backtestFetcher";
import { flushBucketToSupabase } from "@/utils/supabase/backtestStorage";
import {
    DAYS_BEFORE_TODAY,
    MINUTE_BAR_BATCH_SIZE,
    TIME_BETWEEN_BATCHES,
} from "@/backtest/constants";

function streamDayCallback(streamDay?: (blob: DayBlob) => void) {
    return (blob: DayBlob) => {
        if (streamDay) {
            try {
                streamDay(blob);
            } catch (error) {
                console.error("[rangeManager] stream callback error", error);
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
    streamDay?: (blob: DayBlob) => void
): Promise<SymbolRange | null> {
    let cursor = direction === "forward" ? range.start : range.end;
    const step = direction === "forward" ? nextDay : previousDay;
    const stream = streamDayCallback(streamDay);

    while (
        direction === "forward" ? cursor <= range.end : cursor >= range.start
    ) {
        await new Promise((resolve) =>
            setTimeout(resolve, TIME_BETWEEN_BATCHES)
        );

        try {
            const blob = await fetchDayBarsFromAlpaca(symbol, cursor);
            if (blob) {
                if (direction === "backward") {
                    bucket.unshift(blob);
                } else {
                    bucket.push(blob);
                }
                stream(blob);
            }

            if (bucket.length >= MINUTE_BAR_BATCH_SIZE) {
                currentRange = await flushBucketToSupabase(
                    symbol,
                    bucket,
                    currentRange
                );
                bucket.length = 0;
            }
        } catch (error) {
            console.error("[rangeManager] fillRange fetch error", {
                symbol,
                cursor,
                error,
            });
        }

        cursor = step(cursor);
    }

    if (bucket.length) {
        currentRange = await flushBucketToSupabase(
            symbol,
            bucket,
            currentRange
        );
        bucket.length = 0;
    }

    return currentRange;
}

async function checkNineDaysAround(
    symbol: string,
    candidateDay: string
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

    for (const dayToCheck of sortedDays) {
        try {
            const blob = await fetchDayBarsFromAlpaca(symbol, dayToCheck);
            if (blob) {
                earliestDayWithBars = dayToCheck;
                break;
            }
        } catch (error) {
            console.log(
                `[rangeManager] No bars found for ${symbol} on ${dayToCheck}`
            );
        }

        await new Promise((resolve) =>
            setTimeout(resolve, TIME_BETWEEN_BATCHES)
        );
    }

    return earliestDayWithBars;
}

export async function findFirstAvailableDay(
    symbol: string
): Promise<string | null> {
    console.log(
        `[rangeManager] Starting binary search for first available day of ${symbol}`
    );

    const startDate = "1990-01-01";
    const maxDate = getTodayMinusDays(DAYS_BEFORE_TODAY);

    let left = new Date(startDate);
    let right = new Date(maxDate);
    let earliestFound: string | null = null;

    // Binary search
    const maxIterations = 20;
    let iterations = 0;

    while (left <= right && iterations < maxIterations) {
        iterations++;

        const midTime = (left.getTime() + right.getTime()) / 2;
        const midDate = new Date(midTime);
        const candidateDay = formatDay(midDate);

        const earliestDayWithBars = await checkNineDaysAround(
            symbol,
            candidateDay
        );

        if (earliestDayWithBars) {
            // Found bars, record it and search left (earlier)
            earliestFound = earliestDayWithBars;
            right = new Date(previousDay(earliestDayWithBars));
            console.log(
                `[rangeManager] Found bars at ${earliestDayWithBars}, searching earlier`
            );
        } else {
            // No bars found, search right (newer)
            left = new Date(nextDay(candidateDay));
            console.log(`[rangeManager] No bars found, searching newer dates`);
        }

        if (right < new Date(startDate)) {
            break;
        }
    }

    if (earliestFound) {
        console.log(
            `[rangeManager] Found first available day for ${symbol}: ${earliestFound}`
        );
    } else {
        console.warn(
            `[rangeManager] Could not find first available day for ${symbol}`
        );
    }

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

    if (endDate >= todayMinusDaysBeforeToday) {
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
    streamDay?: (blob: DayBlob) => void
): Promise<SymbolRange | null> {
    const bucket: DayBlob[] = [];

    if (leftRange) {
        console.log(
            `Startng filling start range ${symbol} from ${leftRange.start} to ${leftRange.end}`
        );
        currentRange = await fillRange(
            symbol,
            leftRange,
            "backward",
            bucket,
            currentRange,
            streamDay
        );
    }

    if (rightRange) {
        console.log(
            `Startng filling end range ${symbol} from ${rightRange.start} to ${rightRange.end}`
        );
        currentRange = await fillRange(
            symbol,
            rightRange,
            "forward",
            bucket,
            currentRange,
            streamDay
        );
    }

    return currentRange;
}
