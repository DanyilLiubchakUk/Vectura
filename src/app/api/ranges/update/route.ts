import {
    readSymbolRange,
    updateSymbolRangeDates,
    deleteBarsOutsideRange,
} from "@/utils/supabase/backtestStorage";
import {
    createErrorResponse,
    createBadRequestResponse,
} from "@/app/api/ranges/utils";
import { fillMissingRangesWithServerAdapter } from "@/backtest/storage/rangeManager-server";
import { computeMissingRanges } from "@/backtest/storage/rangeManager";
import { validateAndAdjustDateRange } from "@/utils/date-validation";
import { NextRequest } from "next/server";
import type { BacktestProgressEvent } from "@/backtest/types";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const symbol = searchParams.get("symbol");
        const haveFrom = searchParams.get("haveFrom");
        const haveTo = searchParams.get("haveTo");

        if (!symbol || !haveFrom || !haveTo) {
            return createBadRequestResponse(
                "Missing symbol, haveFrom, or haveTo"
            );
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
                    const currentRange = await readSymbolRange(symbol);

                    const validation = await validateAndAdjustDateRange(
                        symbol,
                        haveFrom,
                        haveTo,
                        currentRange?.first_available_day || null,
                        currentRange?.have_from || null,
                        currentRange?.have_to || null
                    );

                    if (!validation.valid) {
                        sendEvent({
                            type: "error",
                            error: validation.message,
                        });
                        controller.close();
                        return;
                    }

                    const newFrom = validation.adjustedStart!;
                    const newTo = validation.adjustedEnd!;

                    let missingRanges: {
                        leftRange?: any;
                        rightRange?: any;
                    } | null = null;

                    if (validation.needsDownload) {
                        missingRanges = computeMissingRanges(
                            validation.adjustedStart!,
                            validation.adjustedEnd!,
                            currentRange?.have_from || undefined,
                            currentRange?.have_to || undefined
                        );
                    }

                    if (validation.needsDownload && missingRanges) {
                        const onProgress = async (
                            event: BacktestProgressEvent
                        ) => {
                            sendEvent({ type: "progress", ...event });
                        };

                        await fillMissingRangesWithServerAdapter(
                            symbol,
                            missingRanges.leftRange,
                            missingRanges.rightRange,
                            currentRange,
                            undefined,
                            onProgress
                        );
                    }

                    await deleteBarsOutsideRange(symbol, newFrom, newTo);

                    await updateSymbolRangeDates(
                        symbol,
                        validation.adjustedStart,
                        validation.adjustedEnd
                    );

                    sendEvent({ type: "complete" });
                    controller.close();
                } catch (error) {
                    sendEvent({
                        type: "error",
                        error:
                            error instanceof Error
                                ? error.message
                                : "Unknown error",
                    });
                    controller.close();
                }
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
        return createErrorResponse(error as Error);
    }
}
