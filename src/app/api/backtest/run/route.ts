import { runBacktestCore } from "@/backtest/core/engine";
import { NextRequest } from "next/server";
import type { BacktestConfig, BacktestProgressEvent } from "@/backtest/types";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes (maximum for Vercel hobby plan)

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { config } = body;

        if (!config) {
            return new Response(JSON.stringify({ error: "Invalid request" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const abortController = new AbortController();
        const requestSignal = request.signal;

        if (requestSignal) {
            requestSignal.addEventListener("abort", () => {
                abortController.abort();
            });
        }

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                const sendEvent = (data: any) => {
                    try {
                        controller.enqueue(
                            encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
                        );
                    } catch {
                        // Stream may be closed
                    }
                };

                try {
                    const onProgress = async (event: BacktestProgressEvent) => {
                        if (abortController.signal.aborted) {
                            return;
                        }
                        sendEvent({ type: "progress", ...event });
                    };

                    const result = await runBacktestCore(
                        config as BacktestConfig,
                        onProgress,
                        abortController.signal
                    );

                    if (abortController.signal.aborted) {
                        sendEvent({ type: "cancelled" });
                        controller.close();
                        return;
                    }

                    sendEvent({ type: "result", ...result });
                    controller.close();
                } catch (error) {
                    if (
                        abortController.signal.aborted ||
                        (error instanceof Error && error.name === "AbortError")
                    ) {
                        sendEvent({ type: "cancelled" });
                    } else {
                        sendEvent({
                            type: "error",
                            error:
                                error instanceof Error
                                    ? error.message
                                    : "Unknown error",
                        });
                    }
                    controller.close();
                }
            },
            cancel() {
                abortController.abort();
            },
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
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
