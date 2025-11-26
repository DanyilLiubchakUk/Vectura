import {
    IorderAction,
    IsellAction,
    backtestStore,
} from "@/utils/zustand/backtestStore";
import { generateOrderId } from "@/backtest/utils/helpers";
import { PERCENT_GAP_TO_JOIN } from "@/backtest/constants";

export function filterToBuyActions(
    orders: IorderAction[],
    percentGap: number = PERCENT_GAP_TO_JOIN
): IorderAction[] {
    if (orders.length === 0) return [];

    const sorted = [...orders].sort((a, b) => a.atPrice - b.atPrice);
    const isClose = (a: number, b: number) =>
        (Math.abs(a - b) / a) * 100 <= percentGap;

    const result: IorderAction[] = [];
    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
        const next = sorted[i];

        if (
            current.belowOrHigher === next.belowOrHigher &&
            isClose(current.atPrice, next.atPrice)
        ) {
            if (current.belowOrHigher === "below") {
                current = current.atPrice <= next.atPrice ? current : next;
            } else {
                current = current.atPrice >= next.atPrice ? current : next;
            }
        } else {
            result.push(current);
            current = next;
        }
    }

    result.push(current);
    return result;
}

export function getActionNeededOrders(
    currentPrice: number,
    timestamp: string,
    isTradingAllowed: (
        timestamp: string,
        tradeType?: "buy" | "sell",
        tradeId?: string
    ) => boolean
): {
    toBuyOrders: { id: string }[];
    toSellOrders: { id: string; tradeId: string; shares: number }[];
} {
    const state = backtestStore.getState();

    const needToBuy = state.actions.toBuy
        .filter((buyOrder) => {
            const priceMatches =
                buyOrder.belowOrHigher === "below"
                    ? currentPrice <= buyOrder.atPrice
                    : currentPrice >= buyOrder.atPrice;

            if (!priceMatches) return false;
            return isTradingAllowed(timestamp, "buy");
        })
        .map((buyOrder) => ({ id: buyOrder.id }));

    const needToSell = state.actions.toSell
        .filter((sellOrder) => {
            const priceMatches =
                sellOrder.belowOrHigher === "higher"
                    ? currentPrice >= sellOrder.atPrice
                    : currentPrice <= sellOrder.atPrice;

            if (!priceMatches) return false;
            return isTradingAllowed(timestamp, "sell", sellOrder.tradeId);
        })
        .map((sellOrder) => ({
            id: sellOrder.id,
            shares: sellOrder.shares,
            tradeId: sellOrder.tradeId,
        }));

    return {
        toBuyOrders: needToBuy,
        toSellOrders: needToSell,
    };
}

export function createBuyOrderAction(
    price: number,
    belowOrHigher: "below" | "higher" = "below"
): IorderAction {
    return {
        id: generateOrderId(),
        atPrice: price,
        belowOrHigher,
    };
}

export function createSellOrderAction(
    price: number,
    shares: number,
    tradeId: string,
    belowOrHigher: "below" | "higher" = "higher"
): IsellAction {
    return {
        id: generateOrderId(),
        atPrice: price,
        shares,
        tradeId,
        belowOrHigher,
    };
}
