import {
    readSymbolRange,
    loadPersistedDays,
    upsertSymbolRange,
    flushBucketToSupabase,
    updateSplitsInDatabase,
    updateFirstAvailableDay,
    deleteCachedBarsForSymbol,
    resetSymbolRangeAfterSplitChange,
} from "@/utils/supabase/backtestStorage";
import { NextRequest } from "next/server";
import type { DayBlob, SymbolRange, SplitInfo } from "@/backtest/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { operation, ...params } = body;

        switch (operation) {
            case "readSymbolRange": {
                const { symbol } = params;
                if (!symbol) {
                    return new Response(
                        JSON.stringify({ error: "Missing symbol" }),
                        { status: 400 }
                    );
                }
                const result = await readSymbolRange(symbol);
                return new Response(JSON.stringify({ data: result }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            case "upsertSymbolRange": {
                const {
                    symbol,
                    haveFrom,
                    haveTo,
                    existingRange,
                    firstAvailableDay,
                } = params;
                if (!symbol) {
                    return new Response(
                        JSON.stringify({ error: "Missing symbol" }),
                        { status: 400 }
                    );
                }
                const result = await upsertSymbolRange(
                    symbol,
                    haveFrom,
                    haveTo,
                    existingRange,
                    firstAvailableDay
                );
                return new Response(JSON.stringify({ data: result }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            case "loadPersistedDays": {
                const { symbol, reqFrom, reqTo } = params;
                if (!symbol || !reqFrom || !reqTo) {
                    return new Response(
                        JSON.stringify({
                            error: "Missing symbol, reqFrom, or reqTo",
                        }),
                        { status: 400 }
                    );
                }
                const result = await loadPersistedDays(symbol, reqFrom, reqTo);
                return new Response(JSON.stringify({ data: result }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            case "flushBucketToSupabase": {
                const { symbol, bucket, currentRange } = params;
                if (!symbol || !bucket) {
                    return new Response(
                        JSON.stringify({
                            error: "Missing symbol or bucket",
                        }),
                        { status: 400 }
                    );
                }
                const result = await flushBucketToSupabase(
                    symbol,
                    bucket as DayBlob[],
                    currentRange as SymbolRange | null
                );
                return new Response(JSON.stringify({ data: result }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            case "deleteCachedBarsForSymbol": {
                const { symbol } = params;
                if (!symbol) {
                    return new Response(
                        JSON.stringify({ error: "Missing symbol" }),
                        { status: 400 }
                    );
                }
                await deleteCachedBarsForSymbol(symbol);
                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            case "updateSplitsInDatabase": {
                const { symbol, splits, lastSplitCheck } = params;
                if (!symbol || !splits || !lastSplitCheck) {
                    return new Response(
                        JSON.stringify({
                            error: "Missing symbol, splits, or lastSplitCheck",
                        }),
                        { status: 400 }
                    );
                }
                await updateSplitsInDatabase(
                    symbol,
                    splits as SplitInfo[],
                    lastSplitCheck
                );
                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            case "resetSymbolRangeAfterSplitChange": {
                const { symbol, splits, lastSplitCheck, firstAvailableDay } =
                    params;
                if (!symbol || !splits || !lastSplitCheck) {
                    return new Response(
                        JSON.stringify({
                            error: "Missing required parameters",
                        }),
                        { status: 400 }
                    );
                }
                await resetSymbolRangeAfterSplitChange(
                    symbol,
                    splits as SplitInfo[],
                    lastSplitCheck,
                    firstAvailableDay
                );
                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            case "updateFirstAvailableDay": {
                const { symbol, firstAvailableDay } = params;
                if (!symbol || !firstAvailableDay) {
                    return new Response(
                        JSON.stringify({
                            error: "Missing symbol or firstAvailableDay",
                        }),
                        { status: 400 }
                    );
                }
                await updateFirstAvailableDay(symbol, firstAvailableDay);
                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            default:
                return new Response(
                    JSON.stringify({
                        error: `Unknown operation: ${operation}`,
                    }),
                    { status: 400 }
                );
        }
    } catch (error) {
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
