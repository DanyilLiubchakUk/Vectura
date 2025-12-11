import placeOrder from "@/utils/alpaca/placeOrder";
import {
    getDBtradingData,
    saveTradeHistory,
    saveOpenTrade,
    deleteOpenTrade,
    saveToSellOrder,
    deleteToSellOrder,
    updatePdtDays,
    syncToBuyOrders,
    updateSummaryMaxes,
    updateSummaryEndTime,
    updateSummaryStartTime,
} from "@/utils/supabase/autoTradeStorage";
import {
    filterToBuyActions,
    createBuyOrderAction,
    createSellOrderAction,
} from "@/auto-trade/orders/orderManager";
import {
    isTradingAllowed,
    updatePdtStatusWithAlpacaCount,
} from "@/auto-trade/pdt/pdtManager";
import { generateOrderId, roundDown } from "@/auto-trade/utils/helpers";
import { getFilteredAccountInfo } from "@/utils/alpaca/getTradingData";
import { autoTradeStorage } from "@/utils/zustand/autoTradeStore";
import { STradeHistory } from "@/utils/supabase/autoTradeTypes";
import { TRADE_SYMBOL } from "@/auto-trade/constants";
import { EtradeSide } from "@/types/alpaca";

interface BuyOrderData {
    id: string;
    timestamp: string;
    shares: number;
    toBuy: number;
    toSell: number;
    price: number;
    buyAtId: string;
    Xg?: number;
}

export async function updateStore(time: string) {
    const {
        data: accountInfo,
        success,
        error,
    } = await getFilteredAccountInfo();
    if (!success) {
        throw new Error(error);
    }
    const { start, cashMax, equityMax, toBuy, toSell, pdtDays } =
        await getDBtradingData(time);

    const nextCashMax = Math.max(cashMax, Number(accountInfo?.cash));
    const nextEquityMax = Math.max(equityMax, Number(accountInfo?.equity));
    const alpacaDaytradeCount = Number(accountInfo?.daytrade_count);

    // Update PDT days based on Alpaca daytrade_count
    const updatedPdtDays = updatePdtStatusWithAlpacaCount(
        pdtDays,
        alpacaDaytradeCount,
        time
    );

    // Persist maxes, updated PDT days, and end time to database
    await updateSummaryMaxes(nextCashMax, nextEquityMax);
    await updatePdtDays(updatedPdtDays);
    await updateSummaryEndTime(time);

    // If start is still not set, initialize it to current time
    let finalStart = start;
    if (!start) {
        finalStart = time;
        await updateSummaryStartTime(time);
    }

    autoTradeStorage.setState((state) => {
        return {
            ...state,
            session: {
                end: time,
                start: finalStart,
            },
            capital: {
                cashMax: nextCashMax,
                equityMax: nextEquityMax,
                cash: Number(accountInfo?.cash),
                equity: Number(accountInfo?.equity),
            },
            actions: {
                toBuy,
                toSell,
            },
            pdtCount: alpacaDaytradeCount,
            pdtDays: updatedPdtDays,
        };
    });
}
export async function getAutoTradeActionNeeded(
    currentPrice: number,
    timestamp: string
): Promise<{
    toBuyOrders: { id: string }[];
    toSellOrders: { id: string; tradeId: string; shares: number }[];
}> {
    const state = autoTradeStorage.getState();

    // Get filtered by price buy array
    const needToBuy = state.actions.toBuy
        .filter((buyOrder) => {
            const priceMatches =
                buyOrder.belowOrHigher === "below"
                    ? currentPrice <= buyOrder.atPrice
                    : currentPrice >= buyOrder.atPrice;
            return priceMatches;
        })
        .map((buyOrder) => ({ id: buyOrder.id }));

    // Get filtered by price, and PDT rule sell array
    const needToSell = await Promise.all(
        state.actions.toSell
            .filter((sellOrder) => {
                const priceMatches =
                    sellOrder.belowOrHigher === "higher"
                        ? currentPrice >= sellOrder.atPrice
                        : currentPrice <= sellOrder.atPrice;
                return priceMatches;
            })
            .map(async (sellOrder) => {
                const allowed = await isTradingAllowed(
                    timestamp,
                    "sell",
                    sellOrder.tradeId
                );
                return { sellOrder, allowed };
            })
    );

    const filteredToSell = needToSell
        .filter(({ allowed }) => allowed)
        .map(({ sellOrder }) => ({
            id: sellOrder.id,
            shares: sellOrder.shares,
            tradeId: sellOrder.tradeId,
        }));

    return {
        toBuyOrders: needToBuy,
        toSellOrders: filteredToSell,
    };
}
export async function addAutoTradeBuyOrder(
    Xb: number,
    Xs: number,
    Xc: number,
    Xl: number,
    timestamp: string,
    price: number,
    buyAtId: string,
    Xg?: number
): Promise<{ price: number; shares: number } | null> {
    // Check trading allowed first
    if (!(await isTradingAllowed(timestamp, "buy"))) {
        return null;
    }

    const state = autoTradeStorage.getState();
    let cash = state.capital?.cash ?? 0;
    let useCash = roundDown(cash * (Xc / 100));

    // If executing a buy trade will reduce cash below Xl
    if (cash - useCash < Xl) {
        return null;
    }

    const shares = roundDown(useCash / price);
    useCash = shares * price;
    const toBuy = price * (1 - Xb / 100);
    const toSell = price * (1 + Xs / 100);
    cash -= useCash;

    const orderData: BuyOrderData = {
        id: generateOrderId(timestamp),
        timestamp,
        shares,
        toBuy,
        toSell,
        price,
        buyAtId,
        Xg,
    };

    const result = await executeBuyOrder(orderData);
    setCapital(cash);
    return result;
}
export async function addAutoTradeSellOrder(
    Xb: number,
    Xu: number,
    timestamp: string,
    price: number,
    sellActionId: string,
    tradeId: string,
    shares: number,
    Xg: number
): Promise<{ price: number; shares: number } | null> {
    // Check trading allowed first
    if (!(await isTradingAllowed(timestamp, "sell", tradeId))) {
        return null;
    }

    const state = autoTradeStorage.getState();
    let cash = state.capital?.cash ?? 0;
    const proceeds = price * shares;
    cash += proceeds;

    const downPrice = price * (1 - Xb / 100);
    const upPrice = price * (1 + Xu / 100);

    const result = await executeSellOrder(
        generateOrderId(timestamp),
        shares,
        price,
        timestamp,
        [downPrice, upPrice],
        sellActionId,
        tradeId,
        Xg
    );
    setCapital(cash);
    return result;
}

async function executeBuyOrder(
    orderData: BuyOrderData
): Promise<{ price: number; shares: number }> {
    const orderResult = await placeOrder(
        TRADE_SYMBOL,
        orderData.shares,
        EtradeSide.Buy
    );

    // If order was not filled (cancelled or failed), don't proceed with database updates
    if (!orderResult.success || !orderResult.filled) {
        throw new Error(
            orderResult.message ||
                `Buy order failed or was cancelled: ${
                    orderResult.orderId || "unknown"
                }`
        );
    }

    const state = autoTradeStorage.getState();

    const actualPrice = orderResult.filledPrice ?? orderData.price;

    const newTrade: STradeHistory = {
        id: orderData.id,
        timestamp: orderData.timestamp,
        trade_type: "buy",
        shares: orderData.shares,
        price: actualPrice,
        close_trade_id: null,
    };

    const {
        data: accountInfo,
        success: accountSuccess,
        error: accountError,
    } = await getFilteredAccountInfo();
    if (!accountSuccess) {
        throw new Error(accountError);
    }
    const freshDaytradeCount = Number(accountInfo?.daytrade_count);

    const updatedPdtStatus = updatePdtStatusWithAlpacaCount(
        state.pdtDays,
        freshDaytradeCount,
        orderData.timestamp
    );

    const followUpBuyAction = createBuyOrderAction(
        orderData.toBuy,
        "below",
        orderData.timestamp
    );

    const newSellAction = createSellOrderAction(
        orderData.toSell,
        orderData.shares,
        orderData.id,
        orderData.timestamp,
        "higher"
    );

    // Get current toBuy actions and filter
    const currentToBuy = state.actions.toBuy.filter(
        (buyAt) => buyAt.id !== orderData.buyAtId
    );
    const filteredToBuy = filterToBuyActions(
        [...currentToBuy, followUpBuyAction],
        orderData.Xg
    );

    // Save to database
    await saveTradeHistory(newTrade);
    await saveOpenTrade({
        id: orderData.id,
        timestamp: orderData.timestamp,
        price: orderData.price,
        shares: orderData.shares,
    });

    // Sync buy orders (delete removed ones, upsert all filtered ones)
    const existingBuyOrderIds = state.actions.toBuy.map((o) => o.id);
    await syncToBuyOrders(filteredToBuy, existingBuyOrderIds);

    // Save new sell order
    await saveToSellOrder({
        id: newSellAction.id,
        at_price: newSellAction.atPrice,
        below_or_higher: newSellAction.belowOrHigher,
        shares: newSellAction.shares,
        trade_id: newSellAction.tradeId,
    });

    // Update PDT days in database
    await updatePdtDays(updatedPdtStatus);

    autoTradeStorage.setState((state) => ({
        ...state,
        actions: {
            toBuy: filteredToBuy,
            toSell: [...state.actions.toSell, newSellAction],
        },
        pdtCount: freshDaytradeCount,
        pdtDays: updatedPdtStatus,
    }));

    return { price: actualPrice, shares: orderData.shares };
}
async function executeSellOrder(
    id: string,
    shares: number,
    price: number,
    timestamp: string,
    toBuy: [number, number],
    sellActionId: string,
    tradeId: string,
    Xg?: number
): Promise<{ price: number; shares: number }> {
    const orderResult = await placeOrder(TRADE_SYMBOL, shares, EtradeSide.Sell);

    // If order was not filled (cancelled or failed), don't proceed with database updates
    if (!orderResult.success || !orderResult.filled) {
        throw new Error(
            orderResult.message ||
                `Sell order failed or was cancelled: ${
                    orderResult.orderId || "unknown"
                }`
        );
    }

    const state = autoTradeStorage.getState();

    const actualPrice = orderResult.filledPrice ?? price;

    const newTrade: STradeHistory = {
        id,
        timestamp,
        trade_type: "sell",
        shares,
        price: actualPrice,
        close_trade_id: tradeId,
    };

    const {
        data: accountInfo,
        success: accountSuccess,
        error: accountError,
    } = await getFilteredAccountInfo();
    if (!accountSuccess) {
        throw new Error(accountError);
    }
    const freshDaytradeCount = Number(accountInfo?.daytrade_count);

    const updatedPdtStatus = updatePdtStatusWithAlpacaCount(
        state.pdtDays,
        freshDaytradeCount,
        timestamp
    );

    // Create buy actions
    const buyBelowAction = createBuyOrderAction(toBuy[0], "below", timestamp);
    const buyAboveAction = createBuyOrderAction(toBuy[1], "higher", timestamp);

    // Get current toBuy actions and filter
    const filteredToBuy = filterToBuyActions(
        [...state.actions.toBuy, buyBelowAction, buyAboveAction],
        Xg
    );

    // Save to database
    await saveTradeHistory(newTrade);
    await deleteOpenTrade(tradeId);
    await deleteToSellOrder(sellActionId);

    // Sync buy orders (delete removed ones, upsert all filtered ones)
    const existingBuyOrderIds = state.actions.toBuy.map((o) => o.id);
    await syncToBuyOrders(filteredToBuy, existingBuyOrderIds);

    await updatePdtDays(updatedPdtStatus);

    autoTradeStorage.setState((state) => ({
        ...state,
        actions: {
            toBuy: filteredToBuy,
            toSell: state.actions.toSell.filter(
                (sellAt) => sellAt.id !== sellActionId
            ),
        },
        pdtCount: freshDaytradeCount,
        pdtDays: updatedPdtStatus,
    }));

    return { price: actualPrice, shares };
}
function setCapital(value: number): void {
    autoTradeStorage.setState((state) => {
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
