import {
    executeBuyOrder,
    executeSellOrder,
    BuyOrderData,
} from "@/backtest/trades/tradeManager";
import {
    backtestStore,
    IbacktestSession,
    IbacktestCapital,
} from "@/utils/zustand/backtestStore";
import {
    calculateEquity,
    roundDown,
    generateOrderId,
} from "@/backtest/utils/helpers";
import { getActionNeededOrders as getActionNeededOrdersInternal } from "@/backtest/orders/orderManager";
import { isTradingAllowed } from "@/backtest/pdt/pdtManager";
import { OrderTracker } from "@/backtest/core/order-tracker";
import type { PriceCollector } from "@/backtest/core/price-collector";
import type { BacktestConfig } from "@/backtest/types";

export function initializeBacktest(config: BacktestConfig): void {
    backtestStore.setState(() => {
        const session: IbacktestSession = {
            stock: config.stock,
            start: config.startDate,
            end: config.endDate,
            initialCapital: config.startCapital,
        };
        const capital: IbacktestCapital = {
            cash: config.startCapital,
            max: config.startCapital,
            equity: config.startCapital,
            investedCash: 0,
        };

        return {
            config,
            session,
            capital,
            actions: {
                toBuy: [
                    { id: "firstOrder", atPrice: -1, belowOrHigher: "higher" },
                ],
                toSell: [],
            },
            tradeHistory: [],
            pdtStatus: [],
            openTrades: [],
        };
    });
}

export function updateEquityFromMarket(
    currentPrice: number,
    timestamp: string,
    priceCollector?: PriceCollector
): void {
    // Get current state to calculate equity with correct values
    const state = backtestStore.getState();
    if (!state.capital) return;

    const equity = calculateEquity(
        state.capital.cash,
        state.openTrades,
        currentPrice
    );

    const currentMax = state.capital.max ?? 0;
    const nextMax = Math.max(currentMax, equity);

    if (priceCollector) {
        priceCollector.updateAccount(timestamp, equity, state.capital.cash);
    }

    backtestStore.setState((state) => {
        if (!state.capital) return state;

        if (equity > currentMax) {
            const initialCapital = state.session?.initialCapital ?? 1;
            const investedCash = state.capital.investedCash;
            const gainPct =
                initialCapital > 0
                    ? ((equity / initialCapital - 1) * 100).toFixed(2)
                    : "∞";

            const percentMinusInvested =
                (nextMax / (initialCapital + investedCash) - 1) * 100;

            // console.log(
            //     `${percentMinusInvested.toFixed(
            //         2
            //     )}% witout ${investedCash}$ invested, and ${gainPct}% with invested - New maximum capital: ${equity.toFixed(
            //         2
            //     )} on ${formatDay(new Date(timestamp))}`
            // );
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
    buyBelowPct: number,
    sellAbovePct: number,
    capitalPct: number,
    cashFloor: number,
    timestamp: string,
    price: number,
    buyAtId: string,
    orderGapPct: number,
    orderTracker?: OrderTracker,
    priceCollector?: PriceCollector
): void {
    if (!isTradingAllowed(timestamp, "buy")) {
        return;
    }

    const state = backtestStore.getState();
    let cash = state.capital?.cash ?? 0;
    let useCash = roundDown(cash * (capitalPct / 100));

    if (cash - useCash < cashFloor) {
        return;
    }

    const shares = roundDown(useCash / price);
    useCash = shares * price;
    const toBuy = price * (1 - buyBelowPct / 100);
    const toSell = price * (1 + sellAbovePct / 100);
    cash -= useCash;

    const orderData: BuyOrderData = {
        id: generateOrderId(),
        timestamp,
        shares,
        toBuy,
        toSell,
        price,
        buyAtId,
        orderGapPct,
    };

    // Force collect price, equity, and cash at order execution time
    if (priceCollector) {
        const state = backtestStore.getState();
        const equity = calculateEquity(
            cash,
            state.openTrades,
            price
        );
        priceCollector.forceCollectPrice(timestamp, price, equity, cash);
    }

    executeBuyOrder(orderData, orderTracker, priceCollector);
    setCapital(cash);
}

export function addSellOrder(
    buyBelowPct: number,
    buyAfterSellPct: number,
    timestamp: string,
    price: number,
    sellActionId: string,
    tradeId: string,
    shares: number,
    orderGapPct: number,
    orderTracker?: OrderTracker,
    priceCollector?: PriceCollector
): void {
    if (!isTradingAllowed(timestamp, "sell", tradeId)) {
        return;
    }

    const state = backtestStore.getState();
    let cash = state.capital?.cash ?? 0;
    const proceeds = price * shares;
    cash += proceeds;

    const downPrice = price * (1 - buyBelowPct / 100);
    const upPrice = price * (1 + buyAfterSellPct / 100);

    // Force collect price, equity, and cash at order execution time
    if (priceCollector) {
        const state = backtestStore.getState();
        const equity = calculateEquity(
            cash,
            state.openTrades,
            price
        );
        priceCollector.forceCollectPrice(timestamp, price, equity, cash);
    }

    executeSellOrder(
        generateOrderId(),
        shares,
        price,
        timestamp,
        [downPrice, upPrice],
        sellActionId,
        tradeId,
        orderGapPct,
        orderTracker,
        priceCollector
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
