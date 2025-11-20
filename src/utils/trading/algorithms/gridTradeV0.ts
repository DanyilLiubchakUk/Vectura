import {
    getBarByTimeWithCursor,
    addBuyOrder,
    addSellOrder,
    markOrderAsBought,
    markOrderAsSold,
    getNeedToBuyOrders,
    getNeedToSellOrders,
    BacktestOrder,
    getGlobalCapital,
    setCapital,
    readBacktestFile,
    cleanCSV,
    firstOrder,
    writeBacktestFile,
} from "@/backtest/csvStorage";

// Configuration parameters
const Xc = 5; // Percentage of capital to use per buy (N %)
const Xb = 5; // Percentage below current price to set NextBuyOn (N %)
const Xs = 5; // Percentage above buy price to set SellOn (N %)
const Xl = 200; // Dollar amount should not go lower on the account(once allowed) (N $)

export default async function gridTradeV0(
    stock: string,
    backtesting: boolean = false,
    time: string
) {
    const bar = getBarByTimeWithCursor(stock, time);
    if (bar === undefined) {
        return;
    }
    const currentPrice = bar.ClosePrice;
    let tradeHistory = readBacktestFile(stock);
    let capital = getGlobalCapital();

    const needToSellOrders = getNeedToSellOrders(tradeHistory, currentPrice);
    let needToBuyOrders: BacktestOrder[] = [];
    if (capital > Xl * (1 + Xc / 100)) {
        needToBuyOrders = getNeedToBuyOrders(tradeHistory, currentPrice);
    }

    needToSellOrders.forEach((sellOrder) => {
        const shares = sellOrder.TotalShares;
        capital += shares * currentPrice;
        capital = Number(capital.toFixed(8));
        const nextBuyOn = currentPrice * (1 - Xb / 100);
        const nextSell = currentPrice * (1 + Xs / 100);

        addSellOrder(
            stock,
            time,
            currentPrice,
            shares,
            nextBuyOn,
            nextSell
        );
        markOrderAsSold(stock, sellOrder.Id);
        setCapital(capital, time);
    });
    needToBuyOrders.forEach((buyOrder) => {
        const usedCapital = capital / Xc;
        if (usedCapital < Xl / Xc) {
            return;
        }
        capital -= usedCapital;
        capital = Number(capital.toFixed(5));

        const shares = Number((usedCapital / currentPrice).toFixed(5));
        const nextBuyOn = currentPrice * (1 - Xb / 100);
        const sellOn = currentPrice * (1 + Xs / 100);

        addBuyOrder(
            stock,
            time,
            currentPrice,
            shares,
            nextBuyOn,
            sellOn,
            false
        );
        markOrderAsBought(stock, buyOrder.Id);
        setCapital(capital, time);
    });

    if (needToSellOrders.length || needToBuyOrders.length) {
        cleanCSV(stock);
    }
}

export function firstAction(
    isFirstTime: boolean,
    stock: string,
    startPrice: number,
    startCapital: number,
    time: string
) {
    if (isFirstTime) {
        const usedCapital = startCapital / Xc;
        const remainingCapital = startCapital - usedCapital;

        setCapital(remainingCapital, time);

        const shares = usedCapital / startPrice;
        const nextBuyOn = startPrice * (1 - Xb / 100);
        const sellOn = startPrice * (1 + Xs / 100);

        writeBacktestFile(
            stock,
            firstOrder(stock, time, startPrice, shares, nextBuyOn, sellOn)
        );
    }
}
