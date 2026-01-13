import { GRID_TRADE_DEFAULT_CONFIG } from "@/utils/trading/algorithms/constants";
import { BACKTEST_FORM_STORAGE_KEY, DAYS_BEFORE_TODAY } from "@/backtest/constants";
import { getTodayMinusDays } from "@/backtest/storage/dateUtils";
import type { BacktestFormValues } from "@/components/backtest/schema";

export const defaultBacktestFormValues: BacktestFormValues = {
    name: "My Backtest",
    executionMode: "local",
    stock: "TQQQ",
    startDate: "2024-01-01",
    endDate: getTodayMinusDays(DAYS_BEFORE_TODAY),
    startCapital: 1000,
    contributionFrequencyDays: 7,
    contributionAmount: 500,
    capitalPct: GRID_TRADE_DEFAULT_CONFIG.capitalPct,
    buyBelowPct: GRID_TRADE_DEFAULT_CONFIG.buyBelowPct,
    sellAbovePct: GRID_TRADE_DEFAULT_CONFIG.sellAbovePct,
    buyAfterSellPct: GRID_TRADE_DEFAULT_CONFIG.buyAfterSellPct,
    cashFloor: GRID_TRADE_DEFAULT_CONFIG.cashFloor,
    orderGapFilterEnabled: true,
    orderGapPct: GRID_TRADE_DEFAULT_CONFIG.orderGapPct,
};

export const executionModeOptions = [
    {
        value: "local" as const,
        label: "Local",
        description: "Run the backtest locally on your machine",
    },
    {
        value: "cloud" as const,
        label: "Cloud",
        description: "Run the backtest on our cloud infrastructure",
    },
] as const;

export function saveBacktestFormValues(values: BacktestFormValues): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(BACKTEST_FORM_STORAGE_KEY, JSON.stringify(values));
    } catch (error) {
        // Ignore localStorage errors (quota exceeded, etc.)
    }
}

export function loadBacktestFormValues(): BacktestFormValues | undefined {
    if (typeof window === "undefined") return undefined;
    try {
        const stored = localStorage.getItem(BACKTEST_FORM_STORAGE_KEY);
        if (!stored) return undefined;
        return JSON.parse(stored) as BacktestFormValues;
    } catch (error) {
        return undefined;
    }
}
