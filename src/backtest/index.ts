import readline from "readline";
import Ealgorighms from "@/utils/trading/algorithms/dictionary";
import engine from "@/backtest/engine";

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
    startDate: "2025-01-01", 
    endDate: "2025-11-01",
    startCapital: 1000,
};

function isValidDate(d: string) {
    // Simple YYYY-MM-DD check
    return /^\d{4}-\d{2}-\d{2}$/.test(d);
}

function isPositiveNumber(n: number) {
    return !isNaN(Number(n)) && Number(n) > 0;
}

async function getArguments() {
    let stock = process.argv[2];
    let algorithm = process.argv[3];
    let startDate = process.argv[4];
    let endDate = process.argv[5];
    let startCapital = Number(process.argv[6]);

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
    }

    return { stock, algorithm, startDate, endDate, startCapital };
}

(async () => {
    const { stock, algorithm, startDate, endDate, startCapital } =
        await getArguments();
    rl.close();

    console.log("Running backtest with the following parameters:");
    console.log("Stock:            ", stock);
    console.log("Algorithm:        ", algorithm);
    console.log("Start Date:       ", startDate);
    console.log("End Date:         ", endDate);
    console.log("Starting Capital: ", startCapital);

    // Place your main execution logic here
    engine(stock, algorithm, startDate, endDate, startCapital);
})();
