import { DayBlob, MinuteBar } from "@/backtest/types";
import {
    loadPersistedDays,
    updateFirstAvailableDay,
} from "@/utils/supabase/backtestStorage";
import {
    computeMissingRanges,
    fillMissingRanges,
    findFirstAvailableDay,
    validateDateRange,
} from "@/backtest/storage/rangeManager";
import { dayBlobsToMinuteBars as convertDayBlobsToMinuteBars } from "@/backtest/storage/barProcessing";
import {
    checkAndRefreshSplits,
    cacheSplitsFromSymbolRange,
} from "@/backtest/storage/splitManager";

export async function ensureSymbolRange(
    symbol: string,
    reqFrom: string,
    reqTo: string,
    streamDay?: (blob: DayBlob) => void
): Promise<DayBlob[]> {
    console.log(
        `Ensures that we have data for ${symbol} from ${reqFrom} to ${reqTo}`
    );

    let currentRange = await checkAndRefreshSplits(symbol);

    if (!currentRange.first_available_day) {
        console.log(
            `[minuteBarStorage] First available day not set for ${symbol}, computing it...`
        );
        const firstAvailableDay = await findFirstAvailableDay(symbol);
        if (firstAvailableDay) {
            await updateFirstAvailableDay(symbol, firstAvailableDay);
            currentRange = {
                ...currentRange,
                first_available_day: firstAvailableDay,
            };
        }
    }

    if (currentRange.splits && currentRange.splits.length > 0) {
        cacheSplitsFromSymbolRange(symbol, currentRange.splits);
    }

    validateDateRange(reqFrom, reqTo, currentRange.first_available_day ?? null);

    const { leftRange, rightRange } = computeMissingRanges(
        reqFrom,
        reqTo,
        currentRange?.have_from ?? undefined,
        currentRange?.have_to ?? undefined
    );

    const updatedRange = await fillMissingRanges(
        symbol,
        leftRange,
        rightRange,
        currentRange,
        streamDay
    );
    if (updatedRange) {
        currentRange = updatedRange;
    }

    const persisted = await loadPersistedDays(symbol, reqFrom, reqTo);
    return persisted;
}

export function dayBlobsToMinuteBars(dayBlobs: DayBlob[]): MinuteBar[] {
    return convertDayBlobsToMinuteBars(dayBlobs);
}
