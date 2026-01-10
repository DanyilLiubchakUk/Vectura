import { create } from "zustand";
import type {
    BacktestConfig,
    BacktestProgressEvent,
    BacktestResult,
} from "@/backtest/types";

export type BacktestRunStatus = "running" | "completed" | "error" | "cancelled";

export interface BacktestRun {
    id: string;
    name: string;
    status: BacktestRunStatus;
    config: BacktestConfig;
    progress: BacktestProgressEvent | null;
    result: BacktestResult | null;
    error: string | null;
    createdAt: string;
    abortController?: AbortController;
    wsRef?: WebSocket | null;
    readerRef?: ReadableStreamDefaultReader<Uint8Array> | null;
}

interface BacktestRunsStore {
    runs: BacktestRun[];
    addRun: (name: string, config: BacktestConfig) => string;
    updateRun: (
        id: string,
        updates: Partial<Omit<BacktestRun, "id" | "createdAt">>
    ) => void;
    cancelRun: (id: string) => void;
    removeRun: (id: string) => void;
    getRun: (id: string) => BacktestRun | undefined;
}

export const useBacktestRunsStore = create<BacktestRunsStore>((set, get) => ({
    runs: [],
    addRun: (name, config) => {
        const id = `backtest-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`;
        const newRun: BacktestRun = {
            id,
            name,
            status: "running",
            config,
            progress: null,
            result: null,
            error: null,
            createdAt: new Date().toISOString(),
        };
        set((state) => ({
            runs: [newRun, ...state.runs], // Add to top (most recent first)
        }));
        return id;
    },
    updateRun: (id, updates) => {
        set((state) => ({
            runs: state.runs.map((run) =>
                run.id === id ? { ...run, ...updates } : run
            ),
        }));
    },
    cancelRun: (id) => {
        const run = get().runs.find((r) => r.id === id);
        if (run) {
            // Cancel WebSocket if exists
            if (run.wsRef) {
                try {
                    run.wsRef.send(JSON.stringify({ type: "cancel_backtest" }));
                } catch {
                    // Ignore errors
                }
                run.wsRef.close();
            }
            // Cancel AbortController if exists
            if (run.abortController) {
                run.abortController.abort();
            }
            // Cancel reader if exists
            if (run.readerRef) {
                run.readerRef.cancel();
            }
            get().updateRun(id, {
                status: "cancelled",
                error: "Backtest cancelled",
            });
        }
    },
    removeRun: (id) => {
        // Cancel the run first if it's running
        const run = get().runs.find((r) => r.id === id);
        if (run && run.status === "running") {
            get().cancelRun(id);
        }
        // Then remove it from the list
        set((state) => ({
            runs: state.runs.filter((run) => run.id !== id),
        }));
    },
    getRun: (id) => {
        return get().runs.find((run) => run.id === id);
    },
}));
