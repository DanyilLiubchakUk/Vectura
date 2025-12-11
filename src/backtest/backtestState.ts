import {
    backtestStore,
    IbacktestSession,
    IbacktestCapital,
} from "@/utils/zustand/backtestStore";
import { formatDay } from "@/backtest/storage/dateUtils";
import { isTradingAllowed } from "@/backtest/pdt/pdtManager";
import { getActionNeededOrders as getActionNeededOrdersInternal } from "@/backtest/orders/orderManager";
import {
    executeBuyOrder,
    executeSellOrder,
    BuyOrderData,
} from "@/backtest/trades/tradeManager";
import {
    calculateEquity,
    roundDown,
    generateOrderId,
} from "@/backtest/utils/helpers";
import { GRID_TRADE_V0_DEFAULT_CONFIG } from "@/utils/trading/algorithms/gridTradeV0";

export function initializeBacktest(
    stock: string,
    backtestStart: string,
    backtestEnd: string,
    initialCapital: number
): void {
    backtestStore.setState((state) => {
        const session: IbacktestSession = {
            stock,
            start: backtestStart,
            end: backtestEnd,
            initialCapital,
        };
        const capital: IbacktestCapital = {
            cash: initialCapital,
            max: initialCapital,
            equity: initialCapital,
            investedCash: 0,
        };

        return {
            ...state,
            actions: {
                ...state.actions,
                toBuy: [
                    { id: "firstOrder", atPrice: -1, belowOrHigher: "higher" },
                ],
            },
            session,
            capital,
        };
    });
}

export function updateEquityFromMarket(
    currentPrice: number,
    timestamp: string
): void {
    backtestStore.setState((state) => {
        if (!state.capital) return state;

        const equity = calculateEquity(
            state.capital.cash,
            state.openTrades,
            currentPrice
        );

        const currentMax = state.capital.max ?? 0;
        const nextMax = Math.max(currentMax, equity);

        if (equity > currentMax) {
            const initialCapital = state.session?.initialCapital ?? 1;
            const investedCash = state.capital.investedCash;
            const gainPct =
                initialCapital > 0
                    ? ((equity / initialCapital - 1) * 100).toFixed(2)
                    : "∞";

            const percentMinusInvested =
                (nextMax / (initialCapital + investedCash) - 1) * 100;

            console.log(
                `${percentMinusInvested.toFixed(
                    2
                )}% witout ${investedCash}$ invested, and ${gainPct}% with invested - New maximum capital: ${equity.toFixed(
                    2
                )} on ${formatDay(new Date(timestamp))}`
            );
        }

        return {
            ...state,
            capital: {
                ...state.capital,
                max: nextMax,
                equity,
            },
        };
    });
}

export function addBuyOrder(
    Xb: number,
    Xs: number,
    Xc: number,
    Xl: number,
    timestamp: string,
    price: number,
    buyAtId: string
): void {
    if (!isTradingAllowed(timestamp, "buy")) {
        return;
    }

    const state = backtestStore.getState();
    let cash = state.capital?.cash ?? 0;
    let useCash = roundDown(cash * (Xc / 100));

    if (cash - useCash < Xl) {
        return;
    }

    const shares = roundDown(useCash / price);
    useCash = shares * price;
    const toBuy = price * (1 - Xb / 100);
    const toSell = price * (1 + Xs / 100);
    cash -= useCash;

    const orderData: BuyOrderData = {
        id: generateOrderId(),
        timestamp,
        shares,
        toBuy,
        toSell,
        price,
        buyAtId,
        Xg: GRID_TRADE_V0_DEFAULT_CONFIG.Xg,
    };

    executeBuyOrder(orderData);
    setCapital(cash);
}

export function addSellOrder(
    Xb: number,
    Xu: number,
    timestamp: string,
    price: number,
    sellActionId: string,
    tradeId: string,
    shares: number
): void {
    if (!isTradingAllowed(timestamp, "sell", tradeId)) {
        return;
    }

    const state = backtestStore.getState();
    let cash = state.capital?.cash ?? 0;
    const proceeds = price * shares;
    cash += proceeds;

    const downPrice = price * (1 - Xb / 100);
    const upPrice = price * (1 + Xu / 100);

    executeSellOrder(
        generateOrderId(),
        shares,
        price,
        timestamp,
        [downPrice, upPrice],
        sellActionId,
        tradeId,
        GRID_TRADE_V0_DEFAULT_CONFIG.Xg
    );
    setCapital(cash);
}

export function addExternalCapital(amount: number): void {
    if (amount <= 0) return;

    backtestStore.setState((state) => {
        if (!state.capital) return state;

        const nextCash = (state.capital.cash ?? 0) + amount;
        const nextQquity = (state.capital.equity ?? 0) + amount;
        const nextInvestedCash = (state.capital.investedCash ?? 0) + amount;

        return {
            ...state,
            capital: {
                ...state.capital,
                cash: nextCash,
                equity: nextQquity,
                investedCash: nextInvestedCash,
            },
        };
    });
}

export function getActionNeededOrders(
    currentPrice: number,
    timestamp: string
): {
    toBuyOrders: { id: string }[];
    toSellOrders: { id: string; tradeId: string; shares: number }[];
} {
    return getActionNeededOrdersInternal(
        currentPrice,
        timestamp,
        isTradingAllowed
    );
}

function setCapital(value: number): void {
    backtestStore.setState((state) => {
        if (!state.capital) return state;

        return {
            ...state,
            capital: {
                ...state.capital,
                cash: value,
            },
        };
    });
}
