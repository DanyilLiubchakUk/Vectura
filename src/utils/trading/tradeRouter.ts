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
    Xb: number,
    Xs: number,
    Xc: number,
    Xl: number,
    time: string,
    currentPrice: number,
    buyAtId: string,
    Xg: number
): Promise<{
    price: number;
    shares: number;
} | null | void> {
    if (backtesting) {
        return addBacktestBuyOrder(Xb, Xs, Xc, Xl, time, currentPrice, buyAtId);
    } else {
        return await addAutoTradeBuyOrder(
            Xb,
            Xs,
            Xc,
            Xl,
            time,
            currentPrice,
            buyAtId,
            Xg
        );
    }
}
export async function addSellOrder(
    backtesting: boolean,
    Xb: number,
    Xu: number,
    time: string,
    currentPrice: number,
    sellActionId: string,
    tradeId: string,
    shares: number,
    Xg: number
): Promise<{
    price: number;
    shares: number;
} | null | void> {
    if (backtesting) {
        return addBacktestSellOrder(
            Xb,
            Xu,
            time,
            currentPrice,
            sellActionId,
            tradeId,
            shares
        );
    } else {
        return await addAutoTradeSellOrder(
            Xb,
            Xu,
            time,
            currentPrice,
            sellActionId,
            tradeId,
            shares,
            Xg
        );
    }
}
