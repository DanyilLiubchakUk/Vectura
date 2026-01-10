import { GRID_TRADE_V0_DEFAULT_CONFIG } from "@/utils/trading/algorithms/constants";
import { getTodayMinusDays } from "@/backtest/storage/dateUtils";
import Ealgorighms from "@/utils/trading/algorithms/dictionary";
import { DAYS_BEFORE_TODAY } from "@/backtest/constants";
import type { BacktestFormValues } from "@/components/backtest/schema";

export const defaultBacktestFormValues: BacktestFormValues = {
    name: "My Backtest",
    executionMode: "local",
    stock: "TQQQ",
    algorithm: Ealgorighms.GridV0,
    startDate: "2024-01-01",
    endDate: getTodayMinusDays(DAYS_BEFORE_TODAY),
    startCapital: 1000,
    contributionFrequencyDays: 7,
    contributionAmount: 500,
    capitalPct: GRID_TRADE_V0_DEFAULT_CONFIG.capitalPct,
    buyBelowPct: GRID_TRADE_V0_DEFAULT_CONFIG.buyBelowPct,
    sellAbovePct: GRID_TRADE_V0_DEFAULT_CONFIG.sellAbovePct,
    buyAfterSellPct: GRID_TRADE_V0_DEFAULT_CONFIG.buyAfterSellPct,
    cashFloor: GRID_TRADE_V0_DEFAULT_CONFIG.cashFloor,
    orderGapPct: GRID_TRADE_V0_DEFAULT_CONFIG.orderGapPct,
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
