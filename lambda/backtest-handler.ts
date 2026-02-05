import { runBacktestCore } from "@/backtest/core/engine";
import type { BacktestConfig, BacktestProgressEvent } from "@/backtest/types";

const callbackSecret = process.env.CALLBACK_SECRET || "";

let sendChain: Promise<void> = Promise.resolve();

async function postCallback(
    backtestId: string,
    callbackUrl: string | undefined,
    payload: Record<string, unknown>
): Promise<void> {
    if (!callbackUrl || !callbackSecret) return;
    const body = JSON.stringify({ ...payload, jobId: backtestId });
    const prev = sendChain;
    sendChain = prev.then(async () => {
        try {
            const res = await fetch(callbackUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Lambda-Secret": callbackSecret,
                },
                body,
            });
            if (!res.ok) {
                console.error("[Lambda] callback POST failed", res.status);
            }
        } catch (e) {
            console.error("[Lambda] callback POST error:", e);
        }
    });
    await sendChain;
}

const CHUNK_SIZE = 800;
const EXEC_CHUNK_SIZE = 200;
const MAX_CHUNK_BYTES = 100 * 1024;
const MAX_MESSAGE_SIZE = 100 * 1024;

async function postResultChunked(
    backtestId: string,
    callbackUrl: string | undefined,
    result: Record<string, unknown>
): Promise<void> {
    if (!callbackUrl || !callbackSecret) return;
    const resultData = { type: "result" as const, ...result };
    const resultSize = JSON.stringify(resultData).length;
    const chartData = result.chartData as Record<string, unknown> | undefined;
    const hasChartData = chartData && typeof chartData === "object";

    if (!hasChartData && resultSize <= MAX_MESSAGE_SIZE) {
        await postCallback(backtestId, callbackUrl, resultData);
        await postCallback(backtestId, callbackUrl, { type: "result_complete" });
        return;
    }

    const { chartData: _cd, ...resultWithoutChart } = result;
    await postCallback(backtestId, callbackUrl, { type: "result", ...resultWithoutChart });

    if (chartData && typeof chartData === "object") {
        const priceData = (chartData.priceData as unknown[]) || [];
        const equityData = (chartData.equityData as unknown[]) || [];
        const cashData = (chartData.cashData as unknown[]) || [];
        const executions = (chartData.executions as unknown[]) || [];

        for (let i = 0; i < priceData.length; i += CHUNK_SIZE) {
            await postCallback(backtestId, callbackUrl, {
                type: "result_chunk",
                dataType: "priceData",
                chunkIndex: Math.floor(i / CHUNK_SIZE),
                totalChunks: Math.ceil(priceData.length / CHUNK_SIZE),
                chartData: { priceData: priceData.slice(i, i + CHUNK_SIZE) },
            });
        }
        for (let i = 0; i < equityData.length; i += CHUNK_SIZE) {
            await postCallback(backtestId, callbackUrl, {
                type: "result_chunk",
                dataType: "equityData",
                chunkIndex: Math.floor(i / CHUNK_SIZE),
                totalChunks: Math.ceil(equityData.length / CHUNK_SIZE),
                chartData: { equityData: equityData.slice(i, i + CHUNK_SIZE) },
            });
        }
        for (let i = 0; i < cashData.length; i += CHUNK_SIZE) {
            await postCallback(backtestId, callbackUrl, {
                type: "result_chunk",
                dataType: "cashData",
                chunkIndex: Math.floor(i / CHUNK_SIZE),
                totalChunks: Math.ceil(cashData.length / CHUNK_SIZE),
                chartData: { cashData: cashData.slice(i, i + CHUNK_SIZE) },
            });
        }
        for (let i = 0; i < executions.length; i += EXEC_CHUNK_SIZE) {
            const chunk = executions.slice(i, i + EXEC_CHUNK_SIZE);
            let payload: Record<string, unknown> = {
                type: "result_chunk",
                dataType: "executions",
                chunkIndex: Math.floor(i / EXEC_CHUNK_SIZE),
                totalChunks: Math.ceil(executions.length / EXEC_CHUNK_SIZE),
                chartData: { executions: chunk },
            };
            if (JSON.stringify(payload).length > MAX_CHUNK_BYTES) {
                const safeChunk = executions.slice(i, i + 50);
                payload = {
                    type: "result_chunk",
                    dataType: "executions",
                    chunkIndex: Math.floor(i / 50),
                    totalChunks: Math.ceil(executions.length / 50),
                    chartData: { executions: safeChunk },
                };
                i += 50 - EXEC_CHUNK_SIZE;
            }
            await postCallback(backtestId, callbackUrl, payload);
        }
    }
    await postCallback(backtestId, callbackUrl, { type: "result_complete" });
}

export interface DirectInvokeEvent {
    jobId?: string;
    backtestId?: string;
    config: BacktestConfig;
    callbackUrl?: string;
    cancelCheckUrl?: string;
}

export interface DirectInvokeResult {
    backtestId: string;
    status: "done" | "error";
    result?: unknown;
    error?: string;
}

export async function handler(event: DirectInvokeEvent): Promise<DirectInvokeResult> {
    const backtestId = event.jobId ?? event.backtestId;
    const { config, callbackUrl, cancelCheckUrl } = event;

    if (!backtestId || !config) {
        return {
            backtestId: backtestId || "unknown",
            status: "error",
            error: "Missing backtestId or config",
        };
    }

    const abortController = new AbortController();
    const LAMBDA_MAX_MS = 14.75 * 60 * 1000;
    let timedOut = false;
    const timeoutId = setTimeout(() => {
        timedOut = true;
        abortController.abort();
    }, LAMBDA_MAX_MS);

    const checkCancelRequested = async (): Promise<boolean> => {
        if (!cancelCheckUrl || !callbackSecret) return false;
        try {
            const res = await fetch(`${cancelCheckUrl}?jobId=${backtestId}`, {
                headers: { "X-Lambda-Secret": callbackSecret },
            });
            if (!res.ok) return false;
            const data = (await res.json()) as { cancelRequested?: boolean };
            return !!data.cancelRequested;
        } catch {
            return false;
        }
    };

    const onProgress = async (evt: BacktestProgressEvent) => {
        if (abortController.signal.aborted) return;
        const cancelled = await checkCancelRequested();
        if (cancelled) {
            abortController.abort();
            return;
        }
        try {
            await postCallback(backtestId, callbackUrl, { type: "progress", ...evt });
        } catch { }
    };

    try {
        const result = await runBacktestCore(
            config,
            onProgress,
            abortController.signal
        );

        clearTimeout(timeoutId);
        if (abortController.signal.aborted) {
            if (timedOut) {
                const msg = "Backtest exceeded 15 minute limit. Please use a shorter date range.";
                await postCallback(backtestId, callbackUrl, { type: "error", error: msg });
            } else {
                await postCallback(backtestId, callbackUrl, { type: "cancelled" });
            }
            return { backtestId, status: "done" };
        }

        await postResultChunked(backtestId, callbackUrl, result);
        await postCallback(backtestId, callbackUrl, { type: "done" });

        return { backtestId, status: "done", result };
    } catch (err) {
        clearTimeout(timeoutId);
        const errMsg =
            timedOut
                ? "Backtest exceeded 15 minute limit. Please use a shorter date range."
                : err instanceof Error ? err.message : String(err);

        if (
            abortController.signal.aborted ||
            (err instanceof Error && err.message === "Backtest cancelled")
        ) {
            if (timedOut) {
                await postCallback(backtestId, callbackUrl, { type: "error", error: errMsg });
            } else {
                await postCallback(backtestId, callbackUrl, { type: "cancelled" });
            }
            return { backtestId, status: "done" };
        }

        await postCallback(backtestId, callbackUrl, { type: "error", error: errMsg });

        return { backtestId, status: "error", error: errMsg };
    }
}
