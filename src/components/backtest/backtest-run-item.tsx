"use client";

import {
    Loader2,
    ChevronDown,
    Cloud,
    ServerOff,
    Trash2,
    X,
} from "lucide-react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { BacktestConfigDisplay } from "@/components/backtest/backtest-config-display";
import { BacktestEditDialog } from "@/components/backtest/backtest-edit-dialog";
import { BacktestProgress } from "@/components/backtest/backtest-progress";
import { BacktestResults } from "@/components/backtest/backtest-results";
import { useBacktestRunsStore } from "@/stores/backtest-runs-store";
import { MEDIA_QUERY_BREAKPOINTS } from "@/constants/media-queries";
import { useBacktestRun } from "@/hooks/use-backtest-run";
import { useElementSize } from "@/hooks/use-element-size";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

export function BacktestRunItem({
    runId,
    defaultOpen = false,
}: {
    runId: string;
    defaultOpen?: boolean;
}) {
    const { run, cancel } = useBacktestRun(runId);
    const removeRun = useBacktestRunsStore((state) => state.removeRun);
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const containerRef = useRef<HTMLDivElement>(null);

    if (!run) {
        return null;
    }

    const isRunning = run.status === "running";
    const isCompleted = run.status === "completed";
    const isError = run.status === "error";
    const isCancelled = run.status === "cancelled";

    const ExecutionModeIcon =
        run.config.executionMode === "cloud" ? Cloud : ServerOff;

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        removeRun(runId);
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        cancel();
    };

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <div ref={containerRef}>
                <div className="flex items-center w-full p-4 border rounded-lg hover:bg-accent transition-colors">
                    <CollapsibleTrigger className="flex items-center gap-3 relative w-0 flex-1 min-w-0">
                        <ExecutionModeIcon
                            className={cn(
                                "h-5 w-5 text-muted-foreground shrink-0",
                                isRunning && "opacity-50"
                            )}
                        />
                        {isRunning && (
                            <Loader2 className="h-5 w-5 scale-75 shrink-0 animate-spin text-muted-foreground absolute opacity-75 left-0" />
                        )}
                        <div className="font-medium truncate min-w-0 flex-1 text-start">
                            {run.name}
                        </div>
                    </CollapsibleTrigger>
                    <div className="flex items-center gap-2">
                        <div
                            className="flex items-center gap-1"
                        >
                            <BacktestEditDialog runId={runId} />

                            {/* Cancel button - only show when running */}
                            {isRunning && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:text-muted-foreground"
                                    onClick={handleCancel}
                                    title="Cancel"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}

                            {/* Remove button */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive/70"
                                onClick={handleRemove}
                                title="Remove"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <CollapsibleTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                            >
                                <ChevronDown
                                    className={cn(
                                        "h-4 w-4 shrink-0 transition-transform",
                                        isOpen && "transform rotate-180"
                                    )}
                                />
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                </div>
            </div>
            <CollapsibleContent>
                <div className="p-2 space-y-4 border-x border-b rounded-b-lg">
                    {/* Configuration */}
                    <BacktestConfigDisplay config={run.config} />

                    {/* Error Display */}
                    {(isError || isCancelled) && run.error && (
                        <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
                            <p className="text-destructive text-sm">
                                {run.error}
                            </p>
                        </div>
                    )}

                    {/* Progress */}
                    {isRunning && (
                        <div className="space-y-2">
                            <BacktestProgress progress={run.progress} />
                        </div>
                    )}

                    {/* Results */}
                    {isCompleted && run.result && (
                        <BacktestResults result={run.result} runId={runId} />
                    )}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}
