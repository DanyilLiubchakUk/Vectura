import Ealgorighms from "@/utils/trading/algorithms/dictionary";
import gridTradeV0 from "@/utils/trading/algorithms/gridTradeV0";
import {
    ensureSymbolRange,
    dayBlobsToMinuteBars,
} from "@/backtest/minuteBarStorage";
import {
    initializeBacktest,
    addExternalCapital,
} from "@/backtest/backtestState";
import { addMonths, isDayBeforeOrEqual } from "@/backtest/storage/dateUtils";
import { loadPersistedDays } from "@/utils/supabase/backtestStorage";
import { CHUNK_MONTHS } from "@/backtest/constants";

export default async function engine(
    stock: string,
    algorithm: string,
    startDate: string,
    endDate: string,
    startCapital: number,
    contributionFrequencyDays = 0,
    contributionAmount = 0,
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

    await ensureSymbolRange(stock, startDate, endDate);

    let chunkStart = startDate;
    let processedBars = 0;
    let totalBars = 0;

    let nextContributionDate: Date | null = null;
    if (contributionFrequencyDays > 0 && contributionAmount > 0) {
        const firstContribution = new Date(startDate + "T00:00:00Z");
        firstContribution.setUTCDate(
            firstContribution.getUTCDate() + contributionFrequencyDays
        );
        nextContributionDate = firstContribution;
    }

    while (isDayBeforeOrEqual(chunkStart, endDate)) {
        let chunkEnd = addMonths(chunkStart, CHUNK_MONTHS);
        if (!isDayBeforeOrEqual(chunkEnd, endDate)) {
            chunkEnd = endDate;
        }

        const dayBlobs = await loadPersistedDays(stock, chunkStart, chunkEnd);
        const minuteBars = dayBlobsToMinuteBars(dayBlobs);

        if (!minuteBars.length) {
            console.warn(
                `No minute bars for ${stock} in chunk ${chunkStart} to ${chunkEnd}`
            );
            chunkStart = addMonths(chunkStart, CHUNK_MONTHS);
            continue;
        }

        totalBars += minuteBars.length;

        let chunkStartIndex = 0;
        if (chunkStart === startDate) {
            const index = minuteBars.findIndex(
                (bar) => bar.timestamp >= desiredStart
            );
            if (index === -1) {
                console.warn(
                    "[engine] requested start time is beyond available data in first chunk",
                    {
                        desiredStart,
                        firstBar: minuteBars[0],
                    }
                );
                chunkStart = addMonths(chunkStart, CHUNK_MONTHS);
                continue;
            }
            chunkStartIndex = index;
        }

        let shouldBreak = false;
        for (let i = chunkStartIndex; i < minuteBars.length; i++) {
            const bar = minuteBars[i];

            if (bar.timestamp >= endBoundaryIso) {
                shouldBreak = true;
                break;
            }

            if (nextContributionDate) {
                const barDate = new Date(bar.timestamp);

                while (
                    nextContributionDate &&
                    barDate >= nextContributionDate
                ) {
                    addExternalCapital(contributionAmount);

                    nextContributionDate = new Date(nextContributionDate);
                    nextContributionDate.setUTCDate(
                        nextContributionDate.getUTCDate() +
                            contributionFrequencyDays
                    );
                }
            }

            // Running algorithm
            switch (algorithm) {
                case Ealgorighms.GridV0:
                    await gridTradeV0(stock, true, bar.close, bar.timestamp);
                    break;

                default:
                    console.log("Passed unknown algorithm name");
                    break;
            }

            processedBars += 1;
        }

        if (shouldBreak) {
            break;
        }

        chunkStart = addMonths(chunkStart, CHUNK_MONTHS);
    }

    console.log(
        `[engine] Completed processing ${processedBars} bars (${totalBars} total bars loaded across chunks)`
    );

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
