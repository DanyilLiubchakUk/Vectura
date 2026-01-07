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
import { PriceCollector } from "@/backtest/core/price-collector";
import { OrderTracker } from "@/backtest/core/order-tracker";

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
    priceCollector?: PriceCollector
): void {
    backtestStore.setState((state) => {
        // Track executed buy order
        if (orderTracker) {
            const executedBuyOrder = state.actions.toBuy.find(o => o.id === orderData.buyAtId);
            if (executedBuyOrder) {
                orderTracker.markExecuted(executedBuyOrder.id, orderData.timestamp);
            }
        }

        if (priceCollector) {
            priceCollector.forceCollectPrice(orderData.timestamp, orderData.price);
        }

        const newTrade: Itrade = {
            id: orderData.id,
            tradeType: "buy",
            timeStamp: orderData.timestamp,
            shares: orderData.shares,
            price: orderData.price,
        };

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
            if (priceCollector) {
                priceCollector.forceCollectPrice(orderData.timestamp, orderData.price);
            }
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
    priceCollector?: PriceCollector
): void {
    backtestStore.setState((state) => {
        // Track executed sell order
        if (orderTracker) {
            const executedSellOrder = state.actions.toSell.find(o => o.id === sellActionId);
            if (executedSellOrder) {
                orderTracker.markExecuted(executedSellOrder.id, timestamp);
            }
        }

        if (priceCollector) {
            priceCollector.forceCollectPrice(timestamp, price);
        }

        const newTrade: Itrade = {
            id,
            tradeType: "sell",
            timeStamp: timestamp,
            shares,
            price,
            closesTradeId: tradeId,
        };

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
            if (priceCollector) {
                priceCollector.forceCollectPrice(timestamp, price);
            }
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
}
