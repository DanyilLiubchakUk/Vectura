"use client";

import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { ChartControls, type ChartControlsState } from "@/components/backtest/chart-controls";
import { BacktestPriceChart } from "@/components/backtest/backtest-price-chart";
import { MetricTableRow } from "@/components/backtest/metric-table-row";
import { useChartControlsStore } from "@/stores/chart-controls-store";
import { MEDIA_QUERY_BREAKPOINTS } from "@/constants/media-queries";
import { useElementWidth } from "@/hooks/use-element-width";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useElementSize } from "@/hooks/use-element-size";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Maximize2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import type { BacktestResult } from "@/backtest/types";

function formatCurrency(num: number) {
    return num.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

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

    const chartContainerRef = useRef<HTMLDivElement>(null);
    const scaleWidth = useElementWidth(chartContainerRef, "table tr:first-child td:first-child");

    const metrics = result.metrics;
    const cardRef = useRef<HTMLDivElement>(null);

    const groupsLayoutClasses = useElementSize(cardRef, [
        {
            operator: "<",
            size: MEDIA_QUERY_BREAKPOINTS.MD,
            classes: "grid-cols-1",
        },
        {
            operator: ">=",
            size: MEDIA_QUERY_BREAKPOINTS.MD,
            classes: "grid-cols-2",
        },
        {
            operator: ">=",
            size: MEDIA_QUERY_BREAKPOINTS.LG,
            classes: "grid-cols-3",
        },
    ]);

    const group2SpanClasses = useElementSize(cardRef, [
        {
            operator: ">=",
            size: MEDIA_QUERY_BREAKPOINTS.MD,
            classes: "col-span-2",
        },
        {
            operator: ">=",
            size: MEDIA_QUERY_BREAKPOINTS.LG,
            classes: "col-span-1",
        },
    ]);

    const firstSeparatorClasses = useElementSize(cardRef, [
        {
            operator: "<",
            size: MEDIA_QUERY_BREAKPOINTS.MD,
            classes: 'horizontal'
        }
    ])

    const secondSeparatorClasses = useElementSize(cardRef, [
        {
            operator: "<",
            size: MEDIA_QUERY_BREAKPOINTS.LG,
            classes: 'horizontal'
        }
    ])

    return (
        <TooltipProvider>
            <Card className="mt-4">
                <CardContent className="space-y-6">
                    <div ref={cardRef} className={cn("grid gap-x-6 gap-y-3", groupsLayoutClasses)}>
                        <div className={cn("flex", firstSeparatorClasses !== "horizontal" ? "" : "flex-col")}>
                            <div className="space-y-1.5 flex-1">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                    Backtest Information
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full table-auto">
                                        <tbody>
                                            <MetricTableRow
                                                label="Stock"
                                                description="The stock symbol that was backtested."
                                                value={result.stock}
                                                containerRef={cardRef}
                                            />
                                            <MetricTableRow
                                                label="Execution Time"
                                                description="The total time taken to execute the backtest."
                                                value={result.executionTime}
                                                containerRef={cardRef}
                                            />
                                            <MetricTableRow
                                                label="Processed Bars"
                                                description="Total number of price bars processed during the backtest."
                                                value={result.processedBars.toLocaleString()}
                                                containerRef={cardRef}
                                            />
                                            {metrics && (
                                                <>
                                                    <MetricTableRow
                                                        label="Total Trades"
                                                        description="Total number of completed buy and sell executions during the backtest."
                                                        value={formatCurrency(metrics.totalTradesExecuted)}
                                                        containerRef={cardRef}
                                                    />
                                                    <MetricTableRow
                                                        label="Avg Trades/Month"
                                                        description="Average number of executed trades per month over the backtest period."
                                                        value={`${metrics.averageTradesPerMonth.toFixed(1)}/month`}
                                                        containerRef={cardRef}
                                                    />
                                                    <MetricTableRow
                                                        label="Longest Drawdown"
                                                        description="Longest continuous period where equity stayed below its previous peak."
                                                        value={`${metrics.longestDrawdownDurationDays.toFixed(0)} days`}
                                                        containerRef={cardRef}
                                                    />
                                                </>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <Separator orientation={firstSeparatorClasses !== "horizontal" ? "vertical" : "horizontal"} className={cn(firstSeparatorClasses !== "horizontal" ? "ml-6" : "mt-3")} />
                        </div>

                        {metrics && (
                            <div className="space-y-1.5 flex-1">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                    Performance & Risk
                                </h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <tbody>
                                            <MetricTableRow
                                                label="Total Return"
                                                description="The absolute dollar return and percentage return over the backtest period."
                                                value={
                                                    <div className="space-y-1">
                                                        <p className={result.totalReturn >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600/70 dark:text-red-500/70"}>
                                                            {result.totalReturn >= 0 ? "+" : "-"}${formatCurrency(Math.abs(result.totalReturn))}
                                                        </p>
                                                        <p className={cn("text-xs", result.totalReturn >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600/70 dark:text-red-500/70")}>
                                                            {result.totalReturn >= 0 ? "+" : "-"}{Math.abs(result.totalReturnPercent).toFixed(2)}%
                                                        </p>
                                                    </div>
                                                }
                                                containerRef={cardRef}
                                            />
                                            <MetricTableRow
                                                label="Buy & Hold"
                                                description="Difference between this strategy and buying and holding with the same contributions."
                                                value={
                                                    <div className="space-y-1">
                                                        <p className={metrics.buyHoldComparison.dollarDifference >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600/70 dark:text-red-500/70"}>
                                                            {metrics.buyHoldComparison.dollarDifference >= 0 ? "+" : ""}${formatCurrency(metrics.buyHoldComparison.dollarDifference)}
                                                        </p>
                                                        <p className={`text-xs ${metrics.buyHoldComparison.percentageDifference >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600/70 dark:text-red-500/70"}`}>
                                                            {metrics.buyHoldComparison.percentageDifference >= 0 ? "+" : ""}{metrics.buyHoldComparison.percentageDifference.toFixed(2)}%
                                                        </p>
                                                    </div>
                                                }
                                                containerRef={cardRef}
                                            />
                                            <MetricTableRow
                                                label="Max Drawdown"
                                                description="Largest loss from a historical equity peak to a subsequent trough."
                                                value={
                                                    <div className="space-y-1">
                                                        <p className="text-red-600/70 dark:text-red-500/70">
                                                            -${formatCurrency(metrics.maximumDrawdownDollar)}
                                                        </p>
                                                        <p className="text-xs text-red-600/70 dark:text-red-500/70">
                                                            -{metrics.maximumDrawdownPct.toFixed(2)}%
                                                        </p>
                                                    </div>
                                                }
                                                containerRef={cardRef}
                                            />
                                            <MetricTableRow
                                                label="Best/Worst Month"
                                                description="The percentage return achieved in any single calendar month."
                                                value={
                                                    <div className="space-y-1">
                                                        <p className={metrics.bestMonthReturnPct >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600/70 dark:text-red-500/70"}>
                                                            {metrics.bestMonthReturnPct.toFixed(2)}%
                                                        </p>
                                                        <p className={`text-xs ${metrics.worstMonthReturnPct >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600/70 dark:text-red-500/70"}`}>
                                                            {metrics.worstMonthReturnPct.toFixed(2)}%
                                                        </p>
                                                    </div>
                                                }
                                                containerRef={cardRef}
                                            />
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {metrics && (
                            <div className={cn("flex", group2SpanClasses, secondSeparatorClasses !== "horizontal" ? "" : "flex-col")}>
                                <Separator orientation={secondSeparatorClasses !== "horizontal" ? "vertical" : "horizontal"} className={cn(secondSeparatorClasses !== "horizontal" ? "mr-6" : "mb-3")} />
                                <div className="space-y-1.5">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                        Financial Metrics
                                    </h3>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <tbody>
                                                <MetricTableRow
                                                    label="Final Equity"
                                                    description="The total account equity at the end of the backtest."
                                                    value={`$${formatCurrency(result.finalEquity)}`}
                                                    containerRef={cardRef}
                                                    descriptionBreakpoint="MD"
                                                />
                                                <MetricTableRow
                                                    label="Maximum Equity"
                                                    description="Highest total account equity reached at any point during the backtest."
                                                    value={`$${formatCurrency(metrics.maximumEquity)}`}
                                                    containerRef={cardRef}
                                                    descriptionBreakpoint="MD"
                                                />
                                                <MetricTableRow
                                                    label="Invested Cash"
                                                    description="Initial capital plus all additional cash invested over time."
                                                    value={`$${formatCurrency(result.investedCash)}`}
                                                    containerRef={cardRef}
                                                    descriptionBreakpoint="MD"
                                                />
                                                <MetricTableRow
                                                    label="Avg Invested Capital"
                                                    description="Average percentage of total account equity that was invested over the entire backtest."
                                                    value={`${metrics.averageInvestedCapitalPct.toFixed(2)}%`}
                                                    containerRef={cardRef}
                                                    descriptionBreakpoint="MD"
                                                />
                                                <MetricTableRow
                                                    label="Return/Max DD Ratio"
                                                    description="Shows return earned per unit of drawdown; higher means better risk efficiency."
                                                    value={metrics.returnMaxDrawdownRatio.toFixed(2)}
                                                    containerRef={cardRef}
                                                    descriptionBreakpoint="MD"
                                                />
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
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
                        <div ref={chartContainerRef} className="h-[min(60dvh,max(400px,50dvh))] relative">
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="absolute top-2 z-10 transition-none"
                                        style={{ left: `${scaleWidth + 8}px` }}
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
                                                equityData={result.chartData.equityData}
                                                cashData={result.chartData.cashData}
                                                executions={result.chartData.executions}
                                                controlsState={controlsState}
                                            />
                                        </div>
                                    </div>
                                </DialogContent>
                            </Dialog>
                            <BacktestPriceChart
                                priceData={result.chartData.priceData}
                                equityData={result.chartData.equityData}
                                cashData={result.chartData.cashData}
                                executions={result.chartData.executions}
                                controlsState={controlsState}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}
        </TooltipProvider>
    );
}
