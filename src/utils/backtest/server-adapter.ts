import { fetchSplitsFromAlphaVantage } from "@/utils/alphavantage/splits";
import { fetchDayBarsFromAlpaca } from "@/utils/alpaca/backtestFetcher";
import * as backtestStorage from "@/utils/supabase/backtestStorage";
import type { DayBlob, SymbolRange, SplitInfo } from "@/backtest/types";

export const serverAdapter = {
    async fetchDayBars(symbol: string, day: string): Promise<DayBlob | null> {
        return fetchDayBarsFromAlpaca(symbol, day);
    },

    async fetchSplits(
        symbol: string
    ): Promise<Array<{ effective_date: string; split_factor: number }> | null> {
        return fetchSplitsFromAlphaVantage(symbol);
    },

    storage: {
        async readSymbolRange(symbol: string): Promise<SymbolRange | null> {
            return backtestStorage.readSymbolRange(symbol);
        },

        async upsertSymbolRange(
            symbol: string,
            haveFrom: string | null,
            haveTo: string | null,
            existingRange?: SymbolRange | null,
            firstAvailableDay?: string | null
        ): Promise<SymbolRange | null> {
            return backtestStorage.upsertSymbolRange(
                symbol,
                haveFrom,
                haveTo,
                existingRange,
                firstAvailableDay
            );
        },

        async loadPersistedDays(
            symbol: string,
            reqFrom: string,
            reqTo: string
        ): Promise<DayBlob[]> {
            return backtestStorage.loadPersistedDays(symbol, reqFrom, reqTo);
        },

        async flushBucketToSupabase(
            symbol: string,
            bucket: DayBlob[],
            currentRange: SymbolRange | null
        ): Promise<SymbolRange | null> {
            return backtestStorage.flushBucketToSupabase(
                symbol,
                bucket,
                currentRange
            );
        },

        async deleteCachedBarsForSymbol(symbol: string): Promise<void> {
            return backtestStorage.deleteCachedBarsForSymbol(symbol);
        },

        async updateSplitsInDatabase(
            symbol: string,
            splits: SplitInfo[],
            lastSplitCheck: string
        ): Promise<void> {
            return backtestStorage.updateSplitsInDatabase(
                symbol,
                splits,
                lastSplitCheck
            );
        },

        async resetSymbolRangeAfterSplitChange(
            symbol: string,
            splits: SplitInfo[],
            lastSplitCheck: string,
            firstAvailableDay?: string | null
        ): Promise<void> {
            return backtestStorage.resetSymbolRangeAfterSplitChange(
                symbol,
                splits,
                lastSplitCheck,
                firstAvailableDay
            );
        },

        async updateFirstAvailableDay(
            symbol: string,
            firstAvailableDay: string
        ): Promise<void> {
            return backtestStorage.updateFirstAvailableDay(
                symbol,
                firstAvailableDay
            );
        },
    },
};
