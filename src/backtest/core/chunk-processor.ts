import { addMonths, isDayBeforeOrEqual } from "@/backtest/storage/dateUtils";
import { processContributions } from "@/backtest/core/contribution-handler";
import { loadPersistedDays } from "@/utils/supabase/backtestStorage";
import { dayBlobsToMinuteBars } from "@/backtest/minuteBarStorage";
import { PriceCollector } from "@/backtest/core/price-collector";
import { MetricsTracker } from "@/backtest/core/metrics-tracker";
import { runAlgorithm } from "@/backtest/core/algorithm-runner";
import { backtestStore } from "@/utils/zustand/backtestStore";
import { OrderTracker } from "@/backtest/core/order-tracker";
import { calculateEquity } from "@/backtest/utils/helpers";
import { CHUNK_MONTHS } from "@/backtest/constants";
import type { ProgressCallback } from "@/backtest/types";

export interface ProcessChunkResult {
    processedBars: number;
    totalBarsProcessed: number;
    shouldBreak: boolean;
    lastBarTimestamp: string;
    nextContributionDate: Date | null;
}

export async function processChunk(
    chunkStart: string,
    stock: string,
    endDate: string,
    startDate: string,
    algorithm: string,
    desiredStart: string,
    endBoundaryIso: string,
    nextContributionDate: Date | null,
    contributionAmount: number,
    contributionFrequencyDays: number,
    startProcessedBars: number,
    onProgress?: ProgressCallback,
    orderTracker?: OrderTracker,
    priceCollector?: PriceCollector,
    metricsTracker?: MetricsTracker
): Promise<ProcessChunkResult> {
    let chunkEnd = addMonths(chunkStart, CHUNK_MONTHS);
    if (!isDayBeforeOrEqual(chunkEnd, endDate)) {
        chunkEnd = endDate;
    }

    const dayBlobs = await loadPersistedDays(stock, chunkStart, chunkEnd);
    const minuteBars = dayBlobsToMinuteBars(dayBlobs);

    if (!minuteBars.length) {
        return {
            processedBars: startProcessedBars,
            totalBarsProcessed: 0,
            shouldBreak: false,
            lastBarTimestamp: chunkStart,
            nextContributionDate,
        };
    }

    let chunkStartIndex = 0;
    if (chunkStart === startDate) {
        const index = minuteBars.findIndex(
            (bar) => bar.timestamp >= desiredStart
        );
        if (index === -1) {
            return {
                processedBars: startProcessedBars,
                totalBarsProcessed: minuteBars.length,
                shouldBreak: false,
                lastBarTimestamp:
                    minuteBars[minuteBars.length - 1]?.timestamp || chunkStart,
                nextContributionDate,
            };
        }
        chunkStartIndex = index;
    }

    let shouldBreak = false;
    let processedBars = startProcessedBars;
    let currentNextContributionDate = nextContributionDate;
    let isFirstBar = startProcessedBars === 0;

    for (let i = chunkStartIndex; i < minuteBars.length; i++) {
        const bar = minuteBars[i];

        if (bar.timestamp >= endBoundaryIso) {
            shouldBreak = true;
            break;
        }

        let contributionResult = null;
        if (currentNextContributionDate) {
            contributionResult = processContributions(
                bar.timestamp,
                currentNextContributionDate,
                contributionAmount,
                contributionFrequencyDays
            );
            currentNextContributionDate = contributionResult.nextContributionDate;

            if (metricsTracker && contributionResult.processedContributions.length > 0) {
                for (const contribution of contributionResult.processedContributions) {
                    metricsTracker.processBuyHoldContribution(
                        contribution.timestamp,
                        contribution.amount,
                        bar.close
                    );
                }
            }
        }

        // Initialize Buy & Hold with first available price if this is the first bar
        if (metricsTracker && isFirstBar) {
            metricsTracker.initializeBuyHold(bar.close);
            isFirstBar = false;
        }

        await runAlgorithm(algorithm, stock, bar, onProgress, orderTracker, priceCollector, metricsTracker);

        const state = backtestStore.getState();
        if (state.capital) {
            const equity = calculateEquity(
                state.capital.cash,
                state.openTrades,
                bar.close
            );


            if (metricsTracker) {
                // Verify equity is a valid number before recording
                if (isFinite(equity) && equity >= 0) {
                    metricsTracker.recordEquityUpdate(
                        bar.timestamp,
                        equity,
                        state.capital.cash
                    );
                }
            }

            if (priceCollector) {
                priceCollector.collectPrice(bar.timestamp, bar.close, equity, state.capital.cash);
            }
        } else {
            if (priceCollector) {
                priceCollector.collectPrice(bar.timestamp, bar.close);
            }
        }

        processedBars += 1;
    }

    const lastBar = minuteBars[minuteBars.length - 1];

    return {
        processedBars,
        totalBarsProcessed: minuteBars.length,
        shouldBreak,
        lastBarTimestamp: lastBar.timestamp,
        nextContributionDate: currentNextContributionDate,
    };
}
