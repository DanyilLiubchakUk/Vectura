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
