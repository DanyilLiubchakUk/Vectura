import type { BacktestFormValues } from "@/components/backtest/schema";

export function prepareBacktestSubmissionData(
    values: BacktestFormValues
): BacktestSubmissionData {
    const freq = values.contributionFrequencyDays ?? 0;
    const amount = values.contributionAmount ?? 0;

    return {
        stock: values.stock.toUpperCase(),
        algorithm: values.algorithm,
        startDate: values.startDate,
        endDate: values.endDate,
        startCapital: values.startCapital,
        contributionFrequencyDays: freq,
        contributionAmount: amount,
        capitalPct: values.capitalPct,
        buyBelowPct: values.buyBelowPct,
        sellAbovePct: values.sellAbovePct,
        buyAfterSellPct: values.buyAfterSellPct,
        cashFloor: values.cashFloor,
        orderGapPct: values.orderGapPct,
    };
}

export interface BacktestSubmissionData {
    stock: string;
    algorithm: string;
    startDate: string;
    endDate: string;
    startCapital: number;
    contributionFrequencyDays: number;
    contributionAmount: number;
    capitalPct: number;
    buyBelowPct: number;
    sellAbovePct: number;
    buyAfterSellPct: number;
    cashFloor: number;
    orderGapPct: number;
}
