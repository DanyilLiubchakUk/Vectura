import {
    addBuyOrder as addBacktestBuyOrder,
    addSellOrder as addBacktestSellOrder,
    getActionNeededOrders as getBacktestActionNeeded,
    updateEquityFromMarket,
} from "@/backtest/backtestState";
import { PriceCollector } from "@/backtest/core/price-collector";
import { OrderTracker } from "@/backtest/core/order-tracker";
import type { MetricsTracker } from "@/backtest/core/metrics-tracker";

export async function updateEquity(
    backtesting: boolean,
    currentPrice: number,
    time: string,
    priceCollector?: PriceCollector
) {
    if (backtesting) {
        updateEquityFromMarket(currentPrice, time, priceCollector);
    } else {
        const { updateStore } = await import(
            /* webpackIgnore: true */ "@/auto-trade/autoTradeState"
        );
        await updateStore(time);
    }
}

export async function getActionNeededOrders(
    backtesting: boolean,
    currentPrice: number,
    time: string
): Promise<{
    toBuyOrders: { id: string }[];
    toSellOrders: { id: string; tradeId: string; shares: number }[];
}> {
    if (backtesting) {
        return getBacktestActionNeeded(currentPrice, time);
    } else {
        const { getAutoTradeActionNeeded } = await import(
            /* webpackIgnore: true */ "@/auto-trade/autoTradeState"
        );
        return await getAutoTradeActionNeeded(currentPrice, time);
    }
}

export async function addBuyOrder(
    backtesting: boolean,
    buyBelowPct: number,
    sellAbovePct: number,
    capitalPct: number,
    cashFloor: number,
    time: string,
    currentPrice: number,
    buyAtId: string,
    orderGapPct: number,
    orderTracker?: OrderTracker,
    priceCollector?: PriceCollector,
    metricsTracker?: MetricsTracker
): Promise<{
    price: number;
    shares: number;
} | null | void> {
    if (backtesting) {
        return addBacktestBuyOrder(
            buyBelowPct,
            sellAbovePct,
            capitalPct,
            cashFloor,
            time,
            currentPrice,
            buyAtId,
            orderGapPct,
            orderTracker,
            priceCollector,
            metricsTracker
        );
    } else {
        const { addAutoTradeBuyOrder } = await import(
            /* webpackIgnore: true */ "@/auto-trade/autoTradeState"
        );
        return await addAutoTradeBuyOrder(
            buyBelowPct,
            sellAbovePct,
            capitalPct,
            cashFloor,
            time,
            currentPrice,
            buyAtId,
            orderGapPct
        );
    }
}

export async function addSellOrder(
    backtesting: boolean,
    buyBelowPct: number,
    buyAfterSellPct: number,
    time: string,
    currentPrice: number,
    sellActionId: string,
    tradeId: string,
    shares: number,
    orderGapPct: number,
    orderTracker?: OrderTracker,
    priceCollector?: PriceCollector,
    metricsTracker?: MetricsTracker
): Promise<{
    price: number;
    shares: number;
} | null | void> {
    if (backtesting) {
        return addBacktestSellOrder(
            buyBelowPct,
            buyAfterSellPct,
            time,
            currentPrice,
            sellActionId,
            tradeId,
            shares,
            orderGapPct,
            orderTracker,
            priceCollector,
            metricsTracker
        );
    } else {
        const { addAutoTradeSellOrder } = await import(
            /* webpackIgnore: true */ "@/auto-trade/autoTradeState"
        );
        return await addAutoTradeSellOrder(
            buyBelowPct,
            buyAfterSellPct,
            time,
            currentPrice,
            sellActionId,
            tradeId,
            shares,
            orderGapPct
        );
    }
}
