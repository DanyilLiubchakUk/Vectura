"use client";

import { createChart, IChartApi, ISeriesApi, LineSeries, LineStyle } from "lightweight-charts";
import { createExecutionSeries } from "@/utils/backtest/execution-series";
import { convertToChartTime } from "@/utils/backtest/chart-time";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { useEffect, useRef } from "react";
import type { PricePoint, ExecutionLine } from "@/backtest/types";


export function BacktestPriceChart({
    priceData,
    executions,
}: {
    priceData: PricePoint[];
    executions: ExecutionLine[];
}) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const executionSeriesRefs = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
    const renderedExecutionIdsRef = useRef<Set<string>>(new Set());
    const hiddenSeriesRef = useRef<Set<string>>(new Set());
    const themeColors = useChartTheme();

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const chart = createChart(chartContainerRef.current, {
            autoSize: true,
            layout: {
                background: { color: themeColors.background },
                textColor: themeColors.text,
            },
            grid: {
                vertLines: {
                    color: themeColors.grid,
                    style: LineStyle.Solid,
                },
                horzLines: {
                    color: themeColors.grid,
                    style: LineStyle.Solid,
                },
            },
            crosshair: {
                mode: 1,
            },
            rightPriceScale: {
                borderColor: themeColors.grid,
            },
            timeScale: {
                borderColor: themeColors.grid,
                timeVisible: true,
                secondsVisible: false,
            },
            handleScroll: {
            },
            handleScale: {
                axisPressedMouseMove: true,
                mouseWheel: true,
                pinch: true,
            },
        });

        chartRef.current = chart;

        // Create price line series
        const priceSeries = chart.addSeries(LineSeries, {
            color: themeColors.priceLine,
            lineWidth: 2,
            priceFormat: {
                type: "price",
                precision: 2,
                minMove: 0.01,
            },
        }) as ISeriesApi<"Line">;

        seriesRef.current = priceSeries;

        // Convert price data to chart format
        const chartData = priceData.map((point) => ({
            time: convertToChartTime(point.time),
            value: point.value,
        }));

        priceSeries.setData(chartData);
        chart.timeScale().fitContent();

        return () => {
            // Clear execution series refs before removing chart
            executionSeriesRefs.current.clear();
            renderedExecutionIdsRef.current.clear();
            hiddenSeriesRef.current.clear();
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
        };
    }, [themeColors]);

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
            },
            timeScale: {
                borderColor: themeColors.grid,
            },
        });

        if (seriesRef.current) {
            seriesRef.current.applyOptions({
                color: themeColors.priceLine,
            });
        }
    }, [themeColors]);

    // Update price data when it changes
    useEffect(() => {
        if (!seriesRef.current || priceData.length === 0) return;

        const chartData = priceData.map((point) => ({
            time: convertToChartTime(point.time),
            value: point.value,
        }));

        seriesRef.current.setData(chartData);
        
        if (chartRef.current && chartData.length > 0) {
            try {
                chartRef.current.timeScale().fitContent();
            } catch (error) {
                console.warn("Failed to fit content after price data update:", error);
            }
        }
    }, [priceData]);

    // Update execution lines with incremental updates
    useEffect(() => {
        if (!chartRef.current || priceData.length === 0) return;

        const chart = chartRef.current;
        const priceSeries = seriesRef.current;
        if (!priceSeries) return;

        // Get the time range from price data
        const priceTimes = priceData.map((p) => convertToChartTime(p.time));
        if (priceTimes.length === 0) return;

        const maxTime = priceTimes[priceTimes.length - 1];

        // Create execution series
        const createSeries = (execution: ExecutionLine): ISeriesApi<"Line"> | null => {
            return createExecutionSeries({
                execution,
                chart,
                maxTime,
                themeColors,
            });
        };

        // Get current execution IDs 
        const currentIds = new Set(executions.map(e => e.id));
        const renderedIds = renderedExecutionIdsRef.current;

        // Remove or hide series that are no longer needed
        const idsToRemove = Array.from(renderedIds).filter(id => !currentIds.has(id));
        idsToRemove.forEach(id => {
            const series = executionSeriesRefs.current.get(id);
            if (series) {
                if (hiddenSeriesRef.current.has(id)) {
                    try {
                        chart.removeSeries(series);
                    } catch (error) {
                        console.warn("Failed to remove execution series:", error);
                    }
                    executionSeriesRefs.current.delete(id);
                    hiddenSeriesRef.current.delete(id);
                } else {
                    try {
                        series.applyOptions({ lineVisible: false });
                        hiddenSeriesRef.current.add(id);
                    } catch (error) {
                        // If lineVisible doesn't work, remove it
                        try {
                            chart.removeSeries(series);
                            executionSeriesRefs.current.delete(id);
                        } catch (removeError) {
                            console.warn("Failed to remove execution series:", removeError);
                        }
                    }
                }
            }
            renderedIds.delete(id);
        });

        // Add or show series for new executions
        executions.forEach(execution => {
            if (!renderedIds.has(execution.id)) {
                // Create new series
                const series = createSeries(execution);
                if (series) {
                    executionSeriesRefs.current.set(execution.id, series);
                    renderedIds.add(execution.id);
                    hiddenSeriesRef.current.delete(execution.id);
                }
            } else {
                // Series should exist, check if it's actually there
                const series = executionSeriesRefs.current.get(execution.id);
                if (!series) {
                    // Series was removed but ID is still tracked, recreate it
                    const newSeries = createSeries(execution);
                    if (newSeries) {
                        executionSeriesRefs.current.set(execution.id, newSeries);
                        hiddenSeriesRef.current.delete(execution.id);
                    }
                } else if (hiddenSeriesRef.current.has(execution.id)) {
                    // Series exists but is hidden, show it
                    try {
                        series.applyOptions({ lineVisible: true });
                        hiddenSeriesRef.current.delete(execution.id);
                    } catch (error) {
                        // If showing doesn't work, recreate the series
                        try {
                            chart.removeSeries(series);
                            const newSeries = createSeries(execution);
                            if (newSeries) {
                                executionSeriesRefs.current.set(execution.id, newSeries);
                                hiddenSeriesRef.current.delete(execution.id);
                            }
                        } catch (recreateError) {
                            console.warn("Failed to recreate execution series:", recreateError);
                        }
                    }
                }
            }
        });

        if (chartRef.current && priceData.length > 0) {
            try {
                chartRef.current.timeScale().fitContent();
            } catch (error) {
                console.warn("Failed to fit content after execution update:", error);
            }
        }

        // If no executions, hide or remove all series
        if (executions.length === 0) {
            const idsToProcess = Array.from(renderedIds);
            idsToProcess.forEach(id => {
                const series = executionSeriesRefs.current.get(id);
                if (series) {
                    if (hiddenSeriesRef.current.has(id)) {
                        try {
                            chart.removeSeries(series);
                            executionSeriesRefs.current.delete(id);
                            hiddenSeriesRef.current.delete(id);
                        } catch (error) {
                            console.warn("Failed to remove execution series:", error);
                        }
                    } else {
                        try {
                            series.applyOptions({ lineVisible: false });
                            hiddenSeriesRef.current.add(id);
                        } catch (error) {
                            try {
                                chart.removeSeries(series);
                                executionSeriesRefs.current.delete(id);
                            } catch (removeError) {
                                console.warn("Failed to remove execution series:", removeError);
                            }
                        }
                    }
                }
            });
            renderedIds.clear();
            
            if (chartRef.current && priceData.length > 0) {
                try {
                    chartRef.current.timeScale().fitContent();
                } catch (error) {
                    console.warn("Failed to fit content after clearing executions:", error);
                }
            }
        }
    }, [executions, priceData, themeColors]);

    return (
        <div className="w-full h-full">
            <div
                ref={chartContainerRef}
                className="w-full h-full [&_#tv-attr-logo]:hidden"
            />
        </div>
    );
}
