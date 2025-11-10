import { logger, schedules } from "@trigger.dev/sdk";
import {
    getMarketClock,
    getFilteredSnapshot,
    Tfilteredsnapshot,
} from "@/utils/alpaca/getTradingData";
import addHistoricalData from "@/utils/supabase/addHistoricalData";
import getTradedStocks from "@/utils/supabase/getTradedStocks";

export const schedule = schedules.task({
    id: "add-data",
    cron: "* * * * 1-5",
    maxDuration: 180, // 180 seconds
    run: async (payload) => {
        try {
            const {
                data: clock,
                success: clockSuccess,
                error: clockError,
            } = await getMarketClock();

            if (!clockSuccess) {
                logger.log("Failure getting market clock", { clockError });
                return {
                    success: false,
                    output: clockError,
                    timestamp: payload.timestamp.toISOString(),
                };
            }

            if (!clock?.is_open) {
                console.log("Market is close");
                return {
                    success: true,
                    output: "Market is close",
                    timestamp: payload.timestamp.toISOString(),
                };
            }

            console.log("Market is open");

            const tradedStocksResult = await getTradedStocks();
            if (!tradedStocksResult.success) {
                logger.log("Failure getting traded stocks", {
                    error: tradedStocksResult.error,
                });
            }
            let stockSymbols: string[] = [];
            if (tradedStocksResult.data) {
                stockSymbols = tradedStocksResult.data;
            }

            const results: {
                symbol: string;
                success: boolean;
                data?: Tfilteredsnapshot;
                error?: any;
            }[] = [];

            for (const symbol of stockSymbols) {
                try {
                    const {
                        data: snapshot,
                        success: snapshotSuccess,
                        error: snapshotError,
                    } = await getFilteredSnapshot(symbol);

                    if (!snapshotSuccess || !snapshot) {
                        logger.log(`Failure getting snapshot for ${symbol}`, {
                            error: snapshotError,
                        });
                        results.push({
                            symbol,
                            success: false,
                            error: snapshotError,
                        });
                        continue;
                    }

                    const uploadedInfo = await addHistoricalData(snapshot);

                    if (!uploadedInfo.success) {
                        logger.log(
                            `Failure adding historical data for ${symbol}`,
                            {
                                error: uploadedInfo.error,
                            }
                        );
                        results.push({
                            symbol,
                            success: false,
                            error: uploadedInfo.error,
                        });
                        continue;
                    }

                    logger.log(`Added data for ${symbol}`, {
                        uploadedInfo: uploadedInfo.data,
                    });
                    results.push({
                        symbol,
                        success: true,
                        data: uploadedInfo.data,
                    });
                } catch (error) {
                    logger.log(`Error processing ${symbol}`, { error });
                    results.push({
                        symbol,
                        success: false,
                        error,
                    });
                }
            }

            const successCount = results.filter((r) => r.success).length;
            const failureCount = results.filter((r) => !r.success).length;

            return {
                success: failureCount === 0,
                output: {
                    summary: {
                        total: stockSymbols.length,
                        successful: successCount,
                        failed: failureCount,
                    },
                    results,
                },
                timestamp: payload.timestamp.toISOString(),
            };
        } catch (error) {
            logger.log("Failure adding data", { error });
            return {
                success: false,
                output: error,
                timestamp: payload.timestamp.toISOString(),
            };
        }
    },
});
