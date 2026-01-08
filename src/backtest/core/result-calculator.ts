import { formatExecutionTime } from "@/backtest/storage/dateUtils";
import { PriceCollector } from "@/backtest/core/price-collector";
import { backtestStore } from "@/utils/zustand/backtestStore";
import { OrderTracker } from "@/backtest/core/order-tracker";
import type { BacktestConfig, BacktestResult } from "@/backtest/types";

export async function calculateBacktestResult(
    config: BacktestConfig,
    processedBars: number,
    engineStartTime: Date,
    orderTracker?: OrderTracker,
    priceCollector?: PriceCollector
): Promise<BacktestResult> {
    const engineEndTime = new Date();
    const diffMs = engineEndTime.getTime() - engineStartTime.getTime();
    const executionTime = formatExecutionTime(diffMs);

    const state = backtestStore.getState();
    const finalEquity = state.capital?.equity || config.startCapital;
    const totalReturn = finalEquity - config.startCapital;
    const totalReturnPercent =
        config.startCapital > 0 ? (totalReturn / config.startCapital) * 100 : 0;

    // Generate chart data
    let chartData: BacktestResult['chartData'];
    if (orderTracker && priceCollector) {
        const priceData = priceCollector.getPriceData();
        const equityData = priceCollector.getEquityData();
        const cashData = priceCollector.getCashData();

        chartData = {
            priceData,
            executions: orderTracker.generateExecutionLines(),
        } as BacktestResult['chartData'];

        // Add equity and cash data if available
        if (equityData.length > 0 && chartData) {
            chartData.equityData = equityData;
        }
        if (cashData.length > 0 && chartData) {
            chartData.cashData = cashData;
        }
    }

    return {
        stock: config.stock,
        startDate: config.startDate,
        endDate: config.endDate,
        startCapital: config.startCapital,
        finalEquity,
        totalReturn,
        totalReturnPercent,
        processedBars,
        executionTime,
        chartData,
    };
}
