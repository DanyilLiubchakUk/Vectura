import readline from "readline";
import { runBacktestCore } from "@/backtest/core/engine";
import { validateDateRange } from "@/backtest/storage/rangeManager";
import { readSymbolRange } from "@/utils/supabase/backtestStorage";
import type { BacktestConfig, BacktestProgressEvent } from "@/backtest/types";
import { GRID_TRADE_DEFAULT_CONFIG } from "@/utils/trading/algorithms/constants";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

// Helper prompt function
function askQuestion(query: string): Promise<string> {
    return new Promise((resolve) => rl.question(query, resolve));
}

// Types and defaults
const defaultArgs = {
    stock: "TQQQ",
    startDate: "2024-01-01",
    endDate: "2025-01-01",
    startCapital: 1000,
    contributionFrequencyDays: 7,
    contributionAmount: 500,
    capitalPct: GRID_TRADE_DEFAULT_CONFIG.capitalPct,
    buyBelowPct: GRID_TRADE_DEFAULT_CONFIG.buyBelowPct,
    sellAbovePct: GRID_TRADE_DEFAULT_CONFIG.sellAbovePct,
    buyAfterSellPct: GRID_TRADE_DEFAULT_CONFIG.buyAfterSellPct,
    cashFloor: GRID_TRADE_DEFAULT_CONFIG.cashFloor,
    orderGapPct: GRID_TRADE_DEFAULT_CONFIG.orderGapPct,
    executionMode: "local" as const,
};

function isValidDate(d: string) {
    // Simple YYYY-MM-DD check
    return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function isPositiveNumber(n: number) {
    return !isNaN(Number(n)) && Number(n) > 0;
}

function isNonNegativeInteger(n: number) {
    const num = Number(n);
    return !isNaN(num) && Number.isInteger(num) && num >= 0;
}

function isPercentRange(n: number) {
    const num = Number(n);
    return !isNaN(num) && num > 0 && num <= 100;
}

function isNonNegativeNumber(n: number) {
    const num = Number(n);
    return !isNaN(num) && num >= 0;
}

function isOrderGapRange(n: number) {
    const num = Number(n);
    return !isNaN(num) && num >= -1 && num <= 100;
}

async function getArguments() {
    let stock = process.argv[2];
    let startDate = process.argv[3];
    let endDate = process.argv[4];
    let startCapital = Number(process.argv[5]);
    let contributionFrequencyDays = Number(process.argv[6]);
    let contributionAmount = Number(process.argv[7]);
    let capitalPct = Number(process.argv[8]);
    let buyBelowPct = Number(process.argv[9]);
    let sellAbovePct = Number(process.argv[10]);
    let buyAfterSellPct = Number(process.argv[11]);
    let cashFloor = Number(process.argv[12]);
    let orderGapPct = Number(process.argv[13]);
    let executionMode = process.argv[14] as "local" | "cloud" | undefined;

    const argsCount = process.argv.length - 2;

    // If no args: ask for defaults usage or prompt for own values
    if (argsCount === 0) {
        const ans = (
            await askQuestion(
                `No arguments provided. Run with defaults? (Y/n): `
            )
        )
            .trim()
            .toLowerCase();

        if (ans === "" || ans === "y" || ans === "yes" || ans === "Y") {
            stock = defaultArgs.stock;
            startDate = defaultArgs.startDate;
            endDate = defaultArgs.endDate;
            startCapital = defaultArgs.startCapital;
            contributionFrequencyDays = defaultArgs.contributionFrequencyDays;
            contributionAmount = defaultArgs.contributionAmount;
            capitalPct = defaultArgs.capitalPct;
            buyBelowPct = defaultArgs.buyBelowPct;
            sellAbovePct = defaultArgs.sellAbovePct;
            buyAfterSellPct = defaultArgs.buyAfterSellPct;
            cashFloor = defaultArgs.cashFloor;
            orderGapPct = defaultArgs.orderGapPct;
            executionMode = defaultArgs.executionMode;
        } else {
            stock =
                (await askQuestion(`Enter stock symbol (e.g., AAPL): `)) ||
                defaultArgs.stock;
            do {
                startDate =
                    (await askQuestion(`Enter start date (YYYY-MM-DD): `)) ||
                    defaultArgs.startDate;
            } while (!isValidDate(startDate));
            do {
                endDate =
                    (await askQuestion(`Enter end date (YYYY-MM-DD): `)) ||
                    defaultArgs.endDate;
            } while (!isValidDate(endDate));
            do {
                startCapital =
                    Number(
                        await askQuestion(
                            `Enter starting capital (positive number): `
                        )
                    ) || defaultArgs.startCapital;
            } while (!isPositiveNumber(startCapital));
            do {
                contributionFrequencyDays =
                    Number(
                        await askQuestion(
                            `Enter contribution frequency in days (0 to disable): `
                        )
                    ) ?? defaultArgs.contributionFrequencyDays;
            } while (!isNonNegativeInteger(contributionFrequencyDays));
            do {
                contributionAmount =
                    Number(
                        await askQuestion(
                            `Enter contribution amount per contribution (0 to disable): `
                        )
                    ) ?? defaultArgs.contributionAmount;
            } while (
                Number.isNaN(contributionAmount) ||
                contributionAmount < 0
            );
            do {
                capitalPct =
                    Number(
                        await askQuestion(`Enter capital % per buy (0-100]: `)
                    ) || defaultArgs.capitalPct;
            } while (!isPercentRange(capitalPct));
            do {
                buyBelowPct =
                    Number(
                        await askQuestion(`Enter buy below % trigger (0-100]: `)
                    ) || defaultArgs.buyBelowPct;
            } while (!isPercentRange(buyBelowPct));
            do {
                sellAbovePct =
                    Number(
                        await askQuestion(
                            `Enter sell above % trigger (0-100]: `
                        )
                    ) || defaultArgs.sellAbovePct;
            } while (!isPercentRange(sellAbovePct));
            do {
                buyAfterSellPct =
                    Number(
                        await askQuestion(`Enter buy after sell % (0-100]: `)
                    ) || defaultArgs.buyAfterSellPct;
            } while (!isPercentRange(buyAfterSellPct));
            do {
                cashFloor =
                    Number(
                        await askQuestion(`Enter cash floor in dollars (>=0): `)
                    ) || defaultArgs.cashFloor;
            } while (!isNonNegativeNumber(cashFloor));
            do {
                orderGapPct =
                    Number(
                        await askQuestion(`Enter order gap % (-1 to 100): `)
                    ) || defaultArgs.orderGapPct;
            } while (!isOrderGapRange(orderGapPct));
            const modeAnswer =
                (await askQuestion(
                    `Execution mode (local/cloud) [${defaultArgs.executionMode}]: `
                )) || defaultArgs.executionMode;
            executionMode =
                modeAnswer === "cloud" ? "cloud" : ("local" as const);
        }
    } else {
        // Some args are missing or of wrong type
        let needPrompt = false;

        if (!stock) {
            stock =
                (await askQuestion(`Enter stock symbol (e.g., AAPL): `)) ||
                defaultArgs.stock;
            needPrompt = true;
        }
        if (!startDate || !isValidDate(startDate)) {
            do {
                startDate =
                    (await askQuestion(`Enter start date (YYYY-MM-DD): `)) ||
                    defaultArgs.startDate;
            } while (!isValidDate(startDate));
            needPrompt = true;
        }
        if (!endDate || !isValidDate(endDate)) {
            do {
                endDate =
                    (await askQuestion(`Enter end date (YYYY-MM-DD): `)) ||
                    defaultArgs.endDate;
            } while (!isValidDate(endDate));
            needPrompt = true;
        }
        if (!startCapital || !isPositiveNumber(startCapital)) {
            do {
                startCapital =
                    Number(
                        await askQuestion(
                            `Enter starting capital (positive number): `
                        )
                    ) || defaultArgs.startCapital;
            } while (!isPositiveNumber(startCapital));
            needPrompt = true;
        }
        if (
            (!Number.isFinite(contributionFrequencyDays) &&
                contributionFrequencyDays !== 0) ||
            !isNonNegativeInteger(contributionFrequencyDays)
        ) {
            do {
                contributionFrequencyDays =
                    Number(
                        await askQuestion(
                            `Enter contribution frequency in days (0 to disable): `
                        )
                    ) ?? defaultArgs.contributionFrequencyDays;
            } while (!isNonNegativeInteger(contributionFrequencyDays));
            needPrompt = true;
        }
        if (
            (!Number.isFinite(contributionAmount) &&
                contributionAmount !== 0) ||
            Number.isNaN(contributionAmount) ||
            contributionAmount < 0
        ) {
            do {
                contributionAmount =
                    Number(
                        await askQuestion(
                            `Enter contribution amount per contribution (0 to disable): `
                        )
                    ) ?? defaultArgs.contributionAmount;
            } while (
                Number.isNaN(contributionAmount) ||
                contributionAmount < 0
            );
            needPrompt = true;
        }
        if (!capitalPct || !isPercentRange(capitalPct)) {
            do {
                capitalPct =
                    Number(
                        await askQuestion(`Enter capital % per buy (0-100]: `)
                    ) || defaultArgs.capitalPct;
            } while (!isPercentRange(capitalPct));
            needPrompt = true;
        }
        if (!buyBelowPct || !isPercentRange(buyBelowPct)) {
            do {
                buyBelowPct =
                    Number(
                        await askQuestion(`Enter buy below % trigger (0-100]: `)
                    ) || defaultArgs.buyBelowPct;
            } while (!isPercentRange(buyBelowPct));
            needPrompt = true;
        }
        if (!sellAbovePct || !isPercentRange(sellAbovePct)) {
            do {
                sellAbovePct =
                    Number(
                        await askQuestion(
                            `Enter sell above % trigger (0-100]: `
                        )
                    ) || defaultArgs.sellAbovePct;
            } while (!isPercentRange(sellAbovePct));
            needPrompt = true;
        }
        if (!buyAfterSellPct || !isPercentRange(buyAfterSellPct)) {
            do {
                buyAfterSellPct =
                    Number(
                        await askQuestion(`Enter buy after sell % (0-100]: `)
                    ) || defaultArgs.buyAfterSellPct;
            } while (!isPercentRange(buyAfterSellPct));
            needPrompt = true;
        }
        if (!isNonNegativeNumber(cashFloor)) {
            do {
                cashFloor =
                    Number(
                        await askQuestion(`Enter cash floor in dollars (>=0): `)
                    ) || defaultArgs.cashFloor;
            } while (!isNonNegativeNumber(cashFloor));
            needPrompt = true;
        }
        if (!isOrderGapRange(orderGapPct)) {
            do {
                orderGapPct =
                    Number(
                        await askQuestion(`Enter order gap % (-1 to 100): `)
                    ) || defaultArgs.orderGapPct;
            } while (!isOrderGapRange(orderGapPct));
            needPrompt = true;
        }
        if (executionMode !== "local" && executionMode !== "cloud") {
            const modeAnswer =
                (await askQuestion(
                    `Execution mode (local/cloud) [${defaultArgs.executionMode}]: `
                )) || defaultArgs.executionMode;
            executionMode =
                modeAnswer === "cloud" ? "cloud" : ("local" as const);
            needPrompt = true;
        }
    }

    return {
        stock,
        startDate,
        endDate,
        startCapital,
        contributionFrequencyDays,
        contributionAmount,
        capitalPct,
        buyBelowPct,
        sellAbovePct,
        buyAfterSellPct,
        cashFloor,
        orderGapPct,
        executionMode,
    };
}

(async () => {
    const {
        stock,
        startDate,
        endDate,
        startCapital,
        contributionFrequencyDays,
        contributionAmount,
        capitalPct,
        buyBelowPct,
        sellAbovePct,
        buyAfterSellPct,
        cashFloor,
        orderGapPct,
        executionMode,
    } = await getArguments();

    console.log("Validating date range...");
    const symbolRange = await readSymbolRange(stock);
    const firstAvailableDay = symbolRange?.first_available_day ?? null;

    try {
        validateDateRange(startDate, endDate, firstAvailableDay);
    } catch (error) {
        rl.close();
        if (error instanceof Error) {
            console.error("❌ Validation Error:", error.message);
            process.exit(1);
        }
        throw error;
    }

    rl.close();

    console.log("Running backtest with the following parameters:");
    console.log("Stock:             ", stock);
    console.log("Start Date:        ", startDate);
    console.log("End Date:          ", endDate);
    console.log("Starting Capital:  ", startCapital);
    console.log("Contribution Every:", contributionFrequencyDays, "day(s)");
    console.log("Per contribution:  ", contributionAmount);
    console.log("Capital % per buy: ", capitalPct);
    console.log("Buy Below %:       ", buyBelowPct);
    console.log("Sell Above %:      ", sellAbovePct);
    console.log("Buy After Sell %:  ", buyAfterSellPct);
    console.log("Cash Floor:        ", cashFloor);
    console.log("Order Gap %:       ", orderGapPct);
    console.log("Execution Mode:    ", executionMode);

    const config: BacktestConfig = {
        executionMode: executionMode ?? "local",
        stock,
        startDate,
        endDate,
        startCapital,
        contributionFrequencyDays,
        contributionAmount,
        capitalPct,
        buyBelowPct,
        sellAbovePct,
        buyAfterSellPct,
        cashFloor,
        orderGapPct,
    };

    const onProgress = (event: BacktestProgressEvent) => {
        if (
            event.stage === "working_on_chunk" &&
            event.data?.progress !== undefined
        ) {
            const progress = event.data.progress;
            const message = event.message || "";
            process.stdout.write(`\r[${progress}%] ${message}`);
            if (progress >= 100) {
                process.stdout.write("\n");
            }
        } else {
            console.log(`[${event.stage}] ${event.message}`);
        }
    };

    try {
        const result = await runBacktestCore(config, onProgress);

        console.log("\n=== Backtest Results ===");
        console.log(`Stock:              ${result.stock}`);
        console.log(`Start Date:         ${result.startDate}`);
        console.log(`End Date:           ${result.endDate}`);
        console.log(`Starting Capital:   $${result.startCapital.toFixed(2)}`);
        console.log(`Invested Cash:      $${result.investedCash.toFixed(2)}`);
        console.log(`Final Equity:       $${result.finalEquity.toFixed(2)}`);
        console.log(`Total Return:       $${result.totalReturn.toFixed(2)}`);
        console.log(
            `Return Percentage:  ${result.totalReturnPercent.toFixed(2)}%`
        );
        console.log(`Processed Bars:     ${result.processedBars}`);
        console.log(`Execution Time:     ${result.executionTime}`);
        console.log("========================");
    } catch (error) {
        console.error("\n❌ Backtest failed:", error);
        process.exit(1);
    }
})();
