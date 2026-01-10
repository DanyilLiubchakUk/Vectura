import { Tbar } from "@/utils/alpaca/getTradingData";
import {
    MARKET_OPEN_HOUR_UTC,
    MARKET_OPEN_MINUTE_UTC,
    MARKET_CLOSE_HOUR_UTC,
} from "@/backtest/constants";
import { formatDay } from "@/backtest/storage/dateUtils";
import { DayBlob, MinuteBar } from "@/backtest/types";
import { getSplitsForSymbol as getSplitsFromCache } from "@/backtest/storage/splitManager";

export function compactBars(bars: Tbar[]): Array<[number, number]> {
    return bars.map((bar) => {
        const ts = new Date(bar.Timestamp);
        const seconds =
            ts.getUTCHours() * 3600 +
            ts.getUTCMinutes() * 60 +
            ts.getUTCSeconds();
        return [seconds, bar.ClosePrice];
    });
}

export function applySplitAdjustments(bars: Tbar[], symbol: string): void {
    const splits = getSplitsFromCache(symbol);

    if (splits.length === 0) {
        return;
    }

    bars.forEach((bar) => {
        const timestamp = new Date(bar.Timestamp);
        const barDate = new Date(Date.UTC(
            timestamp.getUTCFullYear(),
            timestamp.getUTCMonth(),
            timestamp.getUTCDate()
        ));

        for (const split of splits) {
            const splitDate = new Date(Date.UTC(
                split.date.getUTCFullYear(),
                split.date.getUTCMonth(),
                split.date.getUTCDate()
            ));

            if (barDate < splitDate) {
                bar.Volume *= split.ratio;
                bar.VWAP /= split.ratio;
                bar.HighPrice /= split.ratio;
                bar.LowPrice /= split.ratio;
                bar.OpenPrice /= split.ratio;
                bar.ClosePrice /= split.ratio;
            }
        }
    });
}

export function withinMarketWindow(ts: Date): boolean {
    const hours = ts.getUTCHours();
    const minutes = ts.getUTCMinutes();

    if (hours < MARKET_OPEN_HOUR_UTC) return false;
    if (hours === MARKET_OPEN_HOUR_UTC && minutes < MARKET_OPEN_MINUTE_UTC)
        return false;
    if (hours >= MARKET_CLOSE_HOUR_UTC) return false;
    return true;
}

export function filterBarsByDayAndWindow(bars: Tbar[], day: string): Tbar[] {
    return bars.filter((bar) => {
        const ts = new Date(bar.Timestamp);
        const barDay = formatDay(ts);
        return barDay === day && withinMarketWindow(ts);
    });
}

export function dayBlobsToMinuteBars(dayBlobs: DayBlob[]): MinuteBar[] {
    const minuteBars: MinuteBar[] = [];

    for (const blob of dayBlobs) {
        const dayBase = new Date(`${blob.day}T00:00:00Z`).getTime();
        for (const [seconds, close] of blob.compact) {
            const timestamp = new Date(dayBase + seconds * 1000).toISOString();
            minuteBars.push({ timestamp, close });
        }
    }

    return minuteBars;
}
