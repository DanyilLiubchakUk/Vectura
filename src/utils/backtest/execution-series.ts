import { convertToChartTime, ensureTimeAfter } from "./chart-time";
import { LineSeries, LineStyle } from "lightweight-charts";
import { getChartThemeColors } from "./chart-colors";
import type { Time, ISeriesApi, IChartApi } from "lightweight-charts";
import type { ExecutionLine } from "@/backtest/types";

interface CreateExecutionSeriesOptions {
    execution: ExecutionLine;
    chart: IChartApi;
    maxTime: Time;
    themeColors: ReturnType<typeof getChartThemeColors>;
}

export function createExecutionSeries({
    execution,
    chart,
    maxTime,
    themeColors,
}: CreateExecutionSeriesOptions): ISeriesApi<"Line"> | null {
    try {
        const color = execution.type === "buy" ? themeColors.buyLine : themeColors.sellLine;
        const startTime = convertToChartTime(execution.startTime);

        if (!startTime) {
            console.warn("Invalid start time for execution:", execution);
            return null;
        }

        let endTime: Time;
        if (execution.executed && execution.executionTime) {
            endTime = convertToChartTime(execution.executionTime);
        } else {
            endTime = maxTime >= startTime ? maxTime : startTime;
        }

        if (!endTime) {
            console.warn("Invalid end time for execution:", execution);
            return null;
        }

        if (endTime < startTime) {
            endTime = maxTime >= startTime ? maxTime : startTime;
        }

        const adjustedEndTime = ensureTimeAfter(startTime, endTime);
        if (adjustedEndTime === null) {
            console.warn("Cannot create execution line with equal start/end times:", execution);
            return null;
        }
        endTime = adjustedEndTime;

        const lineData = [
            {
                time: startTime,
                value: execution.triggerPrice,
            },
            {
                time: endTime,
                value: execution.triggerPrice,
            },
        ];

        const executionSeries = chart.addSeries(LineSeries, {
            color,
            lineWidth: 1,
            lineStyle: execution.executed ? LineStyle.Solid : LineStyle.LargeDashed,
            priceLineVisible: false,
            lastValueVisible: false,
            crosshairMarkerVisible: false,
            priceFormat: {
                type: "price",
                precision: 2,
                minMove: 0.01,
            },
        }) as ISeriesApi<"Line">;

        if (!execution.executed) {
            executionSeries.applyOptions({
                color: color.length === 7 ? color + "80" : color.slice(0, 7) + "80", // 80 hex = ~50% opacity
            });
        }

        executionSeries.setData(lineData);
        return executionSeries;
    } catch (error) {
        console.warn("Failed to create execution line:", error, execution);
        return null;
    }
}
