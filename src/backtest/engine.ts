import Ealgorighms from "@/utils/trading/algorithms/dictionary";
import gridTradeV0, {
    firstAction as GridTradeV0FA,
} from "@/utils/trading/algorithms/gridTradeV0";
import {
    addBarData,
    getNextAvailableData,
    getBarByTimeWithCursor,
    isDBhasStockData,
    initializeCapital,
} from "@/backtest/csvStorage";

export default async function engine(
    stock: string,
    algorithm: string,
    startDate: string,
    endDate: string,
    startCapital: number,
    backtestTime?: string
): Promise<void> {
    initializeCapital(startCapital);

    let engineStartTime = new Date();

    const startDateObj = new Date(startDate);
    startDateObj.setUTCHours(14, 30, 0, 0);
    const endDateObj = new Date(endDate);
    endDateObj.setUTCHours(21, 0, 0, 0);
    let currentTime = backtestTime ? new Date(backtestTime) : startDateObj;

    let firstTime = true;

    while (currentTime < endDateObj) {
        const timeStr = currentTime.toISOString().replace(".000Z", "Z");
        const currentDate = timeStr.split("T")[0];

        if (!isDBhasStockData(stock, currentDate)) {
            // we know for sure that the data in not in the file, because file name does not include the date
            try {
                const bars = await getNextAvailableData(stock, timeStr);
                await addBarData(bars, stock, timeStr);
            } catch {
                currentTime.setUTCDate(currentTime.getUTCDate() + 1);
                currentTime.setUTCHours(14, 30, 0, 0);
                continue;
            }
        }

        const bar = getBarByTimeWithCursor(stock, timeStr);
        if (!bar) {
            // still no data even after trying to add the data above. Market is close today, going to the next day
            currentTime.setUTCDate(currentTime.getUTCDate() + 1);
            currentTime.setUTCHours(14, 30, 0, 0);
            continue;
        }

        // running algorithm
        switch (algorithm) {
            case Ealgorighms.GridV0:
                GridTradeV0FA(
                    firstTime,
                    stock,
                    bar.ClosePrice,
                    startCapital,
                    timeStr
                );
                await gridTradeV0(stock, true, timeStr);
                break;

            default:
                console.log("Passed unknown algorithm name");
                break;
        }

        currentTime.setUTCMinutes(currentTime.getUTCMinutes() + 1);
        if (currentTime.getUTCHours() >= 21) {
            currentTime.setUTCDate(currentTime.getUTCDate() + 1);
            currentTime.setUTCHours(14, 30, 0, 0);
        }
        firstTime = false;
    }

    let engineEndTime = new Date();

    let diffMs = engineEndTime.getTime() - engineStartTime.getTime();

    let runningHours = Math.floor(diffMs / 3600000);
    let runningMinutes = Math.floor((diffMs % 3600000) / 60000);
    let runningSeconds = Math.floor((diffMs % 60000) / 1000);

    let formatted = `${String(runningHours).padStart(2, "0")}:${String(
        runningMinutes
    ).padStart(2, "0")}:${String(runningSeconds).padStart(2, "0")}`;

    console.log("Execution time:", formatted);
    console.log("Backtest completed!");
}
