"use client";

import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { ChartControls, type ChartControlsState } from "@/components/backtest/chart-controls";
import { BacktestPriceChart } from "@/components/backtest/backtest-price-chart";
import { useFilteredExecutions } from "@/hooks/use-filtered-executions";
import { useChartControlsStore } from "@/stores/chart-controls-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, X } from "lucide-react";
import type { BacktestResult } from "@/backtest/types";

export function BacktestResults({ result, runId }: {
    result: BacktestResult;
    runId: string;
}) {
    const controlsState = useChartControlsStore((state) =>
        state.getControls(runId)
    );
    const setControls = useChartControlsStore((state) => state.setControls);
    const setControlsState = (newState: ChartControlsState) => {
        setControls(runId, newState);
    };

    const filteredExecutions = useFilteredExecutions(
        result.chartData?.executions,
        controlsState
    );

    return (
        <>
            <Card>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Stock</p>
                            <p className="text-lg font-semibold">{result.stock}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Date Range
                            </p>
                            <p className="text-lg font-semibold">
                                {result.startDate} to {result.endDate}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Starting Capital
                            </p>
                            <p className="text-lg font-semibold">
                                ${result.startCapital.toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Final Equity
                            </p>
                            <p className="text-lg font-semibold">
                                ${result.finalEquity.toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Total Return
                            </p>
                            <p
                                className={`text-lg font-semibold ${result.totalReturn >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                    }`}
                            >
                                ${result.totalReturn.toLocaleString()} (
                                {result.totalReturnPercent.toFixed(2)}%)
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Execution Time
                            </p>
                            <p className="text-lg font-semibold">
                                {result.executionTime}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                Processed Bars
                            </p>
                            <p className="text-lg font-semibold">
                                {result.processedBars.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            {result.chartData && (
                <Card className="mt-4">
                    <CardContent className="space-y-4">
                        <ChartControls
                            state={controlsState}
                            onStateChange={setControlsState}
                        />
                        <div className="h-[min(60dvh,max(400px,50dvh))] relative">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="absolute left-2 top-2 z-10"
                                        aria-label="Open chart in fullscreen"
                                    >
                                        <Maximize2 className="h-4 w-4" />
                                    </Button>
                                </DialogTrigger>
                                <DialogContent
                                    className="min-w-full w-screen min-h-screen h-screen p-4 md:p-6 flex flex-col top-0! left-0! translate-x-0! translate-y-0! rounded-none! bg-card"
                                    showCloseButton={false}
                                >
                                    <DialogClose asChild>
                                        <Button
                                            variant="ghost"
                                            className="absolute top-4 right-4 z-50 h-12 w-12"
                                            size="icon"
                                        >
                                            <X className="h-8 w-8" />
                                            <span className="sr-only">Close</span>
                                        </Button>
                                    </DialogClose>
                                    <DialogTitle className="sr-only">Chart Fullscreen View</DialogTitle>
                                    <div className="flex-1 flex flex-col gap-4 overflow-hidden min-w-0">
                                        <ChartControls
                                            state={controlsState}
                                            onStateChange={setControlsState}
                                        />
                                        <div className="flex-1 min-h-0 w-full overflow-hidden">
                                            <BacktestPriceChart
                                                priceData={result.chartData.priceData}
                                                executions={filteredExecutions}
                                            />
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <BacktestPriceChart
                                priceData={result.chartData.priceData}
                                executions={filteredExecutions}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}
        </>
    );
}
