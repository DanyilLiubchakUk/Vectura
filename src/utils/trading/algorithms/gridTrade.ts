import {
    updateEquity,
    getActionNeededOrders,
    addBuyOrder,
    addSellOrder,
} from "@/utils/trading/tradeRouter";
import {
    GRID_TRADE_DEFAULT_CONFIG,
    Igrid,
} from "@/utils/trading/algorithms/constants";
import { PriceCollector } from "@/backtest/core/price-collector";
import { OrderTracker } from "@/backtest/core/order-tracker";
import type { MetricsTracker } from "@/backtest/core/metrics-tracker";

export default async function gridTrade(
    stock: string,
    backtesting: boolean = false,
    currentPrice: number,
    time: string,
    configOverrides?: Igrid,
    orderTracker?: OrderTracker,
    priceCollector?: PriceCollector,
    metricsTracker?: MetricsTracker
): Promise<string> {
    let summaryMessage =
        "This time waited for changes in the market for a better trade";
    const actionsSummary: string[] = [];
    await updateEquity(backtesting, currentPrice, time, priceCollector);

    const config = backtesting
        ? { ...GRID_TRADE_DEFAULT_CONFIG, ...configOverrides }
        : await (
            await import(
                  /* webpackIgnore: true */ "@/utils/supabase/autoTradeStorage"
            )
        ).getAlgoConfigOrDefault();

    const { toBuyOrders, toSellOrders } = await getActionNeededOrders(
        backtesting,
        currentPrice,
        time
    );

    for (const buyOrder of toBuyOrders) {
        const result = await addBuyOrder(
            backtesting,
            config.buyBelowPct,
            config.sellAbovePct,
            config.capitalPct,
            config.cashFloor,
            time,
            currentPrice,
            buyOrder.id,
            config.orderGapPct,
            orderTracker,
            priceCollector,
            metricsTracker
        );

        if (!backtesting && result) {
            actionsSummary.push(
                `Bought ${result.shares} shares at $${result.price.toFixed(2)}`
            );
        }

        if (!backtesting) {
            await updateEquity(backtesting, currentPrice, time, priceCollector);
        }
    }

    for (const sellOrder of toSellOrders) {
        const result = await addSellOrder(
            backtesting,
            config.buyBelowPct,
            config.buyAfterSellPct,
            time,
            currentPrice,
            sellOrder.id,
            sellOrder.tradeId,
            sellOrder.shares,
            config.orderGapPct,
            orderTracker,
            priceCollector,
            metricsTracker
        );

        if (!backtesting && result) {
            actionsSummary.push(
                `Sold ${result.shares} shares at $${result.price.toFixed(2)}`
            );
        }

        if (!backtesting) {
            await updateEquity(backtesting, currentPrice, time, priceCollector);
        }
    }

    if (!backtesting && actionsSummary.length > 0) {
        summaryMessage = actionsSummary.join("; ");
    }

    return summaryMessage;
}
