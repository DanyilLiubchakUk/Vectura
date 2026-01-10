import { useBacktestRunsStore } from "@/stores/backtest-runs-store";
import { runBacktestCore } from "@/backtest/core/engine";
import { useCallback } from "react";
import type {
    BacktestConfig,
    BacktestProgressEvent,
    BacktestResult,
} from "@/backtest/types";
import type { BacktestFormValues } from "@/components/backtest/schema";

export function useBacktestRun(runId: string) {
    const store = useBacktestRunsStore();
    const run = store.getRun(runId);

    const runBacktest = useCallback(
        async (values: BacktestFormValues) => {
            const config: BacktestConfig = {
                executionMode: values.executionMode,
                stock: values.stock,
                algorithm: values.algorithm,
                startDate: values.startDate,
                endDate: values.endDate,
                startCapital: values.startCapital,
                contributionFrequencyDays: values.contributionFrequencyDays,
                contributionAmount: values.contributionAmount,
                capitalPct: values.capitalPct,
                buyBelowPct: values.buyBelowPct,
                sellAbovePct: values.sellAbovePct,
                buyAfterSellPct: values.buyAfterSellPct,
                cashFloor: values.cashFloor,
                orderGapPct: values.orderGapPct,
            };

            // Cancel existing run if it's running
            if (run?.status === "running") {
                store.cancelRun(runId);
            }

            // Update config and reset status
            store.updateRun(runId, {
                config,
                status: "running",
                progress: null,
                result: null,
                error: null,
            });

            try {
                if (values.executionMode === "cloud") {
                    await runCloudBacktest(runId, config);
                } else {
                    await runLocalBacktest(runId, config);
                }
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") {
                    store.updateRun(runId, {
                        status: "cancelled",
                        error: "Backtest cancelled",
                    });
                } else {
                    store.updateRun(runId, {
                        status: "error",
                        error:
                            err instanceof Error
                                ? err.message
                                : "Unknown error occurred",
                    });
                }
            }
        },
        [runId, run, store]
    );

    const runLocalBacktest = async (runId: string, config: BacktestConfig) => {
        const abortController = new AbortController();
        store.updateRun(runId, { abortController });

        try {
            const onProgress = async (event: BacktestProgressEvent) => {
                const currentRun = store.getRun(runId);
                if (
                    !currentRun ||
                    currentRun.status !== "running" ||
                    abortController.signal.aborted
                ) {
                    return;
                }
                store.updateRun(runId, { progress: event });
            };

            const result = await runBacktestCore(
                config,
                onProgress,
                abortController.signal
            );

            const currentRun = store.getRun(runId);
            if (!currentRun || currentRun.status !== "running") {
                return;
            }

            if (abortController.signal.aborted) {
                store.updateRun(runId, {
                    status: "cancelled",
                    error: "Backtest cancelled",
                });
                return;
            }

            store.updateRun(runId, {
                status: "completed",
                result,
            });
        } catch (err) {
            const currentRun = store.getRun(runId);
            if (!currentRun || currentRun.status !== "running") {
                return;
            }

            if (
                abortController.signal.aborted ||
                (err instanceof Error && err.name === "AbortError")
            ) {
                store.updateRun(runId, {
                    status: "cancelled",
                    error: "Backtest cancelled",
                });
            } else {
                store.updateRun(runId, {
                    status: "error",
                    error:
                        err instanceof Error
                            ? err.message
                            : "Unknown error occurred",
                });
            }
        } finally {
            store.updateRun(runId, { abortController: undefined });
        }
    };

    const runCloudBacktest = (
        runId: string,
        config: BacktestConfig
    ): Promise<void> => {
        return new Promise((resolve, reject) => {
            const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
            if (!wsUrl) {
                store.updateRun(runId, {
                    status: "error",
                    error: "NEXT_PUBLIC_WS_URL not configured",
                });
                reject(new Error("NEXT_PUBLIC_WS_URL not configured"));
                return;
            }

            const ws = new WebSocket(wsUrl);
            store.updateRun(runId, { wsRef: ws });

            ws.onopen = () => {
                ws.send(
                    JSON.stringify({
                        type: "start_backtest",
                        mode: "cloud",
                        config,
                    })
                );
            };

            // Track chunked result assembly
            let baseResult: any = null;
            const priceDataChunks: any[][] = [];
            const equityDataChunks: any[][] = [];
            const cashDataChunks: any[][] = [];
            const executionsChunks: any[][] = [];
            let expectedPriceDataChunks = 0;
            let expectedEquityDataChunks = 0;
            let expectedCashDataChunks = 0;
            let expectedExecutionsChunks = 0;
            let receivedPriceDataChunks = 0;
            let receivedEquityDataChunks = 0;
            let receivedCashDataChunks = 0;
            let receivedExecutionsChunks = 0;

            const emitChunkProgress = () => {
                const currentRun = store.getRun(runId);
                if (!currentRun || currentRun.status !== "running") {
                    return;
                }

                // Calculate progress for each data type that has expected chunks
                const progressData: Array<{ received: number; expected: number }> = [];

                if (expectedPriceDataChunks > 0) {
                    progressData.push({
                        received: receivedPriceDataChunks,
                        expected: expectedPriceDataChunks,
                    });
                }
                if (expectedEquityDataChunks > 0) {
                    progressData.push({
                        received: receivedEquityDataChunks,
                        expected: expectedEquityDataChunks,
                    });
                }
                if (expectedCashDataChunks > 0) {
                    progressData.push({
                        received: receivedCashDataChunks,
                        expected: expectedCashDataChunks,
                    });
                }
                if (expectedExecutionsChunks > 0) {
                    progressData.push({
                        received: receivedExecutionsChunks,
                        expected: expectedExecutionsChunks,
                    });
                }

                // Calculate weighted average progress based on expected chunks per data type
                let totalWeightedProgress = 0;
                let totalWeight = 0;
                let totalExpectedChunks = 0;
                let totalReceivedChunks = 0;

                for (const { received, expected } of progressData) {
                    if (expected > 0) {
                        const typeProgress = Math.min(100, (received / expected) * 100);
                        totalWeightedProgress += typeProgress * expected;
                        totalWeight += expected;
                        totalExpectedChunks += expected;
                        totalReceivedChunks += received;
                    }
                }

                // Only show progress if we have data types with expected chunks
                if (progressData.length > 0 && totalWeight > 0) {
                    const progress = Math.min(
                        100,
                        Math.round(totalWeightedProgress / totalWeight)
                    );

                    const progressEvent: BacktestProgressEvent = {
                        stage: "accumulating_chunks",
                        message: `Handling your data...`,
                        data: {
                            progress,
                            receivedChunks: totalReceivedChunks,
                            totalChunks: totalExpectedChunks,
                            priceDataChunks: {
                                received: receivedPriceDataChunks,
                                expected: expectedPriceDataChunks,
                            },
                            equityDataChunks: {
                                received: receivedEquityDataChunks,
                                expected: expectedEquityDataChunks,
                            },
                            cashDataChunks: {
                                received: receivedCashDataChunks,
                                expected: expectedCashDataChunks,
                            },
                            executionsChunks: {
                                received: receivedExecutionsChunks,
                                expected: expectedExecutionsChunks,
                            },
                        },
                        timestamp: new Date().toISOString(),
                    };

                    store.updateRun(runId, { progress: progressEvent });
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const currentRun = store.getRun(runId);
                    if (!currentRun || currentRun.status !== "running") {
                        ws.close();
                        return;
                    }

                    if (data.type === "progress") {
                        store.updateRun(runId, {
                            progress: data as BacktestProgressEvent,
                        });
                    } else if (data.type === "result") {
                        baseResult = data;
                        // If chartData is included, it means it wasn't chunked
                        if (data.chartData) {
                            store.updateRun(runId, {
                                status: "completed",
                                result: data as BacktestResult,
                            });
                            ws.close();
                            store.updateRun(runId, { wsRef: null });
                            resolve();
                        } else {
                            // Chart data will be chunked, show "Calculating metrics" stage
                            const progressEvent: BacktestProgressEvent = {
                                stage: "calculating_metrics",
                                message: "Calculating metrics and preparing data...",
                                data: {
                                    progress: 0,
                                },
                                timestamp: new Date().toISOString(),
                            };
                            store.updateRun(runId, { progress: progressEvent });
                        }
                    } else if (data.type === "result_chunk") {
                        // Accumulate chart data chunks
                        const chunkIndex = data.chunkIndex as number;
                        const dataType = data.dataType as "priceData" | "equityData" | "cashData" | "executions";
                        const totalChunks = data.totalChunks as number;

                        if (dataType === "priceData") {
                            if (expectedPriceDataChunks === 0 && typeof totalChunks === "number" && totalChunks > 0) {
                                expectedPriceDataChunks = totalChunks;
                            }
                            if (
                                typeof chunkIndex === "number" &&
                                chunkIndex >= 0 &&
                                (expectedPriceDataChunks === 0 || chunkIndex < expectedPriceDataChunks) &&
                                data.chartData?.priceData &&
                                !priceDataChunks[chunkIndex]
                            ) {
                                priceDataChunks[chunkIndex] = data.chartData.priceData;
                                receivedPriceDataChunks++;
                            }
                        } else if (dataType === "equityData") {
                            if (expectedEquityDataChunks === 0 && typeof totalChunks === "number" && totalChunks > 0) {
                                expectedEquityDataChunks = totalChunks;
                            }
                            if (
                                typeof chunkIndex === "number" &&
                                chunkIndex >= 0 &&
                                (expectedEquityDataChunks === 0 || chunkIndex < expectedEquityDataChunks) &&
                                data.chartData?.equityData &&
                                !equityDataChunks[chunkIndex]
                            ) {
                                equityDataChunks[chunkIndex] = data.chartData.equityData;
                                receivedEquityDataChunks++;
                            }
                        } else if (dataType === "cashData") {
                            if (expectedCashDataChunks === 0 && typeof totalChunks === "number" && totalChunks > 0) {
                                expectedCashDataChunks = totalChunks;
                            }
                            if (
                                typeof chunkIndex === "number" &&
                                chunkIndex >= 0 &&
                                (expectedCashDataChunks === 0 || chunkIndex < expectedCashDataChunks) &&
                                data.chartData?.cashData &&
                                !cashDataChunks[chunkIndex]
                            ) {
                                cashDataChunks[chunkIndex] = data.chartData.cashData;
                                receivedCashDataChunks++;
                            }
                        } else if (dataType === "executions") {
                            if (expectedExecutionsChunks === 0 && typeof totalChunks === "number" && totalChunks > 0) {
                                expectedExecutionsChunks = totalChunks;
                            }
                            if (
                                typeof chunkIndex === "number" &&
                                chunkIndex >= 0 &&
                                (expectedExecutionsChunks === 0 || chunkIndex < expectedExecutionsChunks) &&
                                data.chartData?.executions &&
                                !executionsChunks[chunkIndex]
                            ) {
                                executionsChunks[chunkIndex] = data.chartData.executions;
                                receivedExecutionsChunks++;
                            }
                        }

                        // Emit progress after processing each chunk
                        emitChunkProgress();
                    } else if (data.type === "result_complete") {
                        // Safe checks for chunk completeness
                        const allPriceDataChunksReceived =
                            (expectedPriceDataChunks > 0 && receivedPriceDataChunks === expectedPriceDataChunks) ||
                            expectedPriceDataChunks === 0;
                        const allEquityDataChunksReceived =
                            (expectedEquityDataChunks > 0 && receivedEquityDataChunks === expectedEquityDataChunks) ||
                            expectedEquityDataChunks === 0 ||
                            receivedEquityDataChunks === 0;
                        const allCashDataChunksReceived =
                            (expectedCashDataChunks > 0 && receivedCashDataChunks === expectedCashDataChunks) ||
                            expectedCashDataChunks === 0 ||
                            receivedCashDataChunks === 0;
                        const allExecutionsChunksReceived =
                            (expectedExecutionsChunks > 0 && receivedExecutionsChunks === expectedExecutionsChunks) ||
                            expectedExecutionsChunks === 0;

                        // Emit final progress before completion
                        if (baseResult) {
                            const finalProgressEvent: BacktestProgressEvent = {
                                stage: "accumulating_chunks",
                                message: "Finalizing data...",
                                data: {
                                    progress: 100,
                                },
                                timestamp: new Date().toISOString(),
                            };
                            store.updateRun(runId, { progress: finalProgressEvent });
                        }

                        if (baseResult && allPriceDataChunksReceived && allEquityDataChunksReceived && allCashDataChunksReceived && allExecutionsChunksReceived) {
                            const priceData = priceDataChunks.flat();
                            const equityData = equityDataChunks.length > 0 ? equityDataChunks.flat() : undefined;
                            const cashData = cashDataChunks.length > 0 ? cashDataChunks.flat() : undefined;
                            const executions = executionsChunks.flat();
                            const completeResult = {
                                ...baseResult,
                                chartData: {
                                    priceData,
                                    ...(equityData && { equityData }),
                                    ...(cashData && { cashData }),
                                    executions,
                                },
                            } as BacktestResult;

                            store.updateRun(runId, {
                                status: "completed",
                                result: completeResult,
                            });
                            ws.close();
                            store.updateRun(runId, { wsRef: null });
                            resolve();
                        } else {
                            console.error("[Frontend] Missing chunks or base result", {
                                hasBaseResult: !!baseResult,
                                priceDataChunks: { received: receivedPriceDataChunks, expected: expectedPriceDataChunks },
                                equityDataChunks: { received: receivedEquityDataChunks, expected: expectedEquityDataChunks },
                                cashDataChunks: { received: receivedCashDataChunks, expected: expectedCashDataChunks },
                                executionsChunks: { received: receivedExecutionsChunks, expected: expectedExecutionsChunks },
                            });
                            store.updateRun(runId, {
                                status: "error",
                                error: "Failed to receive complete result",
                            });
                            ws.close();
                            store.updateRun(runId, { wsRef: null });
                            reject(new Error("Failed to receive complete result"));
                        }
                    } else if (data.type === "error") {
                        store.updateRun(runId, {
                            status: "error",
                            error: data.error || "Unknown error",
                        });
                        ws.close();
                        store.updateRun(runId, { wsRef: null });
                        reject(new Error(data.error));
                    } else if (data.type === "cancelled") {
                        store.updateRun(runId, {
                            status: "cancelled",
                            error: "Backtest cancelled",
                        });
                        ws.close();
                        store.updateRun(runId, { wsRef: null });
                    }
                } catch {
                    // Skip malformed messages
                }
            };

            ws.onerror = () => {
                store.updateRun(runId, {
                    status: "error",
                    error: "WebSocket connection error",
                });
                store.updateRun(runId, { wsRef: null });
                reject(new Error("WebSocket connection error"));
            };

            ws.onclose = () => {
                store.updateRun(runId, { wsRef: null });

                // Check if the connection closed unexpectedly while backtest was running
                const currentRun = store.getRun(runId);
                if (currentRun?.status === "running") {
                    if (!currentRun.result) {
                        store.updateRun(runId, {
                            status: "error",
                            error: "WebSocket connection closed unexpectedly. The backtest may still be running on the server.",
                        });
                        reject(new Error("WebSocket connection closed unexpectedly"));
                    }
                }
            };
        });
    };

    const cancel = useCallback(() => {
        store.cancelRun(runId);
    }, [runId, store]);

    return {
        run,
        runBacktest,
        cancel,
    };
}
