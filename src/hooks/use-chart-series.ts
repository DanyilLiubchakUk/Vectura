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
    onReady,
}: {
    chartRef: React.RefObject<IChartApi | null>;
    priceData: PricePoint[];
    equityData?: PricePoint[];
    cashData?: PricePoint[];
    executions: ExecutionLine[];
    controlsState: ChartControlsState;
    themeColors: ChartThemeColors;
    onReady?: () => void;
}) {
    const priceSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const equitySeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const cashSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
    const executionSeriesRefs = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
    const renderedExecutionIdsRef = useRef<Set<string>>(new Set());
    const themeColorsRef = useRef<ChartThemeColors>(themeColors);
    const controlsStateRef = useRef<ChartControlsState>(controlsState);

    useEffect(() => {
        themeColorsRef.current = themeColors;
    }, [themeColors]);

    useEffect(() => {
        controlsStateRef.current = controlsState;
    }, [controlsState]);

    const priceChartData = useMemo(
        () => (priceData.length > 0 ? convertToChartData(priceData) : []),
        [priceData]
    );
    const equityChartData = useMemo(
        () => (equityData && equityData.length > 0 ? convertToChartData(equityData) : null),
        [equityData]
    );
    const cashChartData = useMemo(
        () => (cashData && cashData.length > 0 ? convertToChartData(cashData) : null),
        [cashData]
    );

    const priceFormat = {
        type: "price" as const,
        precision: 2,
        minMove: 0.01,
    };

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart) return;

        const priceSeries = chart.addSeries(LineSeries, {
            color: themeColorsRef.current.priceLine,
            lineWidth: 2,
            priceFormat,
        }) as ISeriesApi<"Line">;
        priceSeriesRef.current = priceSeries;

        const equitySeries = chart.addSeries(LineSeries, {
            color: themeColorsRef.current.equityLine,
            lineWidth: 2,
            priceScaleId: "left",
            priceFormat,
        }) as ISeriesApi<"Line">;
        equitySeriesRef.current = equitySeries;

        const cashSeries = chart.addSeries(LineSeries, {
            color: themeColorsRef.current.cashLine,
            lineWidth: 2,
            priceScaleId: "left",
            priceFormat,
        }) as ISeriesApi<"Line">;
        cashSeriesRef.current = cashSeries;

        chart.timeScale().fitContent();

        return () => {
            const chartForCleanup = chartRef.current;
            if (chartForCleanup) {
                executionSeriesRefs.current.forEach((series) => {
                    if (series) {
                        try {
                            chartForCleanup.removeSeries(series);
                        } catch {
                            // Chart may be destroyed
                        }
                    }
                });
            }
            executionSeriesRefs.current.clear();
            renderedExecutionIdsRef.current.clear();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chartRef]);

    useEffect(() => {
        const priceSeries = priceSeriesRef.current;
        if (!priceSeries || priceChartData.length === 0 || !chartRef.current) return;
        try {
            priceSeries.setData(priceChartData);
            requestAnimationFrame(() => {
                onReady?.();
            });
        } catch {
            // Chart may be destroyed
        }
    }, [priceChartData, chartRef, onReady]);

    useEffect(() => {
        const equitySeries = equitySeriesRef.current;
        if (!equitySeries || !chartRef.current || !equityChartData?.length) return;
        try {
            equitySeries.setData(equityChartData);
        } catch {
            // Chart may be destroyed
        }
    }, [equityChartData, chartRef]);

    useEffect(() => {
        const cashSeries = cashSeriesRef.current;
        if (!cashSeries || !chartRef.current || !cashChartData?.length) return;
        try {
            cashSeries.setData(cashChartData);
        } catch {
            // Chart may be destroyed
        }
    }, [cashChartData, chartRef]);

    useEffect(() => {
        if (!chartRef.current) return;

        try {
            priceSeriesRef.current?.applyOptions({ color: themeColors.priceLine });
            equitySeriesRef.current?.applyOptions({ color: themeColors.equityLine });
            cashSeriesRef.current?.applyOptions({ color: themeColors.cashLine });
        } catch {
            // Series may be invalid
        }

        executionSeriesRefs.current.forEach((series, id) => {
            if (!series) return;
            const execution = executions.find((e) => e.id === id);
            if (!execution) return;
            const color = execution.type === "buy" ? themeColors.buyLine : themeColors.sellLine;
            try {
                series.applyOptions({ color });
            } catch {
                // Series may be invalid
            }
        });
    }, [themeColors, executions, chartRef]);

    useEffect(() => {
        const chart = chartRef.current;
        if (!chart || priceChartData.length === 0) return;

        const maxTime = priceChartData[priceChartData.length - 1]?.time;
        if (!maxTime) return;

        const currentIds = new Set(executions.map((e) => e.id));
        const renderedIds = renderedExecutionIdsRef.current;

        const idsToRemove = Array.from(renderedIds).filter((id) => !currentIds.has(id));
        if (idsToRemove.length > 0 && chartRef.current) {
            idsToRemove.forEach((id) => {
                const series = executionSeriesRefs.current.get(id);
                if (series) {
                    try {
                        chartRef.current?.removeSeries(series);
                    } catch {
                        // Series may already be removed
                    }
                }
                executionSeriesRefs.current.delete(id);
                renderedIds.delete(id);
            });
        }

        const idsToCreate = executions.filter((execution) => !renderedIds.has(execution.id));
        idsToCreate.forEach((execution) => {
            const series = createExecutionSeries({
                execution,
                chart,
                maxTime,
                themeColors: themeColorsRef.current,
            });
            if (series) {
                executionSeriesRefs.current.set(execution.id, series);
                renderedIds.add(execution.id);
                series.applyOptions({
                    visible: shouldShowExecution(execution, controlsStateRef.current),
                });
            }
        });
    }, [chartRef, executions, priceChartData]);

    useEffect(() => {
        if (!chartRef.current) return;

        executions.forEach((execution) => {
            const series = executionSeriesRefs.current.get(execution.id);
            if (!series) return;
            try {
                series.applyOptions({
                    visible: shouldShowExecution(execution, controlsState),
                });
            } catch {
                // Series may be invalid
            }
        });
    }, [executions, controlsState, chartRef]);

    useEffect(() => {
        if (!chartRef.current) return;

        try {
            equitySeriesRef.current?.applyOptions({
                visible: controlsState.showEquity && !!equityChartData && equityChartData.length > 0,
            });
            cashSeriesRef.current?.applyOptions({
                visible: controlsState.showCash && !!cashChartData && cashChartData.length > 0,
            });
        } catch {
            // Series may be invalid
        }
    }, [controlsState.showEquity, controlsState.showCash, equityChartData, cashChartData, chartRef]);

    return {
        priceSeriesRef,
        equitySeriesRef,
        cashSeriesRef,
        executionSeriesRefs,
    };
}
