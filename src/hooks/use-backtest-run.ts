import { useBacktestRunsStore } from "@/stores/backtest-runs-store";
import { useCallback } from "react";
import type {
    BacktestConfig,
    BacktestProgressEvent,
    BacktestResult,
} from "@/backtest/types";
import type { BacktestFormValues } from "@/components/backtest/schema";
import type { BacktestRun } from "@/stores/backtest-runs-store";

type BacktestRunStore = {
    getRun: (id: string) => BacktestRun | undefined;
    updateRun: (id: string, updates: Partial<Omit<BacktestRun, "id" | "createdAt">>) => void;
    cancelRun: (id: string) => void;
};

async function startLocalBacktestRequest(
    config: BacktestConfig,
    abortController: AbortController
): Promise<Response> {
    const res = await fetch("/api/backtest/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
        signal: abortController.signal,
    });

    if (!res.ok || !res.body) {
        throw new Error("Failed to start local backtest");
    }

    return res;
}

function parseSseEvent(raw: string): any | null {
    const line = raw
        .split("\n")
        .find((l) => l.startsWith("data: "));
    if (!line) return null;
    const json = line.slice(6);
    if (!json) return null;

    try {
        return JSON.parse(json);
    } catch {
        return null;
    }
}

async function consumeLocalBacktestStream(params: {
    runId: string;
    res: Response;
    store: BacktestRunStore;
    abortController: AbortController;
}): Promise<BacktestResult> {
    const { runId, res, store, abortController } = params;

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult: BacktestResult | null = null;

    const handleEvent = (raw: string) => {
        const data = parseSseEvent(raw);
        if (!data) return;

        const currentRun = store.getRun(runId);
        if (!currentRun || abortController.signal.aborted) return;

        if (data.type === "progress") {
            store.updateRun(runId, {
                status: "running",
                progress: data as BacktestProgressEvent,
            });
        } else if (data.type === "result") {
            finalResult = data as BacktestResult;
        } else if (data.type === "error") {
            throw new Error(data.error || "Backtest error");
        }
    };

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Events are separated by double newline.
        let sepIndex: number;
        while ((sepIndex = buffer.indexOf("\n\n")) !== -1) {
            const rawEvent = buffer.slice(0, sepIndex).trim();
            buffer = buffer.slice(sepIndex + 2);
            if (rawEvent) {
                handleEvent(rawEvent);
            }
        }
    }

    const currentRun = store.getRun(runId);
    if (!currentRun || currentRun.status !== "running") {
        throw new Error("Backtest run was no longer active");
    }

    if (abortController.signal.aborted) {
        throw Object.assign(new Error("Backtest cancelled"), {
            name: "AbortError",
        });
    }

    if (!finalResult) {
        throw new Error("Backtest did not return a result");
    }

    return finalResult;
}

export function useBacktestRun(runId: string) {
    const storeHook = useBacktestRunsStore();
    const run = storeHook.getRun(runId);
    const store: BacktestRunStore = {
        getRun: storeHook.getRun,
        updateRun: storeHook.updateRun,
        cancelRun: storeHook.cancelRun,
    };

    const runLocalBacktest = async (runId: string, config: BacktestConfig) => {
        const abortController = new AbortController();
        store.updateRun(runId, { abortController });

        try {
            const res = await startLocalBacktestRequest(config, abortController);
            const result = await consumeLocalBacktestStream({
                runId,
                res,
                store,
                abortController,
            });

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

    const runBacktest = useCallback(
        async (values: BacktestFormValues) => {
            const config: BacktestConfig = {
                executionMode: values.executionMode,
                stock: values.stock,
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
                orderGapFilterEnabled: values.orderGapFilterEnabled,
                orderGapPct: values.orderGapFilterEnabled === false
                    ? -1
                    : values.orderGapPct
            };

            // Cancel existing run if it's in progress (has ws or abort controller)
            const isActive = run?.status === "running" || run?.status === "connecting";
            const hasActiveExecution = !!(run?.wsRef || run?.abortController);
            if (isActive && hasActiveExecution) {
                store.cancelRun(runId);
            }

            // Update config and reset status
            const initialStatus = values.executionMode === "cloud" ? "connecting" : "running";
            store.updateRun(runId, {
                config,
                status: initialStatus,
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

    const runCloudBacktest = async (
        runId: string,
        config: BacktestConfig
    ): Promise<void> => {
        let backtestId: string;

        try {
            const workerBase = process.env.NEXT_PUBLIC_WS_URL?.replace(/^wss:/, "https:").replace(/^ws:/, "http:") || "";
            const startUrl = workerBase ? `${workerBase.replace(/\/$/, "")}/start-backtest` : "";
            if (!startUrl) {
                store.updateRun(runId, {
                    status: "error",
                    error: "NEXT_PUBLIC_WS_URL not configured",
                });
                throw new Error("NEXT_PUBLIC_WS_URL not configured");
            }
            const startRes = await fetch(startUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ config: { ...config, executionMode: "cloud" } }),
            });

            if (!startRes.ok) {
                const err = (await startRes.json().catch(() => ({}))) as {
                    message?: string;
                    error?: string;
                };
                const message =
                    err.message || err.error || "Failed to start backtest";
                store.updateRun(runId, { status: "error", error: message });
                throw new Error(message);
            }

            const json = (await startRes.json()) as { backtestId?: string; jobId?: string };
            backtestId = json.jobId ?? json.backtestId ?? "";
            if (!backtestId) {
                store.updateRun(runId, {
                    status: "error",
                    error: "Invalid response from server",
                });
                throw new Error("Invalid response from server");
            }

            store.updateRun(runId, { cloudBacktestId: backtestId });

        } catch (err) {
            if (err instanceof Error) throw err;
            throw new Error("Failed to start backtest");
        }

        return new Promise((resolve, reject) => {
            const wsBase = process.env.NEXT_PUBLIC_WS_URL;
            if (!wsBase) {
                store.updateRun(runId, {
                    status: "error",
                    error: "NEXT_PUBLIC_WS_URL not configured",
                });
                reject(new Error("NEXT_PUBLIC_WS_URL not configured"));
                return;
            }

            const wsUrl = wsBase.includes("?") ? `${wsBase}&jobId=${backtestId}` : `${wsBase}?jobId=${backtestId}`;
            const ws = new WebSocket(wsUrl);
            store.updateRun(runId, { wsRef: ws });

            ws.onopen = () => {
                ws.send(JSON.stringify({ backtestId }));
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
                    const isActive = currentRun?.status === "running" || currentRun?.status === "connecting";
                    if (!currentRun || !isActive) {
                        ws.close();
                        return;
                    }

                    // On fFirst message received switch from "connecting" to "running"
                    if (currentRun.status === "connecting") {
                        store.updateRun(runId, { status: "running" });
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

                // Check if the connection closed unexpectedly while backtest was running or connecting
                const currentRun = store.getRun(runId);
                const wasActive = currentRun?.status === "running" || currentRun?.status === "connecting";
                if (wasActive && !currentRun?.result) {
                    store.updateRun(runId, {
                        status: "error",
                        error: "WebSocket connection closed unexpectedly. The backtest may still be running on the server.",
                    });
                    reject(new Error("WebSocket connection closed unexpectedly"));
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
