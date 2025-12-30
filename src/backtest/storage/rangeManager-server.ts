import {
    previousDay,
    nextDay,
    calculateDaysBetween,
} from "@/backtest/storage/dateUtils";
import { emitProgressIfNeeded } from "@/backtest/core/progressManager";
import { MissingRange, DayBlob, SymbolRange } from "@/backtest/types";
import { TIME_BETWEEN_BATCHES } from "@/backtest/constants";
import type { ProgressCallback } from "@/backtest/types";

function streamDayCallback(streamDay?: (blob: DayBlob) => void) {
    return (blob: DayBlob) => {
        if (streamDay) {
            try {
                streamDay(blob);
            } catch (error) {
                // Stream callback error - silently fail
            }
        }
    };
}

async function fillRange(
    symbol: string,
    range: MissingRange,
    direction: "forward" | "backward",
    bucket: DayBlob[],
    currentRange: SymbolRange | null,
    fetchDayBarsFn: (symbol: string, day: string) => Promise<DayBlob | null>,
    flushBucketFn: (
        symbol: string,
        bucket: DayBlob[],
        currentRange: SymbolRange | null
    ) => Promise<SymbolRange | null>,
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
            const blob = await fetchDayBarsFn(symbol, cursor);
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

                const progress = Math.round((daysCompleted / totalDays) * 100);

                await emitProgressIfNeeded(
                    onProgress,
                    stage,
                    daysCompleted,
                    totalDays,
                    `Downloading ${
                        direction === "backward" ? "before" : "after"
                    } range: ${daysDownloaded}/${totalDays} days`
                );

                if (bucket.length >= 10) {
                    currentRange = await flushBucketFn(
                        symbol,
                        bucket,
                        currentRange
                    );
                    bucket.length = 0;
                }
            }
        } catch (error) {
            // Fetch error - continue to next day
        }

        cursor = step(cursor);
    }

    if (bucket.length > 0) {
        currentRange = await flushBucketFn(symbol, bucket, currentRange);
    }

    await emitProgressIfNeeded(
        onProgress,
        stage,
        totalDays,
        totalDays,
        "Download complete"
    );

    return currentRange;
}

export async function fillMissingRangesWithServerAdapter(
    symbol: string,
    leftRange: MissingRange | undefined,
    rightRange: MissingRange | undefined,
    currentRange: SymbolRange | null,
    streamDay?: (blob: DayBlob) => void,
    onProgress?: ProgressCallback
): Promise<SymbolRange | null> {
    // Import server adapter directly
    const { serverAdapter } = await import("@/utils/backtest/server-adapter");

    const bucket: DayBlob[] = [];

    if (leftRange) {
        currentRange = await fillRange(
            symbol,
            leftRange,
            "backward",
            bucket,
            currentRange,
            serverAdapter.fetchDayBars.bind(serverAdapter),
            serverAdapter.storage.flushBucketToSupabase.bind(
                serverAdapter.storage
            ),
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
            serverAdapter.fetchDayBars.bind(serverAdapter),
            serverAdapter.storage.flushBucketToSupabase.bind(
                serverAdapter.storage
            ),
            streamDay,
            onProgress,
            "downloading_after_range"
        );
    }

    return currentRange;
}
