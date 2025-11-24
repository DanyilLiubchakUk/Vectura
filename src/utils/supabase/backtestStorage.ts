import { supabase } from "@/utils/supabase/supabaseClient";
import { DayBlob, SplitInfo, SymbolRange } from "@/backtest/types";
import {
    decodeSupabaseBytea,
    decompressGzip,
    isGzipBuffer,
    compressJson,
} from "@/backtest/storage/compressionUtils";
import { isEarlierDay, isLaterDay } from "@/backtest/storage/dateUtils";

export async function readSymbolRange(
    symbol: string
): Promise<SymbolRange | null> {
    const { data, error } = await supabase
        .from("symbol_ranges")
        .select("*")
        .eq("symbol", symbol)
        .maybeSingle();

    if (error) {
        console.error("[supabaseStorage] readSymbolRange error", {
            symbol,
            error,
        });
        return null;
    }

    if (!data) {
        return null;
    }

    return {
        symbol: data.symbol,
        have_from: data.have_from,
        have_to: data.have_to,
        first_available_day: data.first_available_day || null,
        updated_at: data.updated_at,
        splits: data.splits || [],
        last_split_check: data.last_split_check || null,
    } as SymbolRange;
}

export async function upsertSymbolRange(
    symbol: string,
    haveFrom: string | null,
    haveTo: string | null,
    existingRange?: SymbolRange | null,
    firstAvailableDay?: string | null
): Promise<SymbolRange | null> {
    const existingSplits = existingRange?.splits || [];
    const existingLastSplitCheck = existingRange?.last_split_check || null;
    const existingFirstAvailableDay =
        firstAvailableDay !== undefined
            ? firstAvailableDay
            : existingRange?.first_available_day || null;

    const { data, error } = await supabase
        .from("symbol_ranges")
        .upsert(
            {
                symbol,
                have_from: haveFrom,
                have_to: haveTo,
                first_available_day: existingFirstAvailableDay,
                splits: existingSplits,
                last_split_check: existingLastSplitCheck,
            },
            { onConflict: "symbol" }
        )
        .select()
        .maybeSingle();

    if (error) {
        console.error("[supabaseStorage] upsertSymbolRange error", {
            symbol,
            haveFrom,
            haveTo,
            error,
        });
        return null;
    }

    if (!data) {
        return null;
    }

    return {
        symbol: data.symbol,
        have_from: data.have_from,
        have_to: data.have_to,
        first_available_day: data.first_available_day || null,
        updated_at: data.updated_at,
        splits: data.splits || [],
        last_split_check: data.last_split_check || null,
    } as SymbolRange;
}

export async function flushBucketToSupabase(
    symbol: string,
    bucket: DayBlob[],
    currentRange: SymbolRange | null
): Promise<SymbolRange | null> {
    if (!bucket.length) return currentRange;

    const sortedBucket = [...bucket].sort((a, b) => (a.day < b.day ? -1 : 1));

    const rows = await Promise.all(
        sortedBucket.map(async (blob) => ({
            symbol: blob.symbol,
            day: blob.day,
            data: await compressJson(blob.compact),
            records: blob.records,
            start_ts: blob.start_ts,
            end_ts: blob.end_ts,
        }))
    );

    const { error } = await supabase
        .from("bars_daily")
        .upsert(rows, { onConflict: "symbol,day" });

    if (error) {
        console.error("[supabaseStorage] flushBucket supabase error", {
            symbol,
            error,
        });
        throw error;
    }

    const earliestDay = sortedBucket[0].day;
    const latestDay = sortedBucket[sortedBucket.length - 1].day;

    const haveFrom = currentRange?.have_from
        ? isEarlierDay(earliestDay, currentRange.have_from)
            ? earliestDay
            : currentRange.have_from
        : earliestDay;
    const haveTo = currentRange?.have_to
        ? isLaterDay(latestDay, currentRange.have_to)
            ? latestDay
            : currentRange.have_to
        : latestDay;

    const updatedRange = await upsertSymbolRange(
        symbol,
        haveFrom,
        haveTo,
        currentRange
    );
    return updatedRange;
}

export async function loadPersistedDays(
    symbol: string,
    reqFrom: string,
    reqTo: string
): Promise<DayBlob[]> {
    const { data, error } = await supabase
        .from("bars_daily")
        .select("symbol,day,data,records,start_ts,end_ts")
        .eq("symbol", symbol)
        .gte("day", reqFrom)
        .lte("day", reqTo)
        .order("day", { ascending: true });

    if (error) {
        console.error("[supabaseStorage] loadPersistedDays error", {
            symbol,
            reqFrom,
            reqTo,
            error,
        });
        throw error;
    }

    const result: DayBlob[] = [];
    const rows = data ?? [];

    for (const row of rows) {
        if (!row.data) {
            console.log(
                "[supabaseStorage] loadPersistedDays skipping empty row",
                {
                    symbol: row.symbol,
                    day: row.day,
                }
            );
            continue;
        }

        const buffer = decodeSupabaseBytea(row.data);

        if (!isGzipBuffer(buffer)) {
            console.error(
                "[supabaseStorage] row data not gzipped, expected gzip format",
                {
                    symbol: row.symbol,
                    day: row.day,
                    header: buffer.slice(0, 4).toString("hex"),
                    length: buffer.length,
                }
            );
            throw new Error(
                `Row data for ${row.symbol} ${row.day} is not gzipped`
            );
        }

        try {
            const decompressed = await decompressGzip(buffer);
            const compact = JSON.parse(decompressed) as Array<[number, number]>;

            result.push({
                symbol: row.symbol,
                day: row.day,
                compact,
                records: Number(row.records),
                start_ts: Number(row.start_ts),
                end_ts: Number(row.end_ts),
            });
        } catch (error) {
            console.error("[supabaseStorage] gunzip/parse failed", {
                symbol: row.symbol,
                day: row.day,
                header: buffer.slice(0, 4).toString("hex"),
                length: buffer.length,
                error,
            });
            throw error;
        }
    }

    return result;
}

export async function deleteCachedBarsForSymbol(symbol: string): Promise<void> {
    const { error } = await supabase
        .from("bars_daily")
        .delete()
        .eq("symbol", symbol);

    if (error) {
        console.error("[splitManager] Error deleting cached bars", {
            symbol,
            error,
        });
        throw error;
    }

    console.log(`[splitManager] Deleted all cached bars for ${symbol}`);
}

export async function updateSplitsInDatabase(
    symbol: string,
    splits: SplitInfo[],
    lastSplitCheck: string
): Promise<void> {
    const { error } = await supabase
        .from("symbol_ranges")
        .update({
            splits: splits,
            last_split_check: lastSplitCheck,
        })
        .eq("symbol", symbol);

    if (error) {
        console.error("[splitManager] Error updating splits", {
            symbol,
            error,
        });
        throw error;
    }
}

export async function resetSymbolRangeAfterSplitChange(
    symbol: string,
    splits: SplitInfo[],
    lastSplitCheck: string,
    firstAvailableDay?: string | null
): Promise<void> {
    const updateData: {
        have_from: null;
        have_to: null;
        splits: SplitInfo[];
        last_split_check: string;
        first_available_day?: string | null;
    } = {
        have_from: null,
        have_to: null,
        splits: splits,
        last_split_check: lastSplitCheck,
    };
    
    if (firstAvailableDay !== undefined) {
        updateData.first_available_day = firstAvailableDay;
    }

    const { error } = await supabase
        .from("symbol_ranges")
        .update(updateData)
        .eq("symbol", symbol);

    if (error) {
        console.error("[splitManager] Error resetting symbol range", {
            symbol,
            error,
        });
        throw error;
    }
}

export async function updateFirstAvailableDay(
    symbol: string,
    firstAvailableDay: string
): Promise<void> {
    const { error } = await supabase
        .from("symbol_ranges")
        .update({ first_available_day: firstAvailableDay })
        .eq("symbol", symbol);

    if (error) {
        console.error("[backtestStorage] Error updating first_available_day", {
            symbol,
            error,
        });
        throw error;
    }
}
