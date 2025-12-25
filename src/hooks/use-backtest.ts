import { runBacktestCore } from "@/backtest/core/engine";
import { useState, useCallback, useRef } from "react";
import type {
    BacktestConfig,
    BacktestProgressEvent,
    BacktestResult,
} from "@/backtest/types";
import type { BacktestFormValues } from "@/components/backtest/schema";

export interface UseBacktestReturn {
    isRunning: boolean;
    progress: BacktestProgressEvent | null;
    result: BacktestResult | null;
    error: string | null;
    currentConfig: BacktestConfig | null;
    runBacktest: (values: BacktestFormValues) => Promise<void>;
    cancel: () => void;
    reset: () => void;
}

export function useBacktest(): UseBacktestReturn {
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState<BacktestProgressEvent | null>(
        null
    );
    const [result, setResult] = useState<BacktestResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [currentConfig, setCurrentConfig] = useState<BacktestConfig | null>(
        null
    );
    const wsRef = useRef<WebSocket | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(
        null
    );

    const runBacktest = useCallback(async (values: BacktestFormValues) => {
        setIsRunning(true);
        setProgress(null);
        setResult(null);
        setError(null);

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

        setCurrentConfig(config);

        try {
            if (values.executionMode === "cloud") {
                await runCloudBacktest(config);
            } else {
                await runLocalBacktest(config);
            }
        } catch (err) {
            if (err instanceof Error && err.name === "AbortError") {
                setError("Backtest cancelled");
            } else {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Unknown error occurred"
                );
            }
            setIsRunning(false);
        }
    }, []);

    const runLocalBacktest = async (config: BacktestConfig) => {
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const onProgress = async (event: BacktestProgressEvent) => {
                if (abortController.signal.aborted) return;
                setProgress(event);
            };

            const result = await runBacktestCore(
                config,
                onProgress,
                abortController.signal
            );

            if (abortController.signal.aborted) {
                setError("Backtest cancelled");
                setIsRunning(false);
                return;
            }

            setResult(result);
            setIsRunning(false);
        } catch (err) {
            if (
                abortController.signal.aborted ||
                (err instanceof Error && err.name === "AbortError")
            ) {
                setError("Backtest cancelled");
            } else {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Unknown error occurred"
                );
            }
            setIsRunning(false);
        } finally {
            abortControllerRef.current = null;
        }
    };

    const runCloudBacktest = (config: BacktestConfig): Promise<void> => {
        return new Promise((resolve, reject) => {
            const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
            if (!wsUrl) {
                reject(new Error("NEXT_PUBLIC_WS_URL not configured"));
                return;
            }

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                ws.send(
                    JSON.stringify({
                        type: "start_backtest",
                        mode: "cloud",
                        config,
                    })
                );
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === "progress") {
                        setProgress(data as BacktestProgressEvent);
                    } else if (data.type === "result") {
                        setResult(data as BacktestResult);
                        setIsRunning(false);
                        ws.close();
                        resolve();
                    } else if (data.type === "error") {
                        setError(data.error || "Unknown error");
                        setIsRunning(false);
                        ws.close();
                        reject(new Error(data.error));
                    } else if (data.type === "cancelled") {
                        setError("Backtest cancelled");
                        setIsRunning(false);
                        ws.close();
                        // reject(new Error("Backtest cancelled"));
                    }
                } catch {
                    // Skip malformed messages
                }
            };

            ws.onerror = () => {
                setError("WebSocket connection error");
                setIsRunning(false);
                reject(new Error("WebSocket connection error"));
            };

            ws.onclose = () => {
                wsRef.current = null;
            };
        });
    };

    const cancel = useCallback(() => {
        if (wsRef.current) {
            // Send cancel message for cloud backtest
            try {
                wsRef.current.send(JSON.stringify({ type: "cancel_backtest" }));
            } catch {
                // Ignore errors
            }
            wsRef.current.close();
            wsRef.current = null;
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        if (readerRef.current) {
            readerRef.current.cancel();
            readerRef.current = null;
        }

        setIsRunning(false);
        setError("Backtest cancelled");
    }, []);

    const reset = useCallback(() => {
        cancel();
        setProgress(null);
        setResult(null);
        setError(null);
        setCurrentConfig(null);
    }, [cancel]);

    return {
        isRunning,
        progress,
        result,
        error,
        currentConfig,
        runBacktest,
        cancel,
        reset,
    };
}
