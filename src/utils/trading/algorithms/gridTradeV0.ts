import {
    updateEquity,
    getActionNeededOrders,
    addBuyOrder,
    addSellOrder,
} from "@/utils/trading/tradeRouter";
import { getAlgoConfigOrDefault } from "@/utils/supabase/autoTradeStorage";

export const GRID_TRADE_V0_DEFAULT_CONFIG = {
    Xc: 60, // Percentage of capital to use per buy (N %)
    Xb: 2, // Percentage below current price to set NextBuyOn (N %)
    Xs: 18, // Percentage above buy price to set SellOn (N %)
    Xu: 2, // Percentage higher to buy more after each sell (N %)
    Xl: 200, // Dollar amount cash floor
    Xg: 1.5, // Percent gap to join orders (N %), use -1 to disable filtering
} as const;

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
            config.Xb,
            config.Xs,
            config.Xc,
            config.Xl,
            time,
            currentPrice,
            buyOrder.id,
            config.Xg
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
            config.Xb,
            config.Xu,
            time,
            currentPrice,
            sellOrder.id,
            sellOrder.tradeId,
            sellOrder.shares,
            config.Xg
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
