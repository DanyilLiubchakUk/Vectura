import { getBars, Tbar } from "@/utils/alpaca/getTradingData";
import Alpaca from "@/utils/alpaca";
import { Eorder } from "@/types/alpaca";
import { DayBlob } from "@/backtest/types";
import {
    filterBarsByDayAndWindow,
    applySplitAdjustments,
    compactBars,
} from "@/backtest/storage/barProcessing";
import { FETCH_LIMIT } from "@/backtest/constants";

async function fetchRawBarsFromAlpaca(
    symbol: string,
    day: string
): Promise<Tbar[]> {
    const fetchLimit = FETCH_LIMIT;
    const result = await getBars(
        symbol,
        Alpaca.newTimeframe(1, Alpaca.timeframeUnit.MIN),
        fetchLimit,
        Eorder.Asc,
        day
    );

    if (!result.success) {
        console.error("[alpacaFetcher] getBars failed", {
            symbol,
            day,
            error: result.error,
        });
        throw result.error;
    }

    return result.data ?? [];
}

export async function fetchDayBarsFromAlpaca(
    symbol: string,
    day: string
): Promise<DayBlob | null> {
    const rawBars = await fetchRawBarsFromAlpaca(symbol, day);
    const bars = filterBarsByDayAndWindow(rawBars, day);

    if (!bars.length) {
        console.log(
            "◻ market closed or no bars for     " + symbol + " at " + day
        );
        return null;
    }
    console.log("◼ fetched day bars from Alpaca for " + symbol + " at " + day);

    applySplitAdjustments(bars, symbol);
    const compact = compactBars(bars);
    const startTs = Math.floor(new Date(bars[0].Timestamp).getTime() / 1000);
    const endTs = Math.floor(
        new Date(bars[bars.length - 1].Timestamp).getTime() / 1000
    );

    const blob: DayBlob = {
        symbol,
        day,
        compact,
        records: bars.length,
        start_ts: startTs,
        end_ts: endTs,
    };

    return blob;
}
