import readline from "readline";
import Ealgorighms from "@/utils/trading/algorithms/dictionary";
import engine from "@/backtest/engine";
import { validateDateRange } from "@/backtest/storage/rangeManager";
import { readSymbolRange } from "@/utils/supabase/backtestStorage";

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
    algorithm: Ealgorighms.GridV0,
    startDate: "2024-01-01",
    endDate: "2025-01-01",
    startCapital: 1000,
    contributionFrequencyDays: 7,
    contributionAmount: 500,
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

async function getArguments() {
    let stock = process.argv[2];
    let algorithm = process.argv[3];
    let startDate = process.argv[4];
    let endDate = process.argv[5];
    let startCapital = Number(process.argv[6]);
    let contributionFrequencyDays = Number(process.argv[7]);
    let contributionAmount = Number(process.argv[8]);

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
            algorithm = defaultArgs.algorithm;
            startDate = defaultArgs.startDate;
            endDate = defaultArgs.endDate;
            startCapital = defaultArgs.startCapital;
            contributionFrequencyDays = defaultArgs.contributionFrequencyDays;
            contributionAmount = defaultArgs.contributionAmount;
        } else {
            stock =
                (await askQuestion(`Enter stock symbol (e.g., AAPL): `)) ||
                defaultArgs.stock;
            algorithm =
                (await askQuestion(`Enter algorithm name: `)) ||
                defaultArgs.algorithm;
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
        if (!algorithm) {
            algorithm =
                (await askQuestion(`Enter algorithm name: `)) ||
                defaultArgs.algorithm;
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
    }

    return {
        stock,
        algorithm,
        startDate,
        endDate,
        startCapital,
        contributionFrequencyDays,
        contributionAmount,
    };
}

(async () => {
    const {
        stock,
        algorithm,
        startDate,
        endDate,
        startCapital,
        contributionFrequencyDays,
        contributionAmount,
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
    console.log("Algorithm:         ", algorithm);
    console.log("Start Date:        ", startDate);
    console.log("End Date:          ", endDate);
    console.log("Starting Capital:  ", startCapital);
    console.log("Contribution Every:", contributionFrequencyDays, "day(s)");
    console.log("Per contribution:  ", contributionAmount);

    engine(
        stock,
        algorithm,
        startDate,
        endDate,
        startCapital,
        contributionFrequencyDays,
        contributionAmount
    );
})();
