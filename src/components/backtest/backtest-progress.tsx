"use client";

import { useBacktestProgressStages } from "@/hooks/use-backtest-progress-stages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import type { BacktestProgressEvent } from "@/backtest/types";

export function BacktestProgress({
    progress,
    connectingToServer = false,
}: {
    progress: BacktestProgressEvent | null;
    connectingToServer?: boolean;
}) {
    const { stages, hasStages } = useBacktestProgressStages(progress);

    if (connectingToServer) {
        return (
            <Card className="mt-4">
                <CardHeader>
                    <CardTitle className="text-lg">Backtest Progress</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 rounded-lg p-3 bg-primary/5 border border-primary/20">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-primary">
                                Connecting to execution server...
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Starting the cloud backtest. This may take up to a
                                minute—please wait.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!hasStages) {
        return null;
    }

    return (
        <Card className="mt-4">
            <CardHeader>
                <CardTitle className="text-lg">Backtest Progress</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {stages.map((stage, index) => (
                        <div
                            key={stage.id}
                            className={cn(
                                "flex items-center gap-4 rounded-lg p-3 transition-colors",
                                stage.isActive
                                    ? "bg-primary/5 border border-primary/20"
                                    : "bg-muted/30"
                            )}
                        >
                            <div className="flex-1 min-w-0">
                                <p
                                    className={cn(
                                        "text-sm font-medium",
                                        stage.isActive && "text-primary"
                                    )}
                                >
                                    {stage.label}
                                </p>
                                {stage.message && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {stage.message}
                                    </p>
                                )}
                            </div>
                            {stage.isActive && (
                                <div className="flex items-center gap-2 min-w-[120px]">
                                    <div className="flex-1">
                                        <Progress value={stage.progress} />
                                    </div>
                                    <span className="text-xs text-muted-foreground min-w-[35px] text-right">
                                        {stage.progress}%
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
