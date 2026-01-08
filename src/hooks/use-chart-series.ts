import { createExecutionSeries } from "@/utils/backtest/execution-series";
import { convertToChartTime } from "@/utils/backtest/chart-time";
import { useEffect, useRef, useMemo } from "react";
import { LineSeries } from "lightweight-charts";
import type { ChartControlsState } from "@/components/backtest/chart-controls";
import type { ChartThemeColors } from "@/utils/backtest/chart-colors";
import type { PricePoint, ExecutionLine } from "@/backtest/types";
import type { IChartApi, ISeriesApi } from "lightweight-charts";
import type React from "react";

const convertToChartData = (data: PricePoint[]) =>
    data.map((point) => ({
        time: convertToChartTime(point.time),
        value: point.value,
    }));

const shouldShowExecution = (
    execution: ExecutionLine,
    controlsState: ChartControlsState
): boolean => {
    if (execution.executed) {
        return execution.type === "buy"
            ? controlsState.executedBuy
            : controlsState.executedSell;
    }
    return execution.type === "buy"
        ? controlsState.unexecutedBuy
        : controlsState.unexecutedSell;
};

export function useChartSeries({
    chartRef,
    priceData,
    equityData,
    cashData,
    executions,
    controlsState,
    themeColors,
}: {
    chartRef: React.RefObject<IChartApi | null>;
    priceData: PricePoint[];
    equityData?: PricePoint[];
    cashData?: PricePoint[];
    executions: ExecutionLine[];
    controlsState: ChartControlsState;
    themeColors: ChartThemeColors;
}) {
    const priceSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const equitySeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const cashSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const executionSeriesRefs = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
    const renderedExecutionIdsRef = useRef<Set<string>>(new Set());
    const themeColorsRef = useRef<ChartThemeColors>(themeColors);
    const controlsStateRef = useRef<ChartControlsState>(controlsState);

    // Keep refs in sync with latest values
    useEffect(() => {
        themeColorsRef.current = themeColors;
    }, [themeColors]);

    useEffect(() => {
        controlsStateRef.current = controlsState;
    }, [controlsState]);

    // Memoize chart data conversions
    const priceChartData = useMemo(() => (priceData.length > 0 ? convertToChartData(priceData) : []),
        [priceData]);
    const equityChartData = useMemo(() => (equityData && equityData.length > 0 ? convertToChartData(equityData) : null),
        [equityData]);
    const cashChartData = useMemo(() => (cashData && cashData.length > 0 ? convertToChartData(cashData) : null),
        [cashData]);

    // Initialize chart series (runs once when chart is available)
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        // Create price series
        const priceSeries = chart.addSeries(LineSeries, {
            color: themeColorsRef.current.priceLine,
            lineWidth: 2,
            priceFormat: {
                type: "price",
                precision: 2,
                minMove: 0.01,
            },
        }) as ISeriesApi<"Line">;
        priceSeriesRef.current = priceSeries;

        // Create equity series on left price scale
        const equitySeries = chart.addSeries(LineSeries, {
            color: themeColorsRef.current.equityLine,
            lineWidth: 2,
            priceScaleId: "left",
            priceFormat: {
                type: "price",
                precision: 2,
                minMove: 0.01,
            },
        }) as ISeriesApi<"Line">;
        equitySeriesRef.current = equitySeries;

        // Create cash series on left price scale
        const cashSeries = chart.addSeries(LineSeries, {
            color: themeColorsRef.current.cashLine,
            lineWidth: 2,
            priceScaleId: "left",
            priceFormat: {
                type: "price",
                precision: 2,
                minMove: 0.01,
            },
        }) as ISeriesApi<"Line">;
        cashSeriesRef.current = cashSeries;

        chart.timeScale().fitContent();

        return () => {
            // Cleanup: remove all execution series and clear refs
            executionSeriesRefs.current.forEach((series) => {
                try {
                    chart.removeSeries(series);
                } catch (error) {
                    console.warn("Failed to remove execution series during cleanup:", error);
                }
            });
            executionSeriesRefs.current.clear();
            renderedExecutionIdsRef.current.clear();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chartRef]);

    // Update price data
    useEffect(() => {
        const priceSeries = priceSeriesRef.current;
        if (!priceSeries || priceChartData.length === 0) return;
        priceSeries.setData(priceChartData);
    }, [priceChartData]);

    // Update equity data
    useEffect(() => {
        const equitySeries = equitySeriesRef.current;
        if (!equitySeries) return;
        if (equityChartData && equityChartData.length > 0) {
            equitySeries.setData(equityChartData);
        }
    }, [equityChartData]);

    // Update cash data
    useEffect(() => {
        const cashSeries = cashSeriesRef.current;
        if (!cashSeries) return;
        if (cashChartData && cashChartData.length > 0) {
            cashSeries.setData(cashChartData);
        }
    }, [cashChartData]);

    // Update theme colors for all series
    useEffect(() => {
        const priceSeries = priceSeriesRef.current;
        if (priceSeries) {
            priceSeries.applyOptions({ color: themeColors.priceLine });
        }

        const equitySeries = equitySeriesRef.current;
        if (equitySeries) {
            equitySeries.applyOptions({ color: themeColors.equityLine });
        }

        const cashSeries = cashSeriesRef.current;
        if (cashSeries) {
            cashSeries.applyOptions({ color: themeColors.cashLine });
        }

        // Update execution series colors
        executionSeriesRefs.current.forEach((series, id) => {
            const execution = executions.find((e) => e.id === id);
            if (!execution) return;
            const color = execution.type === "buy" ? themeColors.buyLine : themeColors.sellLine;
            series.applyOptions({ color });
        });
    }, [themeColors, executions]);

    // Manage execution series (create/remove)
    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || priceChartData.length === 0) return;

        const maxTime = priceChartData[priceChartData.length - 1]?.time;
        if (!maxTime) return;

        const currentIds = new Set(executions.map((e) => e.id));
        const renderedIds = renderedExecutionIdsRef.current;

        // Remove series for executions that no longer exist
        Array.from(renderedIds).forEach((id) => {
            if (!currentIds.has(id)) {
                const series = executionSeriesRefs.current.get(id);
                if (series) {
                    try {
                        chart.removeSeries(series);
                    } catch (error) {
                        console.warn("Failed to remove execution series:", error);
                    }
                }
                executionSeriesRefs.current.delete(id);
                renderedIds.delete(id);
            }
        });

        // Create series for new executions
        executions.forEach((execution) => {
            if (!renderedIds.has(execution.id)) {
                const series = createExecutionSeries({
                    execution,
                    chart,
                    maxTime,
                    themeColors: themeColorsRef.current,
                });
                if (series) {
                    executionSeriesRefs.current.set(execution.id, series);
                    renderedIds.add(execution.id);
                    // Set initial visibility
                    series.applyOptions({
                        visible: shouldShowExecution(execution, controlsStateRef.current),
                    });
                }
            }
        });
    }, [chartRef, executions, priceChartData]);

    // Update execution series visibility
    useEffect(() => {
        executions.forEach((execution) => {
            const series = executionSeriesRefs.current.get(execution.id);
            if (!series) return;
            series.applyOptions({
                visible: shouldShowExecution(execution, controlsState),
            });
        });
    }, [executions, controlsState]);

    // Update equity and cash visibility
    useEffect(() => {
        const equitySeries = equitySeriesRef.current;
        if (equitySeries) {
            equitySeries.applyOptions({
                visible: controlsState.showEquity && !!equityChartData && equityChartData.length > 0,
            });
        }

        const cashSeries = cashSeriesRef.current;
        if (cashSeries) {
            cashSeries.applyOptions({
                visible: controlsState.showCash && !!cashChartData && cashChartData.length > 0,
            });
        }
    }, [controlsState.showEquity, controlsState.showCash, equityChartData, cashChartData]);

    return {
        priceSeriesRef,
        equitySeriesRef,
        cashSeriesRef,
        executionSeriesRefs,
    };
}
