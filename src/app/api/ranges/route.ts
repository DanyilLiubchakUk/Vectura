import {
    listAllSymbolRanges,
    updateSymbolRangeDates,
    deleteSymbolCompletely,
    readSymbolRange,
    deleteBarsOutsideRange,
} from "@/utils/supabase/backtestStorage";
import {
    createErrorResponse,
    createSuccessResponse,
    createBadRequestResponse,
} from "@/app/api/ranges/utils";
import {
    fillMissingRanges,
    computeMissingRanges,
} from "@/backtest/storage/rangeManager";
import {
    validateAndAdjustDateRange,
    findNearestMarketDays,
} from "@/utils/date-validation";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const symbol = searchParams.get("symbol");

        if (symbol) {
            const range = await readSymbolRange(symbol);
            return createSuccessResponse(range ? [range] : []);
        }

        const ranges = await listAllSymbolRanges();
        return createSuccessResponse(ranges);
    } catch (error) {
        return createErrorResponse(error as Error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as { operation?: string;[key: string]: unknown };
        const { operation, ...params } = body;

        switch (operation) {
            case "validateDateRange": {
                const symbol = params.symbol;
                const requestedStart = params.requestedStart;
                const requestedEnd = params.requestedEnd;
                if (!symbol || !requestedStart || !requestedEnd || typeof symbol !== "string" || typeof requestedStart !== "string" || typeof requestedEnd !== "string") {
                    return createBadRequestResponse(
                        "Missing symbol, requestedStart, or requestedEnd"
                    );
                }

                const currentRange = await readSymbolRange(symbol);
                const result = await validateAndAdjustDateRange(
                    symbol,
                    requestedStart,
                    requestedEnd,
                    currentRange?.first_available_day || null,
                    currentRange?.have_from || null,
                    currentRange?.have_to || null
                );

                return createSuccessResponse(result);
            }

            case "findNearestMarketDays": {
                const symbol = params.symbol;
                const day = params.day;
                if (!symbol || !day || typeof symbol !== "string" || typeof day !== "string") {
                    return createBadRequestResponse("Missing symbol or day");
                }

                const result = await findNearestMarketDays(symbol, day);
                return createSuccessResponse(result);
            }

            case "checkDayDirectly": {
                const symbol = params.symbol;
                const day = params.day;
                if (!symbol || !day || typeof symbol !== "string" || typeof day !== "string") {
                    return createBadRequestResponse("Missing symbol or day");
                }

                try {
                    const { isMarketTradingDay } = await import(
                        "@/utils/date-validation"
                    );
                    const isOpen = await isMarketTradingDay(symbol, day);
                    return createSuccessResponse(isOpen);
                } catch (error: unknown) {
                    const err = error as { code?: number; status?: number };
                    if (err?.code === 401 || err?.status === 401) {
                        return NextResponse.json(
                            {
                                error: "Authentication error: Unable to check market day. Please verify API credentials.",
                                errorCode: 401,
                            },
                            { status: 500 }
                        );
                    }
                    return NextResponse.json(
                        {
                            error: "Error checking market day. Please try again.",
                            errorCode: err?.code ?? err?.status ?? 500,
                        },
                        { status: 500 }
                    );
                }
            }

            case "updateRange": {
                const symbol = params.symbol;
                const haveFrom = params.haveFrom;
                const haveTo = params.haveTo;
                if (!symbol || typeof symbol !== "string") {
                    return createBadRequestResponse("Missing symbol");
                }
                if (typeof haveFrom !== "string" || typeof haveTo !== "string") {
                    return createBadRequestResponse("Missing haveFrom or haveTo");
                }

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
                    return NextResponse.json(
                        {
                            error: validation.message,
                            validation,
                        },
                        { status: 400 }
                    );
                }

                const currentFrom = currentRange?.have_from;
                const currentTo = currentRange?.have_to;
                const newFrom = validation.adjustedStart!;
                const newTo = validation.adjustedEnd!;

                const shouldDeleteBars =
                    (currentFrom && newFrom > currentFrom) ||
                    (currentTo && newTo < currentTo) ||
                    (currentFrom &&
                        currentTo &&
                        (newFrom > currentFrom || newTo < currentTo));

                if (shouldDeleteBars) {
                    await deleteBarsOutsideRange(symbol, newFrom, newTo);
                }

                const updatedRange = await updateSymbolRangeDates(
                    symbol,
                    validation.adjustedStart ?? null,
                    validation.adjustedEnd ?? null
                );

                if (validation.needsDownload && updatedRange) {
                    const missingRanges = computeMissingRanges(
                        validation.adjustedStart!,
                        validation.adjustedEnd!,
                        updatedRange.have_from || undefined,
                        updatedRange.have_to || undefined
                    );

                    await fillMissingRanges(
                        symbol,
                        missingRanges.leftRange,
                        missingRanges.rightRange,
                        updatedRange,
                        undefined,
                        undefined
                    );

                    const finalRange = await readSymbolRange(symbol);
                    return NextResponse.json({
                        data: finalRange,
                        message: "Range updated and data downloaded",
                    });
                }

                return createSuccessResponse(updatedRange);
            }

            case "deleteSymbol": {
                const symbol = params.symbol;
                if (!symbol || typeof symbol !== "string") {
                    return createBadRequestResponse("Missing symbol");
                }

                await deleteSymbolCompletely(symbol);
                return NextResponse.json({ success: true });
            }

            case "downloadMissingData": {
                const symbol = params.symbol;
                const from = params.from;
                const to = params.to;
                if (!symbol || !from || !to || typeof symbol !== "string" || typeof from !== "string" || typeof to !== "string") {
                    return createBadRequestResponse(
                        "Missing symbol, from, or to"
                    );
                }

                const currentRange = await readSymbolRange(symbol);
                const missingRanges = computeMissingRanges(
                    from,
                    to,
                    currentRange?.have_from || undefined,
                    currentRange?.have_to || undefined
                );

                if (!missingRanges.leftRange && !missingRanges.rightRange) {
                    return NextResponse.json({
                        message: "No missing data to download",
                    });
                }

                const updatedRange = await fillMissingRanges(
                    symbol,
                    missingRanges.leftRange,
                    missingRanges.rightRange,
                    currentRange,
                    undefined,
                    undefined
                );

                return NextResponse.json({
                    data: updatedRange,
                    message: "Data download complete",
                });
            }

            default:
                return createBadRequestResponse(
                    `Unknown operation: ${operation}`
                );
        }
    } catch (error) {
        return createErrorResponse(error as Error);
    }
}
