"use client";

import { useBacktestRunsStore } from "@/stores/backtest-runs-store";
import { useBacktestRun } from "@/hooks/use-backtest-run";
import { useEffect, useRef } from "react";
import type { BacktestFormValues } from "@/components/backtest/schema";

export function BacktestRunExecutor() {
    const runs = useBacktestRunsStore((state) => state.runs);

    return (
        <>
            {runs.map((run) => (
                <BacktestRunExecutorItem key={run.id} runId={run.id} />
            ))}
        </>
    );
}

function BacktestRunExecutorItem({ runId }: { runId: string }) {
    const { run, runBacktest } = useBacktestRun(runId);
    const updateRun = useBacktestRunsStore((state) => state.updateRun);
    const hasStartedRef = useRef(false);

    useEffect(() => {
        if (
            !run ||
            run.status !== "running" ||
            run.progress !== null ||
            hasStartedRef.current
        ) {
            return;
        }

        hasStartedRef.current = true;

        // Convert config to form values
        const formValues: BacktestFormValues = {
            name: run.name,
            executionMode: run.config.executionMode,
            stock: run.config.stock,
            startDate: run.config.startDate,
            endDate: run.config.endDate,
            startCapital: run.config.startCapital,
            contributionFrequencyDays: run.config.contributionFrequencyDays,
            contributionAmount: run.config.contributionAmount,
            capitalPct: run.config.capitalPct,
            buyBelowPct: run.config.buyBelowPct,
            sellAbovePct: run.config.sellAbovePct,
            buyAfterSellPct: run.config.buyAfterSellPct,
            cashFloor: run.config.cashFloor,
            orderGapFilterEnabled: run.config.orderGapFilterEnabled,
            orderGapPct: run.config.orderGapPct,
        };

        // Start the backtest
        runBacktest(formValues).catch((error) => {
            updateRun(runId, {
                status: "error",
                error: error instanceof Error ? error.message : "Unknown error",
            });
        });
    }, [run, runId, runBacktest, updateRun]);

    useEffect(() => {
        if (run?.status !== "running") {
            hasStartedRef.current = false;
        }
    }, [run?.status]);

    return null;
}
