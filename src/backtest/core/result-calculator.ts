import { formatExecutionTime } from "@/backtest/storage/dateUtils";
import { backtestStore } from "@/utils/zustand/backtestStore";
import type { BacktestConfig, BacktestResult } from "@/backtest/types";

export async function calculateBacktestResult(
    config: BacktestConfig,
    processedBars: number,
    engineStartTime: Date
): Promise<BacktestResult> {
    const engineEndTime = new Date();
    const diffMs = engineEndTime.getTime() - engineStartTime.getTime();
    const executionTime = formatExecutionTime(diffMs);

    const state = backtestStore.getState();
    const finalEquity = state.capital?.equity || config.startCapital;
    const totalReturn = finalEquity - config.startCapital;
    const totalReturnPercent =
        config.startCapital > 0 ? (totalReturn / config.startCapital) * 100 : 0;

    return {
        stock: config.stock,
        startDate: config.startDate,
        endDate: config.endDate,
        startCapital: config.startCapital,
        finalEquity,
        totalReturn,
        totalReturnPercent,
        processedBars,
        executionTime,
    };
}
