"use client";

import { BacktestRunItem } from "@/components/backtest/backtest-run-item";
import { useBacktestRunsStore } from "@/stores/backtest-runs-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";

export function BacktestRunsList({
    onRunAdded,
}: {
    onRunAdded?: (runId: string) => void;
}) {
    const runs = useBacktestRunsStore((state) => state.runs);
    const [newestRunId, setNewestRunId] = useState<string | null>(null);

    useEffect(() => {
        if (runs.length > 0 && runs[0].id !== newestRunId) {
            setNewestRunId(runs[0].id);
            if (onRunAdded) {
                onRunAdded(runs[0].id);
            }
        }
    }, [runs, newestRunId, onRunAdded]);

    if (runs.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm p-4">
                Run a backtest to see progress and results here
            </div>
        );
    }

    return (
        <ScrollArea className="flex-1 h-full [&_>div>div]:block!">
            <div className="space-y-3 px-4 pb-4">
                {runs.map((run, index) => (
                    <BacktestRunItem
                        key={run.id}
                        runId={run.id}
                        defaultOpen={index === 0}
                    />
                ))}
            </div>
        </ScrollArea>
    );
}
