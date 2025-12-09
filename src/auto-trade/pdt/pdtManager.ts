import {
    MAX_PDT_WINDOW,
    PDT_EQUITY_THRESHOLD,
} from "@/utils/trading/constants";
import { autoTradeStorage, IpdtDay } from "@/utils/zustand/autoTradeStore";
import { getOpenTradeById } from "@/utils/supabase/autoTradeStorage";
import { formatDay } from "@/auto-trade/utils/helpers";
import { supabase } from "@/utils/supabase/supabaseClient";

export function filterPdtStatusByDate(
    pdtStatus: IpdtDay[],
    currentTimestamp: string
): {
    filtered: IpdtDay[];
    currentDay: string;
    fiveDaysAgo: Date;
    currentDateObj: Date;
} {
    const currentDay = formatDay(new Date(currentTimestamp));
    const currentDateObj = new Date(currentDay);
    const fiveDaysAgo = new Date(currentDateObj);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - MAX_PDT_WINDOW);

    const filtered = pdtStatus
        .filter((day) => {
            const dayDate = new Date(day.date);
            return dayDate >= fiveDaysAgo && dayDate <= currentDateObj;
        })
        .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

    return { filtered, currentDay, fiveDaysAgo, currentDateObj };
}
export function updatePdtStatusWithAlpacaCount(
    currentPdtStatus: IpdtDay[],
    alpacaDaytradeCount: number,
    timestamp: string
): IpdtDay[] {
    const { filtered } = filterPdtStatusByDate(currentPdtStatus, timestamp);
    const currentDay = formatDay(new Date(timestamp));

    // Calculate sum of round trips in the last 5 days (excluding today)
    const sumOfLast5Days = filtered
        .filter((day) => day.date !== currentDay)
        .reduce((sum, day) => sum + day.roundTrips, 0);

    // Calculate difference between Alpaca count and our tracked count
    const difference = alpacaDaytradeCount - sumOfLast5Days;

    // Find or create today's entry
    const currentPdtStatusFiltered = [...filtered];
    let dayIndex = currentPdtStatusFiltered.findIndex(
        (day) => day.date === currentDay
    );

    if (dayIndex >= 0) {
        const newRoundTrips = Math.max(0, difference);
        currentPdtStatusFiltered[dayIndex] = {
            date: currentDay,
            roundTrips: newRoundTrips,
        };
    } else {
        // Create new entry for today with the difference
        const newRoundTrips = Math.max(0, difference);
        currentPdtStatusFiltered.push({
            date: currentDay,
            roundTrips: newRoundTrips,
        });
    }

    const sortedDays = currentPdtStatusFiltered.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sortedDays.slice(-MAX_PDT_WINDOW);
}
export async function isTradingAllowed(
    timestamp: string,
    tradeType?: "buy" | "sell",
    tradeId?: string
): Promise<boolean> {
    const state = autoTradeStorage.getState();
    const { filtered: pdtStatus } = filterPdtStatusByDate(
        state.pdtDays,
        timestamp
    );
    const equity = state.capital?.equity ?? 0;

    const totalRoundTrips = pdtStatus.reduce(
        (sum, day) => sum + day.roundTrips,
        0
    );
    const restrictionApplies = equity < PDT_EQUITY_THRESHOLD;
    const atRisk = restrictionApplies && totalRoundTrips >= 3;

    if (!atRisk) {
        return true;
    }

    if (tradeType === "buy") {
        return true;
    }

    if (tradeType === "sell" && tradeId) {
        return !(await wouldSellCreateRoundTrip(tradeId, timestamp));
    }

    return false;
}

async function wouldSellCreateRoundTrip(
    tradeId: string,
    timestamp: string
): Promise<boolean> {
    const currentDay = formatDay(new Date(timestamp));

    // Check if trade is in open trades
    const openTradeFromDB = await getOpenTradeById(tradeId);
    if (openTradeFromDB) {
        const tradeOpenDay = formatDay(new Date(openTradeFromDB.timeStamp));
        // If bought today and selling today - return true
        // If bought in the past and selling today - return false
        return tradeOpenDay === currentDay;
    }

    // Check if trade is in trade history
    const { data, error } = await supabase
        .from("at_trade_history")
        .select("timestamp")
        .eq("id", tradeId)
        .single();

    if (!error && data && data.timestamp) {
        const tradeOpenDay = formatDay(new Date(data.timestamp));
        return tradeOpenDay === currentDay;
    }

    return true;
}
