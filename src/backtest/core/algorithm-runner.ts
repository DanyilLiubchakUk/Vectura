import gridTrade from "@/utils/trading/algorithms/gridTrade";
import { PriceCollector } from "@/backtest/core/price-collector";
import { backtestStore } from "@/utils/zustand/backtestStore";
import { OrderTracker } from "@/backtest/core/order-tracker";
import {
    GRID_TRADE_DEFAULT_CONFIG,
    type Igrid,
} from "@/utils/trading/algorithms/constants";
import type { MetricsTracker } from "@/backtest/core/metrics-tracker";

export async function runAlgorithm(
    stock: string,
    bar: {
        close: number;
        timestamp: string;
    },
    orderTracker?: OrderTracker,
    priceCollector?: PriceCollector,
    metricsTracker?: MetricsTracker
): Promise<void> {
    const state = backtestStore.getState();
    const storeConfig = state.config;

    let gridConfig: Igrid = GRID_TRADE_DEFAULT_CONFIG;

    if (storeConfig) {
        gridConfig = {
            capitalPct: storeConfig.capitalPct,
            buyBelowPct: storeConfig.buyBelowPct,
            sellAbovePct: storeConfig.sellAbovePct,
            buyAfterSellPct: storeConfig.buyAfterSellPct,
            cashFloor: storeConfig.cashFloor,
            orderGapPct: storeConfig.orderGapPct,
        };
    }

    await gridTrade(
        stock,
        true,
        bar.close,
        bar.timestamp,
        gridConfig,
        orderTracker,
        priceCollector,
        metricsTracker
    );
}
