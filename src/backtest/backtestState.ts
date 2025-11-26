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
            const base = state.session?.initialCapital ?? 1;
            const gainPct = ((equity / base) * 100 - 100).toFixed(3);
            console.log(
                `${gainPct}% - New maximum capital: ${equity.toFixed(
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
    };

    executeBuyOrder(orderData);
    setCapital(cash);
}

export function addSellOrder(
    Xb: number,
    Xs: number,
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
    const upPrice = price * (1 + Xs / 100);

    executeSellOrder(
        generateOrderId(),
        shares,
        price,
        timestamp,
        [downPrice, upPrice],
        sellActionId,
        tradeId
    );
    setCapital(cash);
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
