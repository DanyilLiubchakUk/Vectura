import { fetchSplitsFromAlphaVantage } from "@/utils/alphavantage/splits";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { symbol } = body;

        if (!symbol) {
            return new Response(JSON.stringify({ error: "Missing symbol" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const splits = await fetchSplitsFromAlphaVantage(symbol);

        return new Response(JSON.stringify({ data: splits }), {
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
