import type { ChartControlsState } from "@/components/backtest/chart-controls";
import type { ExecutionLine } from "@/backtest/types";

/**
 * Filters execution lines based on chart control state
 */
export function filterExecutions(
    executions: ExecutionLine[],
    executedBuy: boolean,
    executedSell: boolean,
    unexecutedBuy: boolean,
    unexecutedSell: boolean
): ExecutionLine[] {
    return executions.filter((exec) => {
        if (exec.executed) {
            if (exec.type === 'buy' && !executedBuy) return false;
            if (exec.type === 'sell' && !executedSell) return false;
            return true;
        }

        if (!exec.executed) {
            if (exec.type === 'buy' && !unexecutedBuy) return false;
            if (exec.type === 'sell' && !unexecutedSell) return false;
            return true;
        }

        return false;
    });
}

/**
 * Generates a cache key from chart controls state
 */
export function getFilterKey(state: ChartControlsState): string {
    return `${state.executedBuy ? 1 : 0},${state.executedSell ? 1 : 0},${state.unexecutedBuy ? 1 : 0},${state.unexecutedSell ? 1 : 0}`;
}
