import type { SymbolRange } from "@/backtest/types";
import type { BacktestProgressEvent } from "@/backtest/types";

export interface RangeItem extends SymbolRange {
    editingStart?: string;
    editingEnd?: string;
    isValidating?: boolean;
    isValid?: boolean;
    validationMessage?: string;
    startSuggestions?: { previous: string | null; next: string | null };
    endSuggestions?: { previous: string | null; next: string | null };
    isUpdating?: boolean;
    isDownloading?: boolean;
    downloadProgress?: BacktestProgressEvent | null;
}

export interface ValidationResult {
    valid: boolean;
    message?: string;
    adjustedStart?: string;
    adjustedEnd?: string;
    startSuggestions?: { previous: string | null; next: string | null };
    endSuggestions?: { previous: string | null; next: string | null };
}

export interface ValidationCacheEntry {
    isOpen?: boolean;
    nearest?: { previous: string | null; next: string | null };
}
