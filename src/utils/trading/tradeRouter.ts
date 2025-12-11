import {
    getAutoTradeActionNeeded,
    updateStore,
    addAutoTradeBuyOrder,
    addAutoTradeSellOrder,
} from "@/auto-trade/autoTradeState";
import {
    addBuyOrder as addBacktestBuyOrder,
    addSellOrder as addBacktestSellOrder,
    getActionNeededOrders as getBacktestActionNeeded,
    updateEquityFromMarket,
} from "@/backtest/backtestState";

export async function updateEquity(
    backtesting: boolean,
    currentPrice: number,
    time: string
) {
    if (backtesting) {
        updateEquityFromMarket(currentPrice, time);
    } else {
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
    orderGapPct: number
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
            buyAtId
        );
    } else {
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
    orderGapPct: number
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
            shares
        );
    } else {
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
