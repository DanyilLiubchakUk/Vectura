import { getBars, Tbar } from "@/utils/alpaca/getTradingData";
import { FETCH_LIMIT } from "@/backtest/constants";
import { NextRequest } from "next/server";
import { Eorder } from "@/types/alpaca";
import Alpaca from "@/utils/alpaca";

export const runtime = "nodejs";

async function fetchRawBarsFromAlpaca(
    symbol: string,
    day: string
): Promise<Tbar[]> {
    const fetchLimit = FETCH_LIMIT;
    const result = await getBars(
        symbol,
        Alpaca.newTimeframe(1, Alpaca.timeframeUnit.MIN),
        fetchLimit,
        Eorder.Asc,
        day
    );

    if (!result.success) {
        console.error("[alpacaFetcher] getBars failed", {
            symbol,
            day,
            error: result.error,
        });
        throw result.error;
    }

    return result.data ?? [];
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { symbol, day } = body;

        if (!symbol || !day) {
            return new Response(
                JSON.stringify({ error: "Missing symbol or day" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        const rawBars = await fetchRawBarsFromAlpaca(symbol, day);

        return new Response(JSON.stringify({ data: rawBars }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(
            JSON.stringify({
                error: error instanceof Error ? error.message : "Unknown error",
            }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
