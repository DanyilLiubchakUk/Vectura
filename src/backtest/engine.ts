import Ealgorighms from "@/utils/trading/algorithms/dictionary";
import gridTradeV0 from "@/utils/trading/algorithms/gridTradeV0";
import {
    ensureSymbolRange,
    dayBlobsToMinuteBars,
} from "@/backtest/minuteBarStorage";
import { initializeBacktest } from "@/backtest/backtestState";

export default async function engine(
    stock: string,
    algorithm: string,
    startDate: string,
    endDate: string,
    startCapital: number,
    backtestTime?: string
): Promise<void> {
    initializeBacktest(stock, startDate, endDate, startCapital);

    const engineStartTime = new Date();

    const startBoundary = new Date(startDate);
    startBoundary.setUTCHours(14, 30, 0, 0);
    const endBoundary = new Date(endDate);
    endBoundary.setUTCHours(21, 0, 0, 0);
    const startBoundaryIso = startBoundary.toISOString();
    const endBoundaryIso = endBoundary.toISOString();
    const desiredStart = backtestTime
        ? new Date(backtestTime).toISOString()
        : startBoundaryIso;

    const dayBlobs = await ensureSymbolRange(stock, startDate, endDate);
    const minuteBars = dayBlobsToMinuteBars(dayBlobs);

    if (!minuteBars.length) {
        console.warn(
            `Minute bars for ${stock} are unavailable for intervals ${startDate} through ${endDate}`
        );
        return;
    }

    const startIndex = minuteBars.findIndex(
        (bar) => bar.timestamp >= desiredStart
    );
    if (startIndex === -1) {
        console.warn("[engine] requested start time is beyond available data", {
            desiredStart,
            lastBar: minuteBars[minuteBars.length - 1],
        });
        return;
    }

    let currentIndex = startIndex;
    const totalBars = minuteBars.length;

    while (currentIndex < totalBars) {
        const bar = minuteBars[currentIndex];
        if (bar.timestamp >= endBoundaryIso) {
            break;
        }

        // running algorithm
        switch (algorithm) {
            case Ealgorighms.GridV0:
                await gridTradeV0(stock, true, bar.close, bar.timestamp);
                break;

            default:
                console.log("Passed unknown algorithm name");
                break;
        }

        currentIndex += 1;
    }

    const engineEndTime = new Date();
    const diffMs = engineEndTime.getTime() - engineStartTime.getTime();

    const runningHours = Math.floor(diffMs / 3600000);
    const runningMinutes = Math.floor((diffMs % 3600000) / 60000);
    const runningSeconds = Math.floor((diffMs % 60000) / 1000);

    const formatted = `${String(runningHours).padStart(2, "0")}:${String(
        runningMinutes
    ).padStart(2, "0")}:${String(runningSeconds).padStart(2, "0")}`;

    console.log("Execution time:", formatted);
    console.log("Backtest completed!");
}
