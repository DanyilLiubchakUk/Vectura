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
        const body = (await request.json()) as { operation?: string;[key: string]: unknown };
        const { operation, ...params } = body;

        switch (operation) {
            case "readSymbolRange": {
                const symbol = params.symbol;
                if (!symbol || typeof symbol !== "string") {
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
                const symbol = params.symbol;
                const haveFrom = params.haveFrom;
                const haveTo = params.haveTo;
                const existingRange = params.existingRange;
                const firstAvailableDay = params.firstAvailableDay;
                if (!symbol || typeof symbol !== "string") {
                    return new Response(
                        JSON.stringify({ error: "Missing symbol" }),
                        { status: 400 }
                    );
                }
                const result = await upsertSymbolRange(
                    symbol,
                    (haveFrom ?? null) as string | null,
                    (haveTo ?? null) as string | null,
                    (existingRange ?? null) as SymbolRange | null,
                    (firstAvailableDay ?? null) as string | null
                );
                return new Response(JSON.stringify({ data: result }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            case "loadPersistedDays": {
                const symbol = params.symbol;
                const reqFrom = params.reqFrom;
                const reqTo = params.reqTo;
                if (!symbol || !reqFrom || !reqTo || typeof symbol !== "string" || typeof reqFrom !== "string" || typeof reqTo !== "string") {
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
                const symbol = params.symbol;
                const bucket = params.bucket;
                const currentRange = params.currentRange;
                if (!symbol || !bucket || typeof symbol !== "string") {
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
                const symbol = params.symbol;
                if (!symbol || typeof symbol !== "string") {
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
                const symbol = params.symbol;
                const splits = params.splits;
                const lastSplitCheck = params.lastSplitCheck;
                if (!symbol || !splits || !lastSplitCheck || typeof symbol !== "string" || typeof lastSplitCheck !== "string") {
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
                const symbol = params.symbol;
                const splits = params.splits;
                const lastSplitCheck = params.lastSplitCheck;
                const firstAvailableDay = params.firstAvailableDay;
                if (!symbol || !splits || !lastSplitCheck || typeof symbol !== "string" || typeof lastSplitCheck !== "string") {
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
                    firstAvailableDay as string | null | undefined
                );
                return new Response(JSON.stringify({ success: true }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            }

            case "updateFirstAvailableDay": {
                const symbol = params.symbol;
                const firstAvailableDay = params.firstAvailableDay;
                if (!symbol || !firstAvailableDay || typeof symbol !== "string" || typeof firstAvailableDay !== "string") {
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
