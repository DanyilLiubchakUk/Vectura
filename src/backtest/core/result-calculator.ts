import { formatExecutionTime, calculateDaysBetween } from "@/backtest/storage/dateUtils";
import { PriceCollector } from "@/backtest/core/price-collector";
import { backtestStore } from "@/utils/zustand/backtestStore";
import { OrderTracker } from "@/backtest/core/order-tracker";
import { AVERAGE_DAYS_IN_MONTH } from "@/constants/time";
import type { MetricsTracker } from "@/backtest/core/metrics-tracker";
import type { BacktestConfig, BacktestResult } from "@/backtest/types";

export async function calculateBacktestResult(
    config: BacktestConfig,
    processedBars: number,
    engineStartTime: Date,
    orderTracker?: OrderTracker,
    priceCollector?: PriceCollector,
    metricsTracker?: MetricsTracker,
    finalPrice: number = 0
): Promise<BacktestResult> {
    const engineEndTime = new Date();
    const diffMs = engineEndTime.getTime() - engineStartTime.getTime();
    const executionTime = formatExecutionTime(diffMs);

    const state = backtestStore.getState();
    const finalEquity = state.capital?.equity || config.startCapital;
    const investedCash = (state.capital?.investedCash || 0) + config.startCapital
    const totalReturn = finalEquity - investedCash;
    const totalReturnPercent =
        config.startCapital > 0 ? ((finalEquity / investedCash) * 100) - 100 : 0;

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

    // Calculate all metrics from raw tracker data
    let metrics: BacktestResult['metrics'];
    if (metricsTracker) {
        const rawData = metricsTracker.getRawData();

        // Average Invested Capital (%)
        const averageInvestedCapitalPct =
            processedBars > 0
                ? (rawData.investedCapitalRatioSum / processedBars) * 100
                : 0;

        // Maximum Equity ($)
        const maximumEquity = rawData.peakEquity;

        // Maximum Drawdown (%) and ($)
        const maximumDrawdownPct = rawData.maxDrawdownPct;
        const maximumDrawdownDollar = rawData.maxDrawdownDollar;

        // Longest Drawdown Duration (days)
        let longestDrawdownDurationDays = 0;
        for (const period of rawData.drawdownPeriods) {
            const duration = calculateDaysBetween(
                period.startTimestamp,
                period.endTimestamp,
                false
            );
            if (duration > longestDrawdownDurationDays) {
                longestDrawdownDurationDays = duration;
            }
        }

        // Total Trades Executed
        const totalTradesExecuted = rawData.tradeCount;

        // Calculate total days and months
        const totalDays = calculateDaysBetween(config.startDate, config.endDate, true);
        const totalMonths = totalDays / AVERAGE_DAYS_IN_MONTH;

        // Average Trades per Month
        const averageTradesPerMonth =
            totalMonths > 0 ? totalTradesExecuted / totalMonths : 0;

        // Best/Worst Month Return (%)
        const monthlyReturns: number[] = [];
        const sortedMonths = Array.from(rawData.monthlyEquity.entries()).sort((a, b) =>
            a[0].localeCompare(b[0])
        );
        if (sortedMonths.length > 0) {
            let previousEquity = config.startCapital

            // Calculate returns between month snapshots
            for (let i = 0; i < sortedMonths.length; i++) {
                const currentEquity = sortedMonths[i][1];
                if (previousEquity > 0) {
                    const returnPct = ((currentEquity - previousEquity) / previousEquity) * 100;
                    monthlyReturns.push(returnPct);
                }
                previousEquity = currentEquity;
            }
        }
        // If backtest spans < 1 month OR no monthly returns calculated, best/worst = total return
        let bestMonthReturnPct = 0;
        let worstMonthReturnPct = 0;
        if (totalMonths < 1 || monthlyReturns.length === 0) {
            // Single month or no monthly returns: best/worst = total return
            bestMonthReturnPct = totalReturnPercent;
            worstMonthReturnPct = totalReturnPercent;
        } else {
            bestMonthReturnPct = Math.max(...monthlyReturns);
            worstMonthReturnPct = Math.min(...monthlyReturns);
        }

        // Return / Max Drawdown Ratio
        const returnMaxDrawdownRatio =
            maximumDrawdownPct !== 0 ? totalReturnPercent / Math.abs(maximumDrawdownPct) : 0;

        // Buy & Hold Comparison (%) and ($)
        const buyHoldFinalEquity =
            rawData.buyHoldTotalShares * finalPrice + rawData.buyHoldCash;
        const buyHoldDollarDifference = finalEquity - buyHoldFinalEquity;
        const buyHoldPercentageDifference =
            buyHoldFinalEquity > 0
                ? ((finalEquity - buyHoldFinalEquity) / buyHoldFinalEquity) * 100
                : 0;

        metrics = {
            averageInvestedCapitalPct,
            maximumEquity,
            maximumDrawdownPct,
            maximumDrawdownDollar,
            longestDrawdownDurationDays,
            totalTradesExecuted,
            averageTradesPerMonth,
            bestMonthReturnPct,
            worstMonthReturnPct,
            returnMaxDrawdownRatio,
            buyHoldComparison: {
                dollarDifference: buyHoldDollarDifference,
                percentageDifference: buyHoldPercentageDifference,
            },
        };
    }

    return {
        stock: config.stock,
        startDate: config.startDate,
        endDate: config.endDate,
        startCapital: config.startCapital,
        finalEquity,
        investedCash,
        totalReturn,
        totalReturnPercent,
        processedBars,
        executionTime,
        chartData,
        metrics,
    };
}
