import { useBacktestRunsStore } from "@/stores/backtest-runs-store";
import { useCallback } from "react";
import type { BacktestFormValues } from "@/components/backtest/schema";
import type { BacktestConfig } from "@/backtest/types";

export function useBacktestRunner() {
    const addRun = useBacktestRunsStore((state) => state.addRun);

    const startBacktest = useCallback(
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
                    : values.orderGapPct,
            };

            const runId = addRun(values.name || "Untitled Backtest", config);

            // For now, we'll use a simpler approach - the component will handle running
            return runId;
        },
        [addRun]
    );

    return { startBacktest };
}
