import {
    addBuyOrder,
    addSellOrder,
    updateEquityFromMarket,
    getActionNeededOrders,
} from "@/backtest/backtestState";

// Configuration parameters
const Xc = 60; // Percentage of capital to use per buy (N %)
const Xb = 2; // Percentage below current price to set NextBuyOn (N %)
const Xs = 18; // Percentage above buy price to set SellOn (N %)
const Xl = 200; // Dollar amount should not go lower on the account(once allowed) (N $)

export default async function gridTradeV0(
    stock: string,
    backtesting: boolean = false,
    currentPrice: number,
    time: string
) {
    updateEquityFromMarket(currentPrice, time);

    const { toBuyOrders, toSellOrders } = getActionNeededOrders(
        currentPrice,
        time
    );

    toBuyOrders.forEach((buyOrder) => {
        addBuyOrder(Xb, Xs, Xc, Xl, time, currentPrice, buyOrder.id);
    });
    toSellOrders.forEach((sellOrder) => {
        addSellOrder(
            Xb,
            Xs,
            time,
            currentPrice,
            sellOrder.id,
            sellOrder.tradeId,
            sellOrder.shares
        );
    });
}
