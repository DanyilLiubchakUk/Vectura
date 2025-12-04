import { IorderAction, IsellAction } from "@/utils/zustand/autoTradeStore";
import { PERCENT_GAP_TO_JOIN } from "@/backtest/constants";
import { generateOrderId } from "@/auto-trade/utils/helpers";

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
export function createBuyOrderAction(
    price: number,
    belowOrHigher: "below" | "higher" = "below",
    timestamp: string
): IorderAction {
    return {
        id: generateOrderId(timestamp),
        atPrice: price,
        belowOrHigher,
    };
}
export function createSellOrderAction(
    price: number,
    shares: number,
    tradeId: string,
    timestamp: string,
    belowOrHigher: "below" | "higher" = "higher"
): IsellAction {
    return {
        id: generateOrderId(timestamp),
        atPrice: price,
        shares,
        tradeId,
        belowOrHigher,
    };
}
