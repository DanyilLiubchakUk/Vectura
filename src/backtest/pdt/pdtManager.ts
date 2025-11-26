import {
    IpdtStatus,
    Itrade,
    IbacktestStorage,
    backtestStore,
} from "@/utils/zustand/backtestStore";
import { formatDay } from "@/backtest/storage/dateUtils";
import { PDT_EQUITY_THRESHOLD, MAX_PDT_WINDOW } from "@/backtest/constants";
import { calculateRoundTripsForDay } from "@/backtest/pdt/roundTripCalculator";

export interface FilteredPdtStatus {
    filtered: IpdtStatus[];
    currentDay: string;
    fiveDaysAgo: Date;
    currentDateObj: Date;
}
export function filterPdtStatusByDate(
    pdtStatus: IpdtStatus[],
    currentTimestamp: string
): FilteredPdtStatus {
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

export function updatePdtStatusWithTrade(
    currentPdtStatus: IpdtStatus[],
    tradeHistory: Itrade[],
    newTrade: Itrade,
    timestamp: string
): IpdtStatus[] {
    const { filtered } = filterPdtStatusByDate(currentPdtStatus, timestamp);
    const tradeDay = formatDay(new Date(timestamp));
    const updatedTradeHistory = [...tradeHistory, newTrade];
    const roundTrips = calculateRoundTripsForDay(updatedTradeHistory, tradeDay);

    const currentPdtStatusFiltered = [...filtered];
    let dayIndex = currentPdtStatusFiltered.findIndex(
        (day) => day.date === tradeDay
    );

    if (dayIndex >= 0) {
        currentPdtStatusFiltered[dayIndex] = {
            date: tradeDay,
            roundTrips,
        };
    } else {
        currentPdtStatusFiltered.push({
            date: tradeDay,
            roundTrips,
        });
    }

    const sortedDays = currentPdtStatusFiltered.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return sortedDays.slice(-MAX_PDT_WINDOW);
}

export function isTradingAllowed(
    timestamp: string,
    tradeType?: "buy" | "sell",
    tradeId?: string
): boolean {
    const state = backtestStore.getState();
    const { filtered: pdtStatus } = filterPdtStatusByDate(
        state.pdtStatus,
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
        return !wouldSellCreateRoundTrip(tradeId, timestamp);
    }

    return false;
}

export function getPdtRiskStatus(
    state: IbacktestStorage,
    timestamp: string
): {
    atRisk: boolean;
    totalRoundTrips: number;
    restrictionApplies: boolean;
} {
    const { filtered: pdtStatus } = filterPdtStatusByDate(
        state.pdtStatus,
        timestamp
    );
    const equity = state.capital?.equity ?? 0;
    const totalRoundTrips = pdtStatus.reduce(
        (sum, day) => sum + day.roundTrips,
        0
    );
    const restrictionApplies = equity < PDT_EQUITY_THRESHOLD;
    const atRisk = restrictionApplies && totalRoundTrips >= 3;

    return { atRisk, totalRoundTrips, restrictionApplies };
}

function wouldSellCreateRoundTrip(tradeId: string, timestamp: string): boolean {
    const state = backtestStore.getState();
    const tradeDay = formatDay(new Date(timestamp));

    const openTrade = state.openTrades.find((trade) => trade.id === tradeId);
    if (openTrade) {
        const tradeOpenDay = formatDay(new Date(openTrade.timeStamp));
        return tradeOpenDay === tradeDay;
    }

    const tradeInHistory = state.tradeHistory.find(
        (trade) => trade.id === tradeId
    );
    if (tradeInHistory) {
        const tradeOpenDay = formatDay(new Date(tradeInHistory.timeStamp));
        return tradeOpenDay === tradeDay;
    }

    return true;
}
