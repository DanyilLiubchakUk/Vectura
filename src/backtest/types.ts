export interface DayBlob {
    symbol: string;
    day: string;
    compact: Array<[number, number]>;
    records: number;
    start_ts: number;
    end_ts: number;
}

export interface SymbolRange {
    symbol: string;
    have_from: string | null;
    have_to: string | null;
    first_available_day: string | null;
    updated_at: string;
    splits: SplitInfo[];
    last_split_check: string | null;
}

export interface SplitInfo {
    effective_date: string;
    split_factor: number;
}

export interface MissingRange {
    start: string;
    end: string;
}

export interface MinuteBar {
    timestamp: string;
    close: number;
}

export interface Split {
    date: Date;
    ratio: number;
}

export type BacktestProgressStage =
    | "initialize_backtest"
    | "searching_first_available_day"
    | "downloading_before_range"
    | "downloading_after_range"
    | "working_on_chunk"
    | "calculating_metrics"
    | "accumulating_chunks"
    | "completed";

export interface BacktestProgressEvent {
    stage: BacktestProgressStage;
    message: string;
    data?: {
        stock?: string;
        startDate?: string;
        endDate?: string;
        chunkStart?: string;
        chunkEnd?: string;
        processedBars?: number;
        totalBars?: number;
        currentBar?: number;
        progress?: number; // 0-100
        [key: string]: any;
    };
    timestamp: string;
}

export interface PricePoint {
    time: string | number;
    value: number;
}

export interface ExecutionLine {
    id: string;
    type: 'buy' | 'sell';
    triggerPrice: number;
    startTime: string;
    executionTime?: string;
    executed: boolean;
}

export interface BacktestResult {
    stock: string;
    startDate: string;
    endDate: string;
    startCapital: number;
    finalEquity: number;
    investedCash: number;
    totalReturn: number;
    totalReturnPercent: number;
    processedBars: number;
    executionTime: string; // formatted HH:MM:SS
    chartData?: {
        priceData: PricePoint[];
        equityData?: PricePoint[];
        cashData?: PricePoint[];
        executions: ExecutionLine[];
    };
    metrics?: {
        averageInvestedCapitalPct: number;
        maximumEquity: number;
        maximumDrawdownPct: number;
        maximumDrawdownDollar: number;
        longestDrawdownDurationDays: number;
        totalTradesExecuted: number;
        averageTradesPerMonth: number;
        bestMonthReturnPct: number;
        worstMonthReturnPct: number;
        returnMaxDrawdownRatio: number;
        buyHoldComparison: {
            dollarDifference: number;
            percentageDifference: number;
        };
    };
    [key: string]: any;
}

export interface BacktestConfig {
    executionMode: "local" | "cloud";
    stock: string;
    startDate: string;
    endDate: string;
    startCapital: number;
    contributionFrequencyDays?: number;
    contributionAmount?: number;
    backtestTime?: string;
    capitalPct: number;
    buyBelowPct: number;
    sellAbovePct: number;
    buyAfterSellPct: number;
    cashFloor: number;
    orderGapFilterEnabled: boolean;
    orderGapPct: number;
}

export type ProgressCallback = (
    event: BacktestProgressEvent
) => void | Promise<void>;
