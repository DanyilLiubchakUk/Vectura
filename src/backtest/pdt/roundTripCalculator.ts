import { Itrade } from "@/utils/zustand/backtestStore";
import { formatDay } from "@/backtest/storage/dateUtils";

export function calculateRoundTripsForDay(
    trades: Itrade[],
    day: string
): number {
    const tradesBeforeToday = trades.filter(
        (trade) => formatDay(new Date(trade.timeStamp)) < day
    );

    // Reconstruct positions open at start of day
    const positionsAtStartOfDay = new Map<string, number>();
    for (const trade of tradesBeforeToday) {
        if (trade.tradeType === "buy") {
            const current = positionsAtStartOfDay.get(trade.id) ?? 0;
            positionsAtStartOfDay.set(trade.id, current + trade.shares);
        } else if (trade.tradeType === "sell") {
            let remainingSellShares = trade.shares;
            for (const [
                tradeId,
                remainingShares,
            ] of positionsAtStartOfDay.entries()) {
                if (remainingSellShares <= 0) break;
                const sharesToClose = Math.min(
                    remainingShares,
                    remainingSellShares
                );
                const newRemaining = remainingShares - sharesToClose;
                remainingSellShares -= sharesToClose;

                if (newRemaining === 0) {
                    positionsAtStartOfDay.delete(tradeId);
                } else {
                    positionsAtStartOfDay.set(tradeId, newRemaining);
                }
            }
        }
    }

    // Process today's trades
    const dayTrades = trades
        .filter((trade) => formatDay(new Date(trade.timeStamp)) === day)
        .sort(
            (a, b) =>
                new Date(a.timeStamp).getTime() -
                new Date(b.timeStamp).getTime()
        );

    const todayPositions = new Map<string, number>();
    let roundTrips = 0;

    for (const trade of dayTrades) {
        if (trade.tradeType === "buy") {
            todayPositions.set(trade.id, trade.shares);
        } else if (trade.tradeType === "sell") {
            if (trade.closesTradeId) {
                roundTrips += processSellWithTradeId(
                    trade,
                    trade.closesTradeId,
                    todayPositions,
                    positionsAtStartOfDay
                );
            } else {
                roundTrips += processSellFIFO(
                    trade,
                    todayPositions,
                    positionsAtStartOfDay
                );
            }
        }
    }

    return roundTrips;
}

function processSellWithTradeId(
    trade: Itrade,
    closedTradeId: string,
    todayPositions: Map<string, number>,
    positionsAtStartOfDay: Map<string, number>
): number {
    let roundTrips = 0;

    if (todayPositions.has(closedTradeId)) {
        const remainingShares = todayPositions.get(closedTradeId)!;
        const sharesToClose = Math.min(remainingShares, trade.shares);
        const newRemaining = remainingShares - sharesToClose;

        if (newRemaining === 0) {
            todayPositions.delete(closedTradeId);
            roundTrips += 1;
        } else {
            todayPositions.set(closedTradeId, newRemaining);
        }
    } else if (positionsAtStartOfDay.has(closedTradeId)) {
        const remainingShares = positionsAtStartOfDay.get(closedTradeId)!;
        const sharesToClose = Math.min(remainingShares, trade.shares);
        const newRemaining = remainingShares - sharesToClose;

        if (newRemaining === 0) {
            positionsAtStartOfDay.delete(closedTradeId);
        } else {
            positionsAtStartOfDay.set(closedTradeId, newRemaining);
        }
    }

    return roundTrips;
}

function processSellFIFO(
    trade: Itrade,
    todayPositions: Map<string, number>,
    positionsAtStartOfDay: Map<string, number>
): number {
    let remainingSellShares = trade.shares;
    let roundTrips = 0;

    // First, close positions from previous days (no round trip)
    for (const [tradeId, remainingShares] of positionsAtStartOfDay.entries()) {
        if (remainingSellShares <= 0) break;
        const sharesToClose = Math.min(remainingShares, remainingSellShares);
        const newRemaining = remainingShares - sharesToClose;
        remainingSellShares -= sharesToClose;

        if (newRemaining === 0) {
            positionsAtStartOfDay.delete(tradeId);
        } else {
            positionsAtStartOfDay.set(tradeId, newRemaining);
        }
    }

    // Then, close positions opened today (these create round trips)
    for (const [tradeId, remainingShares] of todayPositions.entries()) {
        if (remainingSellShares <= 0) break;
        const sharesToClose = Math.min(remainingShares, remainingSellShares);
        const newRemaining = remainingShares - sharesToClose;
        remainingSellShares -= sharesToClose;

        if (newRemaining === 0) {
            todayPositions.delete(tradeId);
            roundTrips += 1;
        } else {
            todayPositions.set(tradeId, newRemaining);
        }
    }

    return roundTrips;
}
