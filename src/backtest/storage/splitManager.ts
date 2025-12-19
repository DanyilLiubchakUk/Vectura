import { fetchSplitsFromAlphaVantage } from "@/utils/alphavantage/splits";
import { SymbolRange, SplitInfo, Split } from "@/backtest/types";
import {
    readSymbolRange,
    upsertSymbolRange,
    deleteCachedBarsForSymbol,
    updateSplitsInDatabase,
    resetSymbolRangeAfterSplitChange,
} from "@/utils/supabase/backtestStorage";
import { findFirstAvailableDay } from "@/backtest/storage/rangeManager";
import { formatDay } from "@/backtest/storage/dateUtils";

const splitsCache = new Map<string, Split[]>();

export function shouldCheckSplits(lastSplitCheck: string | null): boolean {
    if (!lastSplitCheck) {
        return true;
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const lastCheck = new Date(lastSplitCheck);
    lastCheck.setUTCHours(0, 0, 0, 0);

    return lastCheck < today;
}

function areSplitsEqual(splits1: SplitInfo[], splits2: SplitInfo[]): boolean {
    if (splits1.length !== splits2.length) {
        return false;
    }

    const sorted1 = [...splits1].sort(
        (a, b) =>
            new Date(a.effective_date).getTime() -
            new Date(b.effective_date).getTime()
    );
    const sorted2 = [...splits2].sort(
        (a, b) =>
            new Date(a.effective_date).getTime() -
            new Date(b.effective_date).getTime()
    );

    for (let i = 0; i < sorted1.length; i++) {
        if (
            sorted1[i].effective_date !== sorted2[i].effective_date ||
            sorted1[i].split_factor !== sorted2[i].split_factor
        ) {
            return false;
        }
    }

    return true;
}

export async function ensureSymbolRangeExists(
    symbol: string
): Promise<SymbolRange> {
    const existing = await readSymbolRange(symbol);

    if (existing) {
        if (existing.splits && existing.splits.length > 0) {
            cacheSplitsFromSymbolRange(symbol, existing.splits);
        }
        return existing;
    }

    // Create new range
    const newRange = await upsertSymbolRange(symbol, null, null, null, null);

    if (!newRange) {
        throw new Error(`Failed to create symbol range for ${symbol}`);
    }

    if (newRange.splits && newRange.splits.length > 0) {
        cacheSplitsFromSymbolRange(symbol, newRange.splits);
    }

    return newRange;
}

export async function checkAndRefreshSplits(
    symbol: string
): Promise<SymbolRange> {
    let symbolRange = await ensureSymbolRangeExists(symbol);

    if (!shouldCheckSplits(symbolRange.last_split_check)) {
        return symbolRange;
    }

    console.log(`[splitManager] Checking splits for ${symbol}`);

    const newSplits = await fetchSplitsFromAlphaVantage(symbol);

    if (newSplits === null) {
        const today = new Date(
            Date.UTC(
                new Date().getUTCFullYear(),
                new Date().getUTCMonth(),
                new Date().getUTCDate()
            )
        )
            .toISOString()
            .split("T")[0];
        await updateSplitsInDatabase(symbol, symbolRange.splits, today);
        return symbolRange;
    }

    console.log(
        `[splitManager] Fetched ${newSplits.length} splits from AlphaVantage for ${symbol}:`,
        newSplits
            .map((s) => `${s.effective_date} (${s.split_factor}x)`)
            .join(", ")
    );

    const storedSplitsStr =
        symbolRange.splits && symbolRange.splits.length > 0
            ? symbolRange.splits
                  .map((s) => `${s.effective_date} (${s.split_factor}x)`)
                  .join(", ")
            : "none";
    console.log(`[splitManager] Stored splits: ${storedSplitsStr}`);

    const splitsChanged = !areSplitsEqual(symbolRange.splits, newSplits);

    const today = formatDay(new Date());

    if (splitsChanged) {
        console.log(
            `[splitManager] Splits changed for ${symbol}, deleting cached bars`
        );

        clearSplitsForSymbol(symbol);

        await deleteCachedBarsForSymbol(symbol);

        const firstAvailableDay = await findFirstAvailableDay(symbol);

        await resetSymbolRangeAfterSplitChange(
            symbol,
            newSplits,
            today,
            firstAvailableDay
        );

        cacheSplitsFromSymbolRange(symbol, newSplits);

        return {
            ...symbolRange,
            splits: newSplits,
            last_split_check: today,
            have_from: null,
            have_to: null,
            first_available_day: firstAvailableDay,
        };
    } else {
        await updateSplitsInDatabase(symbol, symbolRange.splits, today);

        if (symbolRange.splits.length > 0) {
            cacheSplitsFromSymbolRange(symbol, symbolRange.splits);
        }

        return {
            ...symbolRange,
            last_split_check: today,
        };
    }
}

export function setSplitsForSymbol(symbol: string, splits: Split[]): void {
    splitsCache.set(symbol, splits);
}

export function getSplitsForSymbol(symbol: string): Split[] {
    return splitsCache.get(symbol) || [];
}

export function clearSplitsForSymbol(symbol: string): void {
    splitsCache.delete(symbol);
}

export function splitInfoToSplit(splitInfo: SplitInfo): Split {
    return {
        date: new Date(splitInfo.effective_date),
        ratio: splitInfo.split_factor,
    };
}

export function cacheSplitsFromSymbolRange(
    symbol: string,
    splitsInfo: Array<{ effective_date: string; split_factor: number }>
): void {
    const splits = splitsInfo.map(splitInfoToSplit);
    setSplitsForSymbol(symbol, splits);
}
