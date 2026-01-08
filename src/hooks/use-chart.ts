import { createChart, LineStyle, type IChartApi } from "lightweight-charts";
import { useEffect, useRef } from "react";
import type { ChartThemeColors } from "@/utils/backtest/chart-colors";
import type React from "react";

/**
 * Hook that manages chart creation, initialization, and theme updates
 */
export function useChart({
    containerRef,
    themeColors,
}: {
    containerRef: React.RefObject<HTMLDivElement | null>;
    themeColors: ChartThemeColors;
}): React.RefObject<IChartApi | null> {
    const chartRef = useRef<IChartApi | null>(null);
    const themeColorsRef = useRef(themeColors);

    // Keep theme colors ref in sync
    useEffect(() => {
        themeColorsRef.current = themeColors;
    }, [themeColors]);

    // Create and initialize chart
    useEffect(() => {
        if (!containerRef.current) return;

        const chart = createChart(containerRef.current, {
            autoSize: true,
            layout: {
                background: { color: themeColorsRef.current.background },
                textColor: themeColorsRef.current.text,
            },
            grid: {
                vertLines: {
                    color: themeColorsRef.current.grid,
                    style: LineStyle.Solid,
                },
                horzLines: {
                    color: themeColorsRef.current.grid,
                    style: LineStyle.Solid,
                },
            },
            crosshair: {
                mode: 1,
            },
            rightPriceScale: {
                borderColor: themeColorsRef.current.grid,
                visible: true,
            },
            leftPriceScale: {
                borderColor: themeColorsRef.current.grid,
                visible: true,
            },
            timeScale: {
                borderColor: themeColorsRef.current.grid,
                timeVisible: true,
                secondsVisible: false,
            },
            handleScroll: {},
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true,
            },
        });

        chartRef.current = chart;

        return () => {
            chart.remove();
            chartRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerRef]);

    // Update chart theme when colors change
    useEffect(() => {
        if (!chartRef.current) return;

        chartRef.current.applyOptions({
            layout: {
                background: { color: themeColors.background },
                textColor: themeColors.text,
            },
            grid: {
                vertLines: { color: themeColors.grid },
                horzLines: { color: themeColors.grid },
            },
            rightPriceScale: {
                borderColor: themeColors.grid,
                visible: true,
            },
            leftPriceScale: {
                borderColor: themeColors.grid,
                visible: true,
            },
            timeScale: {
                borderColor: themeColors.grid,
            },
        });
    }, [themeColors]);

    return chartRef;
}
