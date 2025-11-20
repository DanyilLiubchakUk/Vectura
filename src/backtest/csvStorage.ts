import { getBars, Tbar } from "@/utils/alpaca/getTradingData";
import Alpaca from "@/utils/alpaca";
import { Eorder } from "@/types/alpaca";
import fs from "fs";
import path from "path";

export let capital: number = 0;
export let maxCapital: number = 0;
export let startCapital: number = 0;

export function setCapital(value: number, now: string): void {
    capital = value;
    if (value > maxCapital) {
        maxCapital = value;
        console.log(
            `${((maxCapital / 1000) * 100 - 100).toFixed(
                3
            )}% - New maximum capital: ${maxCapital.toFixed(2)} on ${
                now.split("T")[0]
            }`
        );
    }
}

export function getGlobalCapital(): number {
    return capital;
}

export function initializeCapital(initialCapital: number): void {
    capital = initialCapital;
    maxCapital = initialCapital;
    startCapital = initialCapital;
}

const headers = [
    "Timestamp",
    "Volume",
    "ClosePrice",
    "HighPrice",
    "LowPrice",
    "TradeCount",
    "OpenPrice",
    "VWAP",
];
const backtestHeaders = [
    "Id",
    "isBuy",
    "Timestamp",
    "TotalShares",
    "NextBuyOn",
    "SellOn",
    "Price",
    "wasBought",
    "wasSold",
];

const splitDates = [
    // Only TQQQ
    { date: new Date("2022-01-13"), ratio: 2 },
    { date: new Date("2021-01-21"), ratio: 2 },
    { date: new Date("2018-05-24"), ratio: 3 },
    { date: new Date("2017-01-12"), ratio: 2 },
    { date: new Date("2014-01-24"), ratio: 2 },
    { date: new Date("2012-05-11"), ratio: 2 },
    { date: new Date("2011-02-25"), ratio: 2 },
];

function getDataDir(): string {
    return path.join(__dirname, "data");
}

function ensureDataDirExists(): void {
    const dataDir = getDataDir();
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

function addDays(date: Date, days: number): Date {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function getDateOnly(dateString: string): string {
    return dateString.split("T")[0];
}

function generateOrderId(stock: string): string {
    return `${stock}-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 11)}`;
}

export async function getNextAvailableData(
    stock: string,
    backtestTime: string
) {
    let backtestDate = getDateOnly(backtestTime);
    const result = await getBars(
        stock,
        Alpaca.newTimeframe(1, Alpaca.timeframeUnit.MIN),
        696 * 1.25, // from 9am till 8:59 pm
        Eorder.Asc,
        backtestDate
    );
    if (result.success && result.data) {
        let today = new Date(backtestDate);
        let startRange = new Date(today.setUTCHours(14, 30));
        let endRange = new Date(today.setUTCHours(21, 0));
        let dayBars = result.data;

        dayBars = dayBars.filter((bar) => {
            let timeBar = new Date(bar.Timestamp);
            return timeBar >= startRange && timeBar < endRange;
        });
        dayBars.map((bar) => {
            let now = new Date(bar.Timestamp);
            for (let split of splitDates) {
                if (now < split.date) {
                    bar.Volume *= split.ratio;
                    bar.VWAP /= split.ratio;
                    bar.HighPrice /= split.ratio;
                    bar.LowPrice /= split.ratio;
                    bar.OpenPrice /= split.ratio;
                    bar.ClosePrice /= split.ratio;
                }
            }
        });

        return dayBars;
    }
    throw new Error(
        `Cannot get bar of ${backtestTime}, there was an error:\n ${result.error}`
    );
}
export async function addBarData(
    bars: Tbar[],
    stock: string,
    backtestTime: string
) {
    const fileExist = isStockFileExists(stock);
    const backtestDate = getDateOnly(backtestTime);
    if (!fileExist) {
        createFile(stock, backtestDate);
    }
    let [fileName, filePath] = getFileName(stock);
    let [fileStart, fileEnd] = getRange(fileName);

    const fileStartDate = new Date(fileStart);
    const fileEndDate = new Date(fileEnd);
    const backtestDateObj = new Date(backtestDate);

    const nextBacktestData = addDays(backtestDateObj, 1);
    const previousBacktestDate = addDays(backtestDateObj, -1);

    if (nextBacktestData <= fileStartDate) {
        let daysBefore = 1;
        let previousStartDate = fileStartDate;
        // Extract data once and reuse for multiple dates
        const extractedBarsMap = new Map<string, Tbar[]>();

        while (nextBacktestData <= previousStartDate) {
            await new Promise((resolve) => setTimeout(resolve, 250));
            previousStartDate = addDays(fileStartDate, -daysBefore);
            const dateKey = previousStartDate.toISOString();

            // Check if we already extracted this data
            if (!extractedBarsMap.has(dateKey)) {
                const todayBars = await getNextAvailableData(stock, dateKey);
                if (todayBars.length !== 0) {
                    extractedBarsMap.set(dateKey, todayBars);
                }
            }

            const todayBars = extractedBarsMap.get(dateKey);
            if (todayBars && todayBars.length !== 0) {
                addBars(todayBars, filePath, true);
                [fileName, filePath] = renameStartTo(
                    getDateOnly(dateKey),
                    fileName
                );
            }
            daysBefore++;
        }
    } else if (previousBacktestDate >= fileEndDate) {
        let daysAfter = 1;
        let nextStartDate = fileEndDate;
        // Extract data once and reuse for multiple dates
        const extractedBarsMap = new Map<string, Tbar[]>();

        while (previousBacktestDate >= nextStartDate) {
            await new Promise((resolve) => setTimeout(resolve, 250));
            nextStartDate = addDays(fileEndDate, daysAfter);
            const dateKey = nextStartDate.toISOString();

            // Check if we already extracted this data
            if (!extractedBarsMap.has(dateKey)) {
                const todayBars = await getNextAvailableData(stock, dateKey);
                if (todayBars.length !== 0) {
                    extractedBarsMap.set(dateKey, todayBars);
                }
            }

            const todayBars = extractedBarsMap.get(dateKey);
            if (todayBars && todayBars.length !== 0) {
                addBars(todayBars, filePath);
                [fileName, filePath] = renameEndTo(
                    getDateOnly(dateKey),
                    fileName
                );
            }
            daysAfter++;
        }
    } else {
        addBars(bars, filePath);
    }
    // Clear cache when file is modified
    barsCache.delete(stock);
    cursorIndex.delete(stock);

    if (getBarsData(stock).length === 0) {
        removeStockFile(stock);
    }
}
function isStockFileExists(stock: string) {
    const dataDir = getDataDir();
    let found = false;

    if (fs.existsSync(dataDir)) {
        const files = fs.readdirSync(dataDir);
        const stockPrefix = `${stock}_`;
        found = files.some((filename) => filename.startsWith(stockPrefix));
    }

    return found;
}
function createFile(stock: string, timeRange: string) {
    ensureDataDirExists();
    const dataDir = getDataDir();
    const fileName = `${stock}_${timeRange}_${timeRange}.csv`;
    const filePath = path.join(dataDir, fileName);

    const newFileHeaders = headers.join(",") + "\n";

    fs.writeFileSync(filePath, newFileHeaders);
}
function getFileName(stock: string): [string, string] {
    const dataDir = getDataDir();
    const stockPrefix = `${stock}_`;
    const files = fs.readdirSync(dataDir);
    const fileName = files.find((file) => file.startsWith(stockPrefix));
    if (!fileName) {
        throw new Error(`No file found for ${stock}`);
    }
    const filePath = path.join(dataDir, fileName);

    return [fileName, filePath];
}
function addBars(bars: Tbar[], filePath: string, addBefore: boolean = false) {
    if (bars.length === 0) {
        return;
    }
    const rows = bars
        .map((bar) =>
            [
                bar.Timestamp,
                bar.Volume,
                bar.ClosePrice,
                bar.HighPrice,
                bar.LowPrice,
                bar.TradeCount,
                bar.OpenPrice,
                bar.VWAP,
            ].join(",")
        )
        .join("\n");
    if (!addBefore) {
        fs.appendFileSync(filePath, rows + "\n");
    } else {
        // Read the original file content
        const originalContent = fs.readFileSync(filePath, "utf-8");
        const lines = originalContent.split("\n");
        const header = lines[0];
        const restOfContent = lines.slice(1).join("\n");
        const newContent =
            header +
            "\n" +
            (rows ? rows + "\n" : "") +
            (restOfContent.trim() ? restOfContent + "\n" : "");
        fs.writeFileSync(filePath, newContent);
    }
}
function getRange(file: string): [string, string] {
    const start = file.split("_")[1];
    const end = file.split("_")[2].split(".")[0];

    return [start, end];
}
function renameStartTo(rename: string, fileName: string): [string, string] {
    const renameTo = fileName.replace(
        /^([A-Za-z0-9]+)_([0-9\-]+)_/,
        `$1_${rename}_`
    );
    const dataDir = getDataDir();
    const oldPath = path.join(dataDir, fileName);
    const newPath = path.join(dataDir, renameTo);
    fs.renameSync(oldPath, newPath);
    return [renameTo, newPath];
}
function renameEndTo(rename: string, fileName: string): [string, string] {
    const renameTo = fileName.replace(
        /^(.*_\d{4}-\d{2}-\d{2})_[^_]+(\.csv)$/,
        `$1_${rename}$2`
    );
    const dataDir = getDataDir();
    const oldPath = path.join(dataDir, fileName);
    const newPath = path.join(dataDir, renameTo);
    fs.renameSync(oldPath, newPath);
    return [renameTo, newPath];
}
// Cache for bars data and cursor index
const barsCache = new Map<string, Tbar[]>();
const cursorIndex = new Map<string, number>();
const backtestCache = new Map<string, BacktestOrder[]>();

function getBarsData(stock: string): Tbar[] {
    if (barsCache.has(stock)) return barsCache.get(stock)!;

    const [_, filePath] = getFileName(stock);
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n");
    const headers = lines[0].split(",");

    const bars: Tbar[] = lines.slice(1).map((line) => {
        const values = line.split(",");
        const obj: any = {};
        headers.forEach((h, i) => (obj[h.trim()] = autoConvert(values[i])));
        return obj;
    });

    barsCache.set(stock, bars);
    return bars;
}

function autoConvert(val: string) {
    const trimmed = val.trim().toLowerCase();

    if (trimmed === "true") return true;
    if (trimmed === "false") return false;

    const n = Number(trimmed);
    if (!isNaN(n) && trimmed !== "") return n;

    return val.trim();
}

function binarySearch(bars: Tbar[], targetTime: number): number {
    let left = 0,
        right = bars.length - 1;
    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const midTime = new Date(bars[mid].Timestamp).getTime();
        if (midTime === targetTime) return mid;
        if (midTime < targetTime) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}

export function getBarByTimeWithCursor(
    stock: string,
    time: string
): Tbar | undefined {
    const bars = getBarsData(stock);
    if (!bars.length) return undefined;

    const targetTime = new Date(time).getTime();
    const currentIndex = cursorIndex.get(stock) ?? -1;

    // Fast path: check if next bar matches (sequential access)
    if (currentIndex >= 0 && currentIndex + 1 < bars.length) {
        const nextBar = bars[currentIndex + 1];
        if (new Date(nextBar.Timestamp).getTime() === targetTime) {
            cursorIndex.set(stock, currentIndex + 1);
            return nextBar;
        }
    }

    // Binary search
    const index = binarySearch(bars, targetTime);
    if (index === -1) return undefined;

    cursorIndex.set(stock, index);
    return bars[index];
}
export function isDBhasStockData(stock: string, date: string): boolean {
    if (!isStockFileExists(stock)) {
        return false;
    }
    const [fileName] = getFileName(stock);
    const [start, end] = getRange(fileName);

    const dataDate = new Date(date);
    const startDate = new Date(start);
    const endDate = new Date(end);

    return startDate <= dataDate && dataDate <= endDate;
}

function removeStockFile(stock: string) {
    let [_, filePath] = getFileName(stock);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

export function readBacktestFile(stock: string): BacktestOrder[] {
    const filePath = getBacktestFilePath(stock);
    if (!fs.existsSync(filePath)) {
        backtestCache.delete(stock);
        return [];
    }

    // Use cache to avoid multiple file reads
    if (backtestCache.has(stock)) {
        return backtestCache.get(stock)!;
    }

    if (!fs.existsSync(filePath)) {
        const emptyArr: BacktestOrder[] = [];
        backtestCache.set(stock, emptyArr);
        return emptyArr;
    }

    const contentArr = csvToObjects(
        filePath,
        backtestHeaders
    ) as BacktestOrder[];

    backtestCache.set(stock, contentArr);
    return contentArr;
}
function csvToObjects(filePath: string, headers: string[]): any[] {
    const originalContent = fs.readFileSync(filePath, "utf-8");

    const lines = originalContent
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    const dataLines = lines.slice(1);

    const contentArr = dataLines.map((line) => {
        const values = line.split(",");
        const obj: any = {};

        headers.forEach((header, index) => {
            obj[header] =
                values[index] !== undefined ? autoConvert(values[index]) : "";
        });

        return obj;
    });

    return contentArr;
}

export interface BacktestOrder {
    Id: string;
    isBuy: boolean;
    Timestamp: string;
    TotalShares: number;
    NextBuyOn: number;
    SellOn: number;
    Price: number;
    wasBought: boolean;
    wasSold: boolean;
}

function getBacktestFilePath(stock: string): string {
    const dataDir = getDataDir();
    const fileName = `${stock}-backtest.csv`;
    return path.join(dataDir, fileName);
}

export function writeBacktestFile(stock: string, orders: BacktestOrder[]) {
    ensureDataDirExists();
    const filePath = getBacktestFilePath(stock);

    const header = backtestHeaders.join(",") + "\n";
    const rows = orders
        .map((order) =>
            [
                order.Id,
                order.isBuy,
                order.Timestamp,
                order.TotalShares,
                order.NextBuyOn,
                order.SellOn,
                order.Price,
                order.wasBought,
                order.wasSold,
            ].join(",")
        )
        .join("\n");

    fs.writeFileSync(filePath, header + (rows ? rows + "\n" : ""));
    // Update cache when file is written
    backtestCache.set(stock, orders);
}

export function firstOrder(
    stock: string,
    timestamp: string,
    price: number,
    shares: number,
    nextBuyOn: number,
    sellOn: number
): BacktestOrder[] {
    const id = generateOrderId(stock);

    const newOrder: BacktestOrder = {
        Id: id,
        isBuy: true,
        Timestamp: timestamp,
        TotalShares: shares,
        NextBuyOn: nextBuyOn,
        SellOn: sellOn,
        Price: price,
        wasBought: false,
        wasSold: false,
    };

    return [newOrder];
}

export function addBuyOrder(
    stock: string,
    timestamp: string,
    price: number,
    shares: number,
    nextBuyOn: number,
    sellOn: number,
    wasBought: boolean = false
) {
    const orders = readBacktestFile(stock);
    const id = generateOrderId(stock);

    const newOrder: BacktestOrder = {
        Id: id,
        isBuy: true,
        Timestamp: timestamp,
        TotalShares: shares,
        NextBuyOn: nextBuyOn,
        SellOn: sellOn,
        Price: price,
        wasBought: wasBought,
        wasSold: false,
    };

    orders.push(newOrder);
    writeBacktestFile(stock, orders);
}

export function addSellOrder(
    stock: string,
    timestamp: string,
    price: number,
    shares: number,
    nextBuyOn: number,
    nextSell: number
) {
    const orders = readBacktestFile(stock);
    const id = generateOrderId(stock);

    const newOrder: BacktestOrder = {
        Id: id,
        isBuy: false,
        Timestamp: timestamp,
        TotalShares: shares,
        NextBuyOn: nextBuyOn,
        SellOn: nextSell,
        Price: price,
        wasBought: false,
        wasSold: false,
    };

    orders.push(newOrder);
    writeBacktestFile(stock, orders);
}

export function markOrderAsBought(stock: string, orderId: string) {
    const orders = readBacktestFile(stock);
    const order = orders.find((o) => o.Id === orderId);
    if (order) {
        order.wasBought = true;
        if (!order.isBuy) {
            order.wasSold = true;
        }
    }
    writeBacktestFile(stock, orders);
}

export function markOrderAsSold(stock: string, orderId: string) {
    const orders = readBacktestFile(stock);
    const order = orders.find((o) => o.Id === orderId);
    if (order) {
        order.wasSold = true;
    }
    writeBacktestFile(stock, orders);
}

export function getNeedToBuyOrders(
    orders: BacktestOrder[],
    currentPrice: number
): BacktestOrder[] {
    return orders.filter(
        (o) =>
            (!o.wasBought && currentPrice <= o.NextBuyOn) ||
            (!o.isBuy && !o.wasBought && currentPrice >= o.SellOn)
    );
}

export function getNeedToSellOrders(
    orders: BacktestOrder[],
    currentPrice: number
): BacktestOrder[] {
    return orders.filter(
        (o) => o.isBuy && !o.wasSold && currentPrice >= o.SellOn
    );
}

export function cleanCSV(stock: string) {
    const orders = readBacktestFile(stock);
    const filtered = orders.filter((v) => {
        if (v.wasBought && v.wasSold) return false;
        return true;
    });

    writeBacktestFile(stock, filtered);
}
