import {
    SSplitInfo,
    STradeHistory,
    SToSell,
    SToBuy,
    SOpenTrade,
} from "@/utils/supabase/autoTradeTypes";
import {
    IorderAction,
    IsellAction,
    IpdtDay,
    IopenTrade,
} from "@/utils/zustand/autoTradeStore";
import {
    GRID_TRADE_V0_DEFAULT_CONFIG,
    TRADE_SYMBOL,
    TRADING_ALGORITHM,
    UPDATE_AFTER_NEW_SPLIT_BATCH_SIZE,
} from "@/auto-trade/constants";
import { supabase } from "@/utils/supabase/supabaseClient";
import { fetchSplitsFromAlphaVantage } from "../alphavantage/splits";

export async function getSplits(time: string): Promise<{
    lastSplitCheck: string;
    lastSplits: SSplitInfo[];
}> {
    const { data, error } = await supabase
        .from("at_trade_summary")
        .select("splits_last_updated_at, splits")
        .eq("symbol", TRADE_SYMBOL)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }
    if (data === null) {
        await initializeAutoTrade(time);
        return await getSplits(time);
    }
    return {
        lastSplitCheck: data.splits_last_updated_at,
        lastSplits: data.splits,
    };
}
export async function getDBtradingData(time: string): Promise<{
    start: string;
    cashMax: number;
    equityMax: number;
    toBuy: IorderAction[];
    toSell: IsellAction[];
    pdtDays: IpdtDay[];
}> {
    const { data: maxData, error: maxError } = await supabase
        .from("at_trade_summary")
        .select("max_cash, max_equity, pdt_days, session_start, session_end")
        .eq("symbol", TRADE_SYMBOL)
        .maybeSingle();
    if (maxError) {
        throw new Error(maxError.message);
    }
    if (maxData === null) {
        await initializeAutoTrade(time);
        return await getDBtradingData(time);
    }

    let start = maxData.session_start;

    if (!start) {
        const { data: startData, error: startError } = await supabase
            .from("at_trade_history")
            .select("timestamp")
            .order("timestamp", { ascending: true })
            .limit(1);
        if (startError) {
            throw new Error(startError.message);
        }

        if (startData && startData.length > 0 && startData[0].timestamp) {
            start = startData[0].timestamp;
            await updateSummaryStartTime(start);
        }
    }

    const cashMax = maxData.max_cash;
    const equityMax = maxData.max_equity;
    const pdtDays = maxData.pdt_days;

    const { data: toBuyData, error: toBuyError } = await supabase
        .from("at_to_buy")
        .select("id, at_price, below_or_higher")
        .order("at_price", { ascending: true });
    if (toBuyError) {
        throw new Error(toBuyError.message);
    }

    const { data: toSellData, error: toSellError } = await supabase
        .from("at_to_sell")
        .select("id, at_price, below_or_higher, shares, trade_id")
        .order("at_price", { ascending: true });
    if (toSellError) {
        throw new Error(toSellError.message);
    }

    const toBuy: IorderAction[] = (toBuyData || []).map((record: SToBuy) => ({
        id: record.id,
        atPrice: (record.at_price ?? 0) as number,
        belowOrHigher: record.below_or_higher === "below" ? "below" : "higher",
    }));

    const toSell: IsellAction[] = (toSellData || []).map((record: SToSell) => ({
        id: record.id,
        atPrice: (record.at_price ?? 0) as number,
        belowOrHigher: record.below_or_higher === "below" ? "below" : "higher",
        shares: (record.shares ?? 0) as number,
        tradeId: record.trade_id,
    }));

    return {
        start,
        cashMax,
        equityMax,
        toBuy,
        toSell,
        pdtDays,
    };
}
export async function getAlgoConfigOrDefault(): Promise<{
    Xc: number;
    Xb: number;
    Xs: number;
    Xl: number;
}> {
    const { data, error } = await supabase
        .from("at_algo_config")
        .select("xc, xb, xs, xl")
        .eq("symbol", TRADE_SYMBOL)
        .eq("algorithm", TRADING_ALGORITHM)
        .maybeSingle();

    if (error) {
        console.error("[autoTradeStorage] Error fetching algo config", error);
        return GRID_TRADE_V0_DEFAULT_CONFIG;
    }

    if (!data) {
        const insertResult = await supabase.from("at_algo_config").insert({
            symbol: TRADE_SYMBOL,
            algorithm: TRADING_ALGORITHM,
            xc: GRID_TRADE_V0_DEFAULT_CONFIG.Xc,
            xb: GRID_TRADE_V0_DEFAULT_CONFIG.Xb,
            xs: GRID_TRADE_V0_DEFAULT_CONFIG.Xs,
            xl: GRID_TRADE_V0_DEFAULT_CONFIG.Xl,
        });

        if (insertResult.error) {
            console.error(
                "[autoTradeStorage] Error inserting default algo config",
                insertResult.error
            );
        }

        return GRID_TRADE_V0_DEFAULT_CONFIG;
    }

    return {
        Xc: Number(data.xc ?? GRID_TRADE_V0_DEFAULT_CONFIG.Xc),
        Xb: Number(data.xb ?? GRID_TRADE_V0_DEFAULT_CONFIG.Xb),
        Xs: Number(data.xs ?? GRID_TRADE_V0_DEFAULT_CONFIG.Xs),
        Xl: Number(data.xl ?? GRID_TRADE_V0_DEFAULT_CONFIG.Xl),
    };
}
export async function updateSplitsInDatabase(
    symbol: string,
    splits: SSplitInfo[],
    lastSplitCheck: string
): Promise<void> {
    const { error } = await supabase
        .from("at_trade_summary")
        .update({
            splits: splits,
            splits_last_updated_at: lastSplitCheck,
        })
        .eq("symbol", symbol);

    if (error) {
        console.error("[supabaseTradingSummary] Error updating splits", {
            symbol,
            error,
        });
        throw error;
    }
}
export async function fetchTradeHistoryBatch(
    offset: number
): Promise<STradeHistory[]> {
    const { data, error } = await supabase
        .from("at_trade_history")
        .select("*")
        .range(offset, offset + UPDATE_AFTER_NEW_SPLIT_BATCH_SIZE - 1)
        .order("id");

    if (error) {
        console.error("[autoTradeStorage] Error fetching trade history batch", {
            offset,
            UPDATE_AFTER_NEW_SPLIT_BATCH_SIZE,
            error,
        });
        throw error;
    }

    return data || [];
}
export async function updateTradeHistoryBatch(
    records: STradeHistory[]
): Promise<void> {
    if (records.length === 0) {
        return;
    }

    const updated = records.map((record) => ({
        ...record,
        price: record.price,
    }));

    const { error } = await supabase.from("at_trade_history").upsert(updated);

    if (error) {
        console.error("[autoTradeStorage] Error updating trade history batch", {
            recordCount: records.length,
            error,
        });
        throw error;
    }
}
export async function getTradeHistoryCount(): Promise<number> {
    const { count, error } = await supabase
        .from("at_trade_history")
        .select("*", { count: "exact", head: true });

    if (error) {
        console.error("[autoTradeStorage] Error getting trade history count", {
            error,
        });
        throw error;
    }

    return count || 0;
}
export async function fetchToBuyBatch(offset: number): Promise<SToBuy[]> {
    const { data, error } = await supabase
        .from("at_to_buy")
        .select("*")
        .range(offset, offset + UPDATE_AFTER_NEW_SPLIT_BATCH_SIZE - 1)
        .order("id");

    if (error) {
        console.error("[autoTradeStorage] Error fetching to_buy batch", {
            offset,
            UPDATE_AFTER_NEW_SPLIT_BATCH_SIZE,
            error,
        });
        throw error;
    }

    return data || [];
}
export async function updateToBuyBatch(records: SToBuy[]): Promise<void> {
    if (records.length === 0) {
        return;
    }

    const updated = records.map((record) => ({
        ...record,
        at_price: record.at_price,
    }));

    const { error } = await supabase.from("at_to_buy").upsert(updated);

    if (error) {
        console.error("[autoTradeStorage] Error updating to_buy batch", {
            recordCount: records.length,
            error,
        });
        throw error;
    }
}
export async function getToBuyCount(): Promise<number> {
    const { count, error } = await supabase
        .from("at_to_buy")
        .select("*", { count: "exact", head: true });

    if (error) {
        console.error("[autoTradeStorage] Error getting to_buy count", {
            error,
        });
        throw error;
    }

    return count || 0;
}
export async function fetchToSellBatch(offset: number): Promise<SToSell[]> {
    const { data, error } = await supabase
        .from("at_to_sell")
        .select("*")
        .range(offset, offset + UPDATE_AFTER_NEW_SPLIT_BATCH_SIZE - 1)
        .order("id");

    if (error) {
        console.error("[autoTradeStorage] Error fetching to_sell batch", {
            offset,
            UPDATE_AFTER_NEW_SPLIT_BATCH_SIZE,
            error,
        });
        throw error;
    }

    return data || [];
}
export async function updateToSellBatch(records: SToSell[]): Promise<void> {
    if (records.length === 0) {
        return;
    }

    const updated = records.map((record) => ({
        ...record,
        at_price: record.at_price,
    }));

    const { error } = await supabase.from("at_to_sell").upsert(updated);

    if (error) {
        console.error("[autoTradeStorage] Error updating to_sell batch", {
            recordCount: records.length,
            error,
        });
        throw error;
    }
}
export async function getToSellCount(): Promise<number> {
    const { count, error } = await supabase
        .from("at_to_sell")
        .select("*", { count: "exact", head: true });

    if (error) {
        console.error("[autoTradeStorage] Error getting to_sell count", {
            error,
        });
        throw error;
    }

    return count || 0;
}
export async function getOpenTradeById(
    tradeId: string
): Promise<IopenTrade | null> {
    const { data, error } = await supabase
        .from("at_open_trades")
        .select("id, timestamp, price, shares")
        .eq("id", tradeId)
        .single();

    if (error) {
        if (error.code === "PGRST116") {
            // No rows returned
            return null;
        }
        throw new Error(error.message);
    }

    if (!data) {
        return null;
    }

    return {
        id: data.id,
        timeStamp: data.timestamp ?? "",
        price: (data.price ?? 0) as number,
        shares: (data.shares ?? 0) as number,
    };
}
export async function saveTradeHistory(record: STradeHistory): Promise<void> {
    const { error } = await supabase.from("at_trade_history").insert(record);

    if (error) {
        throw new Error(error.message);
    }
}
export async function saveOpenTrade(record: SOpenTrade): Promise<void> {
    const { error } = await supabase.from("at_open_trades").insert(record);

    if (error) {
        throw new Error(error.message);
    }
}
export async function deleteOpenTrade(tradeId: string): Promise<void> {
    const { error } = await supabase
        .from("at_open_trades")
        .delete()
        .eq("id", tradeId);

    if (error) {
        throw new Error(error.message);
    }
}
export async function deleteToBuyOrder(orderId: string): Promise<void> {
    const { error } = await supabase
        .from("at_to_buy")
        .delete()
        .eq("id", orderId);

    if (error) {
        throw new Error(error.message);
    }
}
export async function saveToSellOrder(record: SToSell): Promise<void> {
    const { error } = await supabase.from("at_to_sell").upsert(record);

    if (error) {
        throw new Error(error.message);
    }
}
export async function deleteToSellOrder(orderId: string): Promise<void> {
    const { error } = await supabase
        .from("at_to_sell")
        .delete()
        .eq("id", orderId);

    if (error) {
        throw new Error(error.message);
    }
}
export async function updatePdtDays(pdtDays: IpdtDay[]): Promise<void> {
    const { error } = await supabase
        .from("at_trade_summary")
        .update({ pdt_days: pdtDays })
        .eq("symbol", TRADE_SYMBOL);

    if (error) {
        throw new Error(error.message);
    }
}
export async function updateSummaryMaxes(
    cashMax: number,
    equityMax: number
): Promise<void> {
    const { error } = await supabase
        .from("at_trade_summary")
        .update({ max_cash: cashMax, max_equity: equityMax })
        .eq("symbol", TRADE_SYMBOL);

    if (error) {
        throw new Error(error.message);
    }
}
export async function updateSummaryStartTime(startTime: string): Promise<void> {
    const { error } = await supabase
        .from("at_trade_summary")
        .update({ session_start: startTime })
        .eq("symbol", TRADE_SYMBOL)
        .is("session_start", null);

    if (error) {
        throw new Error(error.message);
    }
}
export async function updateSummaryEndTime(endTime: string): Promise<void> {
    const { error } = await supabase
        .from("at_trade_summary")
        .update({ session_end: endTime })
        .eq("symbol", TRADE_SYMBOL);

    if (error) {
        throw new Error(error.message);
    }
}
export async function syncToBuyOrders(
    newOrders: IorderAction[],
    existingOrderIds: string[]
): Promise<void> {
    // Get IDs of new orders
    const newOrderIds = new Set(newOrders.map((o) => o.id));

    // Delete orders that are no longer in the filtered list
    const ordersToDelete = existingOrderIds.filter(
        (id) => !newOrderIds.has(id)
    );
    for (const id of ordersToDelete) {
        await deleteToBuyOrder(id);
    }

    // Upsert all new orders
    for (const order of newOrders) {
        await saveToBuyOrder({
            id: order.id,
            at_price: order.atPrice,
            below_or_higher: order.belowOrHigher,
        });
    }
}

async function initializeAutoTrade(initialTime: string) {
    let initialSplits = await fetchSplitsFromAlphaVantage(TRADE_SYMBOL);

    if (initialSplits === null) {
        initialSplits = [];
        console.error("Error fetching initial splits");
    }

    const { error: summaryError } = await supabase
        .from("at_trade_summary")
        .insert({
            symbol: TRADE_SYMBOL,
            max_cash: 0,
            max_equity: 0,
            splits_last_updated_at: initialTime,
            splits: initialSplits,
            pdt_days: [],
            session_start: null,
            session_end: null,
        });
    if (summaryError) {
        throw new Error(summaryError.message);
    }

    const { error: buyError } = await supabase.from("at_to_buy").insert({
        id: "firstOrder",
        at_price: -1,
        below_or_higher: "higher",
    });
    if (buyError) {
        throw new Error(buyError.message);
    }
}
async function saveToBuyOrder(record: SToBuy): Promise<void> {
    const { error } = await supabase.from("at_to_buy").upsert(record);

    if (error) {
        throw new Error(error.message);
    }
}
