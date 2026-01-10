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
        const body = await request.json();
        const { operation, ...params } = body;

        switch (operation) {
            case "validateDateRange": {
                const { symbol, requestedStart, requestedEnd } = params;
                if (!symbol || !requestedStart || !requestedEnd) {
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
                const { symbol, day } = params;

                if (!symbol || !day) {
                    return createBadRequestResponse("Missing symbol or day");
                }

                const result = await findNearestMarketDays(symbol, day);
                return createSuccessResponse(result);
            }

            case "checkDayDirectly": {
                const { symbol, day } = params;
                if (!symbol || !day) {
                    return createBadRequestResponse("Missing symbol or day");
                }

                try {
                    const { isMarketTradingDay } = await import(
                        "@/utils/date-validation"
                    );
                    const isOpen = await isMarketTradingDay(symbol, day);
                    return createSuccessResponse(isOpen);
                } catch (error: any) {
                    if (error?.code === 401 || error?.status === 401) {
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
                            errorCode: error?.code || error?.status || 500,
                        },
                        { status: 500 }
                    );
                }
            }

            case "updateRange": {
                const { symbol, haveFrom, haveTo } = params;
                if (!symbol) {
                    return createBadRequestResponse("Missing symbol");
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
                    validation.adjustedStart,
                    validation.adjustedEnd
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
                const { symbol } = params;
                if (!symbol) {
                    return createBadRequestResponse("Missing symbol");
                }

                await deleteSymbolCompletely(symbol);
                return NextResponse.json({ success: true });
            }

            case "downloadMissingData": {
                const { symbol, from, to } = params;
                if (!symbol || !from || !to) {
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
