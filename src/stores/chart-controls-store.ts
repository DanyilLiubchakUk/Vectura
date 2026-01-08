import { create } from "zustand";
import type { ChartControlsState } from "@/components/backtest/chart-controls";

const defaultControlsState: ChartControlsState = {
    executedBuy: true,
    executedSell: true,
    unexecutedBuy: false,
    unexecutedSell: false,
    showEquity: false,
    showCash: false,
};

interface ChartControlsStore {
    controlsByRunId: Record<string, ChartControlsState>;
    getControls: (runId: string) => ChartControlsState;
    setControls: (runId: string, state: ChartControlsState) => void;
}

export const useChartControlsStore = create<ChartControlsStore>((set, get) => ({
    controlsByRunId: {},
    getControls: (runId) => {
        return get().controlsByRunId[runId] || defaultControlsState;
    },
    setControls: (runId, state) => {
        set((store) => ({
            controlsByRunId: {
                ...store.controlsByRunId,
                [runId]: state,
            },
        }));
    },
}));
