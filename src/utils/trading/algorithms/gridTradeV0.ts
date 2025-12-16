import {
    updateEquity,
    getActionNeededOrders,
    addBuyOrder,
    addSellOrder,
} from "@/utils/trading/tradeRouter";
import { getAlgoConfigOrDefault } from "@/utils/supabase/autoTradeStorage";
import { GRID_TRADE_V0_DEFAULT_CONFIG } from "@/utils/trading/algorithms/constants";

export default async function gridTradeV0(
    stock: string,
    backtesting: boolean = false,
    currentPrice: number,
    time: string
): Promise<string> {
    let summaryMessage =
        "This time waited for changes in the market for a better trade";
    const actionsSummary: string[] = [];
    await updateEquity(backtesting, currentPrice, time);

    const config = backtesting
        ? GRID_TRADE_V0_DEFAULT_CONFIG
        : await getAlgoConfigOrDefault();

    const { toBuyOrders, toSellOrders } = await getActionNeededOrders(
        backtesting,
        currentPrice,
        time
    );

    for (const buyOrder of toBuyOrders) {
        const result = await addBuyOrder(
            backtesting,
            config.buyBelowPct,
            config.sellAbovePct,
            config.capitalPct,
            config.cashFloor,
            time,
            currentPrice,
            buyOrder.id,
            config.orderGapPct
        );

        if (!backtesting && result) {
            actionsSummary.push(
                `Bought ${result.shares} shares at $${result.price.toFixed(2)}`
            );
        }

        if (!backtesting) {
            await updateEquity(backtesting, currentPrice, time);
        }
    }

    for (const sellOrder of toSellOrders) {
        const result = await addSellOrder(
            backtesting,
            config.buyBelowPct,
            config.buyAfterSellPct,
            time,
            currentPrice,
            sellOrder.id,
            sellOrder.tradeId,
            sellOrder.shares,
            config.orderGapPct
        );

        if (!backtesting && result) {
            actionsSummary.push(
                `Sold ${result.shares} shares at $${result.price.toFixed(2)}`
            );
        }

        if (!backtesting) {
            await updateEquity(backtesting, currentPrice, time);
        }
    }

    if (!backtesting && actionsSummary.length > 0) {
        summaryMessage = actionsSummary.join("; ");
    }

    return summaryMessage;
}
