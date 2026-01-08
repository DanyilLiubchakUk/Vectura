"use client";

import { useChartSeries } from "@/hooks/use-chart-series";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { useChart } from "@/hooks/use-chart";
import { useRef } from "react";
import type { ChartControlsState } from "@/components/backtest/chart-controls";
import type { PricePoint, ExecutionLine } from "@/backtest/types";

export function BacktestPriceChart({
    priceData,
    equityData,
    cashData,
    executions,
    controlsState,
}: {
    priceData: PricePoint[];
    equityData?: PricePoint[];
    cashData?: PricePoint[];
    executions: ExecutionLine[];
    controlsState: ChartControlsState;
}) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const themeColors = useChartTheme();
    const chartRef = useChart({ containerRef: chartContainerRef, themeColors });

    useChartSeries({
        chartRef,
        priceData,
        equityData,
        cashData,
        executions,
        controlsState,
        themeColors,
    });

    return (
        <div className="w-full h-full">
            <div
                ref={chartContainerRef}
                className="w-full h-full [&_#tv-attr-logo]:hidden"
            />
        </div>
    );
}
