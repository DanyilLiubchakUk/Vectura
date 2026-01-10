import {
    Itrade,
    IorderAction,
    IsellAction,
    backtestStore,
} from "@/utils/zustand/backtestStore";
import { updatePdtStatusWithTrade } from "@/backtest/pdt/pdtManager";
import {
    filterToBuyActions,
    createBuyOrderAction,
    createSellOrderAction,
} from "@/backtest/orders/orderManager";
import { MetricsTracker } from "@/backtest/core/metrics-tracker";
import { PriceCollector } from "@/backtest/core/price-collector";
import { OrderTracker } from "@/backtest/core/order-tracker";
import { calculateEquity } from "@/backtest/utils/helpers";

export interface BuyOrderData {
    id: string;
    timestamp: string;
    shares: number;
    toBuy: number;
    toSell: number;
    price: number;
    buyAtId: string;
    orderGapPct?: number;
}

export function executeBuyOrder(
    orderData: BuyOrderData,
    orderTracker?: OrderTracker,
    priceCollector?: PriceCollector,
    metricsTracker?: MetricsTracker
): void {
    backtestStore.setState((state) => {
        // Track executed buy order
        if (orderTracker) {
            const executedBuyOrder = state.actions.toBuy.find(o => o.id === orderData.buyAtId);
            if (executedBuyOrder) {
                orderTracker.markExecuted(executedBuyOrder.id, orderData.timestamp);
            }
        }

        const newTrade: Itrade = {
            id: orderData.id,
            tradeType: "buy",
            timeStamp: orderData.timestamp,
            shares: orderData.shares,
            price: orderData.price,
        };

        // Record trade execution in metrics tracker
        if (metricsTracker) {
            metricsTracker.recordTrade();
        }

        const updatedPdtStatus = updatePdtStatusWithTrade(
            state.pdtStatus,
            state.tradeHistory,
            newTrade,
            orderData.timestamp
        );

        const followUpBuyAction: IorderAction = createBuyOrderAction(
            orderData.toBuy,
            "below"
        );

        const newSellAction: IsellAction = createSellOrderAction(
            orderData.toSell,
            orderData.shares,
            orderData.id,
            "higher"
        );

        if (orderTracker) {
            orderTracker.trackBuyOrder(followUpBuyAction, orderData.timestamp);
            orderTracker.trackSellOrder(newSellAction, orderData.timestamp);
        }

        const ordersBeforeFilter = [
            ...state.actions.toBuy.filter(
                (buyAt) => buyAt.id !== orderData.buyAtId
            ),
            followUpBuyAction,
        ];
        const filteredToBuy = filterToBuyActions(
            ordersBeforeFilter,
            orderData.orderGapPct
        );

        // Remove filtered-out orders from tracker
        if (orderTracker) {
            const filteredIds = new Set(filteredToBuy.map(o => o.id));

            ordersBeforeFilter.forEach(order => {
                if (!filteredIds.has(order.id)) {
                    orderTracker.removeOrder(order.id);
                }
            });
        }

        const newState = {
            ...state,
            actions: {
                toBuy: filteredToBuy,
                toSell: [...state.actions.toSell, newSellAction],
            },
            tradeHistory: [...state.tradeHistory, newTrade],
            openTrades: [
                ...state.openTrades,
                {
                    price: orderData.price,
                    shares: orderData.shares,
                    timeStamp: orderData.timestamp,
                    id: orderData.id,
                },
            ],
            pdtStatus: updatedPdtStatus,
        };

        return newState;
    });

    // Force collect price, equity, and cash at execution point (after state update)
    // Get equity from backtestState.ts calculation (correct source)
    if (priceCollector) {
        const state = backtestStore.getState();
        if (state.capital) {
            const equity = calculateEquity(
                state.capital.cash,
                state.openTrades,
                orderData.price
            );
            priceCollector.forceCollectPrice(orderData.timestamp, orderData.price, equity, state.capital.cash);
        }
    }
}

export function executeSellOrder(
    id: string,
    shares: number,
    price: number,
    timestamp: string,
    toBuy: [number, number],
    sellActionId: string,
    tradeId: string,
    orderGapPct?: number,
    orderTracker?: OrderTracker,
    priceCollector?: PriceCollector,
    metricsTracker?: MetricsTracker
): void {
    backtestStore.setState((state) => {
        // Track executed sell order
        if (orderTracker) {
            const executedSellOrder = state.actions.toSell.find(o => o.id === sellActionId);
            if (executedSellOrder) {
                orderTracker.markExecuted(executedSellOrder.id, timestamp);
            }
        }

        const newTrade: Itrade = {
            id,
            tradeType: "sell",
            timeStamp: timestamp,
            shares,
            price,
            closesTradeId: tradeId,
        };

        // Record trade execution in metrics tracker
        if (metricsTracker) {
            metricsTracker.recordTrade();
        }

        const updatedPdtStatus = updatePdtStatusWithTrade(
            state.pdtStatus,
            state.tradeHistory,
            newTrade,
            timestamp
        );

        const updatedOpenTrades = state.openTrades.filter(
            (trade) => trade.id !== tradeId
        );

        const buyBelowAction = createBuyOrderAction(toBuy[0], "below");
        const buyAboveAction = createBuyOrderAction(toBuy[1], "higher");

        if (orderTracker) {
            orderTracker.trackBuyOrder(buyBelowAction, timestamp);
            orderTracker.trackBuyOrder(buyAboveAction, timestamp);
        }

        const ordersBeforeFilter = [...state.actions.toBuy, buyBelowAction, buyAboveAction];
        const filteredToBuy = filterToBuyActions(
            ordersBeforeFilter,
            orderGapPct
        );

        // Remove filtered-out orders from tracker
        if (orderTracker) {
            const filteredIds = new Set(filteredToBuy.map(o => o.id));

            ordersBeforeFilter.forEach(order => {
                if (!filteredIds.has(order.id)) {
                    orderTracker.removeOrder(order.id);
                }
            });
        }

        const newState = {
            ...state,
            actions: {
                toBuy: filteredToBuy,
                toSell: state.actions.toSell.filter(
                    (sellAt) => sellAt.id !== sellActionId
                ),
            },
            tradeHistory: [...state.tradeHistory, newTrade],
            openTrades: updatedOpenTrades,
            pdtStatus: updatedPdtStatus,
        };

        return newState;
    });

    // Force collect price, equity, and cash at execution point (after state update)
    // Get equity from backtestState.ts calculation (correct source)
    if (priceCollector) {
        const state = backtestStore.getState();
        if (state.capital) {
            const equity = calculateEquity(
                state.capital.cash,
                state.openTrades,
                price
            );
            priceCollector.forceCollectPrice(timestamp, price, equity, state.capital.cash);
        }
    }
}
