import {
    filterBarsByDayAndWindow,
    applySplitAdjustments,
    compactBars,
} from "@/backtest/storage/barProcessing";
import type { DayBlob, SymbolRange, SplitInfo } from "@/backtest/types";
import type { Tbar } from "@/utils/alpaca/getTradingData";

async function apiCall(endpoint: string, body: any) {
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "API request failed");
    }

    return response.json();
}

export async function fetchDayBarsFromAlpacaClient(
    symbol: string,
    day: string
): Promise<DayBlob | null> {
    const { data: rawBars } = (await apiCall("/api/backtest/fetch-bars", {
        symbol,
        day,
    })) as { data: Tbar[] };

    const bars = filterBarsByDayAndWindow(rawBars, day);
    if (!bars.length) return null;

    applySplitAdjustments(bars, symbol);
    const compact = compactBars(bars);
    const startTs = Math.floor(new Date(bars[0].Timestamp).getTime() / 1000);
    const endTs = Math.floor(
        new Date(bars[bars.length - 1].Timestamp).getTime() / 1000
    );

    return {
        symbol,
        day,
        compact,
        records: bars.length,
        start_ts: startTs,
        end_ts: endTs,
    };
}

export async function fetchSplitsFromAlphaVantageClient(
    symbol: string
): Promise<Array<{ effective_date: string; split_factor: number }> | null> {
    const { data } = await apiCall("/api/backtest/fetch-splits", { symbol });
    return data;
}

async function storageApi(operation: string, params: any) {
    const { data, success } = await apiCall("/api/backtest/storage", {
        operation,
        ...params,
    });
    return data !== undefined ? data : success;
}

export const backtestStorageClient = {
    readSymbolRange: (symbol: string) =>
        storageApi("readSymbolRange", { symbol }),
    upsertSymbolRange: (
        symbol: string,
        haveFrom: string | null,
        haveTo: string | null,
        existingRange?: SymbolRange | null,
        firstAvailableDay?: string | null
    ) =>
        storageApi("upsertSymbolRange", {
            symbol,
            haveFrom,
            haveTo,
            existingRange,
            firstAvailableDay,
        }),
    loadPersistedDays: (symbol: string, reqFrom: string, reqTo: string) =>
        storageApi("loadPersistedDays", { symbol, reqFrom, reqTo }),
    flushBucketToSupabase: (
        symbol: string,
        bucket: DayBlob[],
        currentRange: SymbolRange | null
    ) => storageApi("flushBucketToSupabase", { symbol, bucket, currentRange }),
    deleteCachedBarsForSymbol: (symbol: string) =>
        storageApi("deleteCachedBarsForSymbol", { symbol }),
    updateSplitsInDatabase: (
        symbol: string,
        splits: SplitInfo[],
        lastSplitCheck: string
    ) =>
        storageApi("updateSplitsInDatabase", {
            symbol,
            splits,
            lastSplitCheck,
        }),
    resetSymbolRangeAfterSplitChange: (
        symbol: string,
        splits: SplitInfo[],
        lastSplitCheck: string,
        firstAvailableDay?: string | null
    ) =>
        storageApi("resetSymbolRangeAfterSplitChange", {
            symbol,
            splits,
            lastSplitCheck,
            firstAvailableDay,
        }),
    updateFirstAvailableDay: (symbol: string, firstAvailableDay: string) =>
        storageApi("updateFirstAvailableDay", { symbol, firstAvailableDay }),
};
