import {
    fetchDayBarsFromAlpacaClient,
    fetchSplitsFromAlphaVantageClient,
    backtestStorageClient,
} from "@/utils/backtest/client-wrappers";
import type { DayBlob, SymbolRange, SplitInfo } from "@/backtest/types";

const isBrowser = typeof window !== "undefined";
let currentExecutionMode: "local" | "cloud" | undefined;

export function setExecutionMode(mode: "local" | "cloud" | undefined) {
    currentExecutionMode = mode;
}

function shouldUseClient(): boolean {
    return isBrowser && currentExecutionMode === "local";
}

async function getServerAdapter(): Promise<typeof serverAdapter> {
    if (isBrowser) {
        throw new Error("Server adapter should not be used in browser");
    }
    const { serverAdapter } = await import("@/utils/backtest/server-adapter");

    return serverAdapter;
}

export async function fetchDayBars(
    symbol: string,
    day: string
): Promise<DayBlob | null> {
    if (shouldUseClient()) {
        return fetchDayBarsFromAlpacaClient(symbol, day);
    }
    const adapter = await getServerAdapter();
    return adapter.fetchDayBars(symbol, day);
}

export async function fetchSplits(
    symbol: string
): Promise<Array<{ effective_date: string; split_factor: number }> | null> {
    if (shouldUseClient()) {
        return fetchSplitsFromAlphaVantageClient(symbol);
    }
    const adapter = await getServerAdapter();
    return adapter.fetchSplits(symbol);
}

export const backtestStorageAdapter = {
    async readSymbolRange(symbol: string): Promise<SymbolRange | null> {
        if (shouldUseClient()) {
            return backtestStorageClient.readSymbolRange(symbol);
        }
        const adapter = await getServerAdapter();
        return adapter.storage.readSymbolRange(symbol);
    },

    async upsertSymbolRange(
        symbol: string,
        haveFrom: string | null,
        haveTo: string | null,
        existingRange?: SymbolRange | null,
        firstAvailableDay?: string | null
    ): Promise<SymbolRange | null> {
        if (shouldUseClient()) {
            return (await backtestStorageClient.upsertSymbolRange(
                symbol,
                haveFrom,
                haveTo,
                existingRange,
                firstAvailableDay
            )) as SymbolRange | null;
        }
        const adapter = await getServerAdapter();
        return adapter.storage.upsertSymbolRange(
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
        if (shouldUseClient()) {
            return backtestStorageClient.loadPersistedDays(
                symbol,
                reqFrom,
                reqTo
            );
        }
        const adapter = await getServerAdapter();
        return adapter.storage.loadPersistedDays(symbol, reqFrom, reqTo);
    },

    async flushBucket(
        symbol: string,
        bucket: DayBlob[],
        currentRange: SymbolRange | null
    ): Promise<SymbolRange | null> {
        if (shouldUseClient()) {
            return backtestStorageClient.flushBucket(
                symbol,
                bucket,
                currentRange
            );
        }
        const adapter = await getServerAdapter();
        return adapter.storage.flushBucket(
            symbol,
            bucket,
            currentRange
        );
    },

    async deleteCachedBarsForSymbol(symbol: string): Promise<void> {
        if (shouldUseClient()) {
            await backtestStorageClient.deleteCachedBarsForSymbol(symbol);
            return;
        }
        const adapter = await getServerAdapter();
        return adapter.storage.deleteCachedBarsForSymbol(symbol);
    },

    async updateSplitsInDatabase(
        symbol: string,
        splits: SplitInfo[],
        lastSplitCheck: string
    ): Promise<void> {
        if (shouldUseClient()) {
            return backtestStorageClient.updateSplitsInDatabase(
                symbol,
                splits,
                lastSplitCheck
            );
        }
        const adapter = await getServerAdapter();
        return adapter.storage.updateSplitsInDatabase(
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
        if (shouldUseClient()) {
            return backtestStorageClient.resetSymbolRangeAfterSplitChange(
                symbol,
                splits,
                lastSplitCheck,
                firstAvailableDay
            );
        }
        const adapter = await getServerAdapter();
        return adapter.storage.resetSymbolRangeAfterSplitChange(
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
        if (shouldUseClient()) {
            return backtestStorageClient.updateFirstAvailableDay(
                symbol,
                firstAvailableDay
            );
        }
        const adapter = await getServerAdapter();
        return adapter.storage.updateFirstAvailableDay(
            symbol,
            firstAvailableDay
        );
    },
};
