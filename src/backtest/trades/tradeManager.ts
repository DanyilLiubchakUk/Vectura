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

export function executeBuyOrder(orderData: BuyOrderData): void {
    backtestStore.setState((state) => {
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

        const filteredToBuy = filterToBuyActions(
            [
                ...state.actions.toBuy.filter(
                    (buyAt) => buyAt.id !== orderData.buyAtId
                ),
                followUpBuyAction,
            ],
            orderData.orderGapPct
        );

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
    orderGapPct?: number
): void {
    backtestStore.setState((state) => {
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

        const filteredToBuy = filterToBuyActions(
            [...state.actions.toBuy, buyBelowAction, buyAboveAction],
            orderGapPct
        );

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
