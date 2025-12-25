import { calculateDaysBetween } from "@/backtest/storage/dateUtils";

export const TRADING_MINUTES_PER_DAY = 390; // 14:30 - 21:00 = 6.5 hours
export const WEEKDAY_RATIO = 5 / 7;
export const YEAR_RATION = 252 / 365;

export function estimateInitialTotalBars(
    startDate: string,
    endDate: string
): number {
    const days = calculateDaysBetween(startDate, endDate, true);
    return Math.round(days * YEAR_RATION * TRADING_MINUTES_PER_DAY);
}

export function reestimateTotalBars(
    processedBars: number,
    currentBarTimestamp: string,
    endTimestamp: string,
    currentEstimate: number
): number {
    const currentTime = new Date(currentBarTimestamp).getTime();
    const endTime = new Date(endTimestamp).getTime();
    const timeRemaining = Math.max(0, endTime - currentTime);

    const remainingMinutes = timeRemaining / (1000 * 60);

    const remainingCalendarDays = remainingMinutes / (24 * 60);
    const remainingTradingDays = remainingCalendarDays * WEEKDAY_RATIO;
    const estimatedRemainingBars = Math.round(
        remainingTradingDays * TRADING_MINUTES_PER_DAY
    );

    const newEstimate = processedBars + estimatedRemainingBars;

    // Only update if we have meaningful time remaining (at least 1 day worth)
    if (timeRemaining >= 24 * 60 * 60 * 1000) {
        return Math.max(newEstimate, currentEstimate, processedBars);
    }

    return currentEstimate;
}
