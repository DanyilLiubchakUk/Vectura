"use client";

import { useRef, memo, useState, useEffect } from "react";
import { useChartSeries } from "@/hooks/use-chart-series";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { useChart } from "@/hooks/use-chart";
import { cn } from "@/lib/utils";
import type { ChartControlsState } from "@/components/backtest/chart-controls";
import type { PricePoint, ExecutionLine } from "@/backtest/types";

function BacktestPriceChartComponent({
    priceData,
    equityData,
    cashData,
    executions,
    controlsState,
    onReady,
}: {
    priceData: PricePoint[];
    equityData?: PricePoint[];
    cashData?: PricePoint[];
    executions: ExecutionLine[];
    controlsState: ChartControlsState;
    onReady?: () => void;
}) {
    const [isReady, setIsReady] = useState(false);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const themeColors = useChartTheme();
    const chartRef = useChart({ containerRef: chartContainerRef, themeColors });
    const hasCalledReady = useRef(false);

    const handleChartReady = () => {
        if (!hasCalledReady.current) {
            hasCalledReady.current = true;
            setIsReady(true);
            if (onReady) {
                onReady();
            }
        }
    };

    // Reset ready state when data changes (new backtest)
    useEffect(() => {
        setIsReady(false);
        hasCalledReady.current = false;
    }, [priceData]);

    useChartSeries({
        chartRef,
        priceData,
        equityData,
        cashData,
        executions,
        controlsState,
        themeColors,
        onReady: handleChartReady,
    });

    return (
        <div className="w-full h-full relative">
            <div
                ref={chartContainerRef}
                className={cn(
                    "w-full h-full [&_#tv-attr-logo]:hidden transition-opacity duration-200",
                    isReady ? "opacity-100" : "opacity-0"
                )}
            />
        </div>
    );
}

// Memoize component to prevent unnecessary re-renders when parent re-renders
export const BacktestPriceChart = memo(BacktestPriceChartComponent, (prevProps, nextProps) => {
    // Custom comparison function for better performance
    if (prevProps.priceData !== nextProps.priceData) return false;
    if (prevProps.equityData !== nextProps.equityData) return false;
    if (prevProps.cashData !== nextProps.cashData) return false;
    if (prevProps.executions !== nextProps.executions) return false;
    if (
        prevProps.controlsState.showEquity !== nextProps.controlsState.showEquity ||
        prevProps.controlsState.showCash !== nextProps.controlsState.showCash ||
        prevProps.controlsState.executedBuy !== nextProps.controlsState.executedBuy ||
        prevProps.controlsState.executedSell !== nextProps.controlsState.executedSell ||
        prevProps.controlsState.unexecutedBuy !== nextProps.controlsState.unexecutedBuy ||
        prevProps.controlsState.unexecutedSell !== nextProps.controlsState.unexecutedSell
    ) {
        return false;
    }
    return true;
});
