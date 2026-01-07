import {
    calculateTimeBoundaries,
    isDayBeforeOrEqual,
    addMonths,
    calculateDaysBetween,
} from "@/backtest/storage/dateUtils";
import {
    emitProgressIfNeeded,
    progressManager,
} from "@/backtest/core/progressManager";
import {
    estimateInitialTotalBars,
    reestimateTotalBars,
} from "@/backtest/core/bar-estimation";
import { initializeContribution } from "@/backtest/core/contribution-handler";
import { calculateBacktestResult } from "@/backtest/core/result-calculator";
import { setExecutionMode } from "@/utils/backtest/execution-adapter";
import { PriceCollector } from "@/backtest/core/price-collector";
import { ensureSymbolRange } from "@/backtest/minuteBarStorage";
import { processChunk } from "@/backtest/core/chunk-processor";
import { initializeBacktest } from "@/backtest/backtestState";
import { OrderTracker } from "@/backtest/core/order-tracker";
import { emitProgress } from "@/backtest/utils/helpers";
import { CHUNK_MONTHS } from "@/backtest/constants";
import type {
    ProgressCallback,
    BacktestResult,
    BacktestConfig,
} from "@/backtest/types";

export async function runBacktestCore(
    config: BacktestConfig,
    onProgress?: ProgressCallback,
    signal?: AbortSignal
): Promise<BacktestResult> {
    const engineStartTime = new Date();
    setExecutionMode(config.executionMode);

    await emitProgress(onProgress, {
        stage: "initialize_backtest",
        message: `Initializing backtest for ${config.stock}`,
    });

    // Initialize chart data collectors
    const orderTracker = new OrderTracker();
    const priceCollector = new PriceCollector(config.startDate, config.endDate);

    initializeBacktest(config);

    const boundaries = calculateTimeBoundaries(
        config.startDate,
        config.endDate,
        config.backtestTime
    );

    await ensureSymbolRange(
        config.stock,
        config.startDate,
        config.endDate,
        undefined,
        onProgress
    );

    const initialEstimatedTotalBars = estimateInitialTotalBars(
        config.startDate,
        config.endDate
    );

    const totalCalendarDays = calculateDaysBetween(
        config.startDate,
        config.endDate,
        true
    );

    let estimatedTotalBars = initialEstimatedTotalBars;

    progressManager.reset();

    let chunkStart = config.startDate;
    let processedBars = 0;
    let totalBarsProcessed = 0;

    const nextContributionDate = initializeContribution({
        frequencyDays: config.contributionFrequencyDays,
        amount: config.contributionAmount,
        startDate: config.startDate,
    });

    await emitProgressIfNeeded(
        onProgress,
        "working_on_chunk",
        processedBars,
        estimatedTotalBars,
        `${totalCalendarDays} days remaining`
    );

    let currentNextContributionDate = nextContributionDate;

    while (isDayBeforeOrEqual(chunkStart, config.endDate)) {
        if (signal?.aborted) {
            throw new Error("Backtest cancelled");
        }

        const chunkResult = await processChunk(
            chunkStart,
            config.stock,
            config.endDate,
            config.startDate,
            config.algorithm,
            boundaries.desiredStart,
            boundaries.endBoundaryIso,
            currentNextContributionDate,
            config.contributionAmount || 0,
            config.contributionFrequencyDays || 0,
            processedBars,
            onProgress,
            orderTracker,
            priceCollector
        );

        processedBars = chunkResult.processedBars;
        totalBarsProcessed += chunkResult.totalBarsProcessed;
        currentNextContributionDate = chunkResult.nextContributionDate;

        if (chunkResult.totalBarsProcessed > 0) {
            estimatedTotalBars = reestimateTotalBars(
                processedBars,
                chunkResult.lastBarTimestamp,
                boundaries.endBoundaryIso,
                estimatedTotalBars
            );
            estimatedTotalBars = Math.max(estimatedTotalBars, processedBars);

            const daysRemaining = calculateDaysBetween(
                chunkResult.lastBarTimestamp,
                boundaries.endBoundaryIso,
                false,
                true
            );

            await emitProgressIfNeeded(
                onProgress,
                "working_on_chunk",
                processedBars,
                estimatedTotalBars,
                `${daysRemaining} days remaining`,
                {
                    processedBars,
                    totalBars: estimatedTotalBars,
                }
            );
        }

        if (chunkResult.shouldBreak || signal?.aborted) {
            break;
        }

        chunkStart = addMonths(chunkStart, CHUNK_MONTHS);
    }

    if (signal?.aborted) {
        throw new Error("Backtest cancelled");
    }

    // Send 100% completion event at the very end
    await emitProgressIfNeeded(
        onProgress,
        "working_on_chunk",
        processedBars,
        processedBars,
        "Processing complete"
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    const result = await calculateBacktestResult(
        config,
        processedBars,
        engineStartTime,
        orderTracker,
        priceCollector
    );

    await emitProgress(onProgress, {
        stage: "completed",
        message: `Backtest completed successfully`,
        data: {
            stock: config.stock,
            processedBars,
            totalBars: processedBars,
            finalEquity: result.finalEquity,
            totalReturn: result.totalReturn,
            totalReturnPercent: result.totalReturnPercent,
            executionTime: result.executionTime,
        },
    });

    return result;
}
