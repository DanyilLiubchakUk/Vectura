import { findNearestTradingDaysInRange } from "@/utils/supabase/backtestStorage-server";
import { checkDaysExist } from "@/utils/supabase/backtestStorage";
import { getTodayMinusDays } from "@/backtest/storage/dateUtils";
import { DAYS_BEFORE_TODAY } from "@/backtest/constants";

export async function isMarketTradingDay(
    symbol: string,
    day: string
): Promise<boolean> {
    const dbResults = await checkDaysExist(symbol, [day]);
    if (dbResults[day]) {
        return true;
    }

    try {
        const { serverAdapter } = await import(
            "@/utils/backtest/server-adapter"
        );
        const blob = await serverAdapter.fetchDayBars(symbol, day);
        return blob !== null;
    } catch (error: any) {
        if (error?.code === 401 || error?.status === 401) {
            throw error;
        }
        return false;
    }
}

export async function findNearestMarketDays(
    symbol: string,
    day: string
): Promise<{ previous: string | null; next: string | null }> {
    const result = await findNearestTradingDaysInRange(symbol, day, 10, 10);
    return result;
}

export async function validateAndAdjustDateRange(
    symbol: string,
    requestedStart: string,
    requestedEnd: string,
    firstAvailableDay: string | null,
    currentHaveFrom: string | null,
    currentHaveTo: string | null
): Promise<{
    valid: boolean;
    adjustedStart: string | null;
    adjustedEnd: string | null;
    message: string;
    needsDownload: boolean;
    nearestStartDays?: { previous: string | null; next: string | null };
    nearestEndDays?: { previous: string | null; next: string | null };
}> {
    const todayMinusDays = getTodayMinusDays(DAYS_BEFORE_TODAY);

    if (requestedEnd > todayMinusDays) {
        return {
            valid: false,
            adjustedStart: null,
            adjustedEnd: null,
            message: `End date must be before ${todayMinusDays} (today - ${DAYS_BEFORE_TODAY} days)`,
            needsDownload: false,
        };
    }

    if (firstAvailableDay && requestedStart < firstAvailableDay) {
        return {
            valid: false,
            adjustedStart: null,
            adjustedEnd: null,
            message: `Start date must be on or after ${firstAvailableDay} (first available day)`,
            needsDownload: false,
        };
    }

    const [isStartMarketDay, isEndMarketDay, nearestStart, nearestEnd] =
        await Promise.all([
            isMarketTradingDay(symbol, requestedStart),
            isMarketTradingDay(symbol, requestedEnd),
            findNearestMarketDays(symbol, requestedStart),
            findNearestMarketDays(symbol, requestedEnd),
        ]);

    if (!isStartMarketDay) {
        const options: string[] = [];
        if (
            nearestStart.previous &&
            (!firstAvailableDay || nearestStart.previous >= firstAvailableDay)
        ) {
            options.push(nearestStart.previous);
        }
        if (nearestStart.next && nearestStart.next <= todayMinusDays) {
            options.push(nearestStart.next);
        }

        const message =
            options.length > 0
                ? `Start date ${requestedStart} is not a market trading day. Nearest trading days: ${options.join(
                      " or "
                  )}`
                : `Start date ${requestedStart} is not a market trading day.`;

        return {
            valid: false,
            adjustedStart: null,
            adjustedEnd: null,
            message,
            needsDownload: false,
            nearestStartDays: nearestStart,
        };
    }

    if (!isEndMarketDay) {
        const options: string[] = [];
        if (
            nearestEnd.previous &&
            (!firstAvailableDay || nearestEnd.previous >= firstAvailableDay)
        ) {
            options.push(nearestEnd.previous);
        }
        if (nearestEnd.next && nearestEnd.next <= todayMinusDays) {
            options.push(nearestEnd.next);
        }

        const message =
            options.length > 0
                ? `End date ${requestedEnd} is not a market trading day. Nearest trading days: ${options.join(
                      " or "
                  )}`
                : `End date ${requestedEnd} is not a market trading day.`;

        return {
            valid: false,
            adjustedStart: null,
            adjustedEnd: null,
            message,
            needsDownload: false,
            nearestEndDays: nearestEnd,
        };
    }

    const needsDownload =
        currentHaveFrom === null ||
        requestedStart < currentHaveFrom ||
        currentHaveTo === null ||
        requestedEnd > currentHaveTo;

    return {
        valid: true,
        adjustedStart: requestedStart,
        adjustedEnd: requestedEnd,
        message: needsDownload
            ? "Date range is valid. Missing data will be downloaded."
            : "Date range is valid.",
        needsDownload,
    };
}
