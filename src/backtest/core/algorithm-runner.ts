import gridTradeV0 from "@/utils/trading/algorithms/gridTradeV0";
import { PriceCollector } from "@/backtest/core/price-collector";
import Ealgorighms from "@/utils/trading/algorithms/dictionary";
import { backtestStore } from "@/utils/zustand/backtestStore";
import { OrderTracker } from "@/backtest/core/order-tracker";
import { emitProgress } from "@/backtest/utils/helpers";
import {
    GRID_TRADE_V0_DEFAULT_CONFIG,
    type IgridV0,
} from "@/utils/trading/algorithms/constants";
import type { ProgressCallback } from "@/backtest/types";

export async function runAlgorithm(
    algorithm: string,
    stock: string,
    bar: {
        close: number;
        timestamp: string;
    },
    onProgress?: ProgressCallback,
    orderTracker?: OrderTracker,
    priceCollector?: PriceCollector
): Promise<void> {
    switch (algorithm) {
        case Ealgorighms.GridV0:
            {
                const state = backtestStore.getState();
                const storeConfig = state.config;

                let gridConfig: IgridV0 = GRID_TRADE_V0_DEFAULT_CONFIG;

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

                await gridTradeV0(
                    stock,
                    true,
                    bar.close,
                    bar.timestamp,
                    gridConfig,
                    orderTracker,
                    priceCollector
                );
            }
            break;

        default:
            if (onProgress) {
                await emitProgress(onProgress, {
                    stage: "working_on_chunk",
                    message: `Unknown algorithm: ${algorithm}`,
                    data: {
                        progress: 0,
                    },
                });
            }
            break;
    }
}
