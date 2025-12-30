import { API_BASE } from "@/app/ranges/constants";
import { useCallback } from "react";
import type { BacktestProgressEvent } from "@/backtest/types";
import type { RangeItem } from "@/app/ranges/types";

function createResetState(symbol: string): Partial<RangeItem> {
    return {
        isUpdating: false,
        isDownloading: false,
        downloadProgress: null,
        editingStart: undefined,
        editingEnd: undefined,
    };
}

function updateRangeState(
    setRanges: React.Dispatch<React.SetStateAction<RangeItem[]>>,
    symbol: string,
    updates: Partial<RangeItem>
) {
    setRanges((prev) =>
        prev.map((r) => (r.symbol === symbol ? { ...r, ...updates } : r))
    );
}

export function useRangeUpdate(
    setRanges: React.Dispatch<React.SetStateAction<RangeItem[]>>,
    clearValidationCache: (symbol: string) => void
) {
    const handleUpdateRange = useCallback(
        async (symbol: string, ranges: RangeItem[]) => {
            const range = ranges.find((r) => r.symbol === symbol);
            if (!range || !range.editingStart || !range.editingEnd) {
                return;
            }

            updateRangeState(setRanges, symbol, {
                isUpdating: true,
                isDownloading: true,
                downloadProgress: null,
            });

            try {
                const url = `${API_BASE}/update?symbol=${encodeURIComponent(
                    symbol
                )}&haveFrom=${encodeURIComponent(
                    range.editingStart
                )}&haveTo=${encodeURIComponent(range.editingEnd)}`;

                const eventSource = new EventSource(url);

                eventSource.onmessage = (event) => {
                    const data = JSON.parse(event.data);

                    if (data.type === "progress") {
                        const progressEvent = { ...data };
                        delete progressEvent.type;
                        updateRangeState(setRanges, symbol, {
                            downloadProgress:
                                progressEvent as BacktestProgressEvent,
                        });
                    } else if (data.type === "complete") {
                        eventSource.close();
                        clearValidationCache(symbol);

                        fetch(
                            `${API_BASE}?symbol=${encodeURIComponent(symbol)}`
                        )
                            .then((response) => {
                                if (response.ok) {
                                    return response.json();
                                }
                                return null;
                            })
                            .then((result) => {
                                if (
                                    result &&
                                    result.data &&
                                    result.data.length > 0
                                ) {
                                    const updatedRange = result.data[0];
                                    setRanges((prev) =>
                                        prev.map((r) => {
                                            if (r.symbol !== symbol) return r;
                                            return {
                                                ...updatedRange,
                                                ...createResetState(symbol),
                                                isValidating: r.isValidating,
                                                isValid: r.isValid,
                                                startSuggestions:
                                                    r.startSuggestions,
                                                endSuggestions:
                                                    r.endSuggestions,
                                            };
                                        })
                                    );
                                } else {
                                    updateRangeState(
                                        setRanges,
                                        symbol,
                                        createResetState(symbol)
                                    );
                                }
                            })
                            .catch(() => {
                                updateRangeState(
                                    setRanges,
                                    symbol,
                                    createResetState(symbol)
                                );
                            });
                    } else if (data.type === "error") {
                        eventSource.close();
                        updateRangeState(setRanges, symbol, {
                            isUpdating: false,
                            isDownloading: false,
                            downloadProgress: null,
                        });
                    }
                };

                eventSource.onerror = () => {
                    eventSource.close();
                    updateRangeState(
                        setRanges,
                        symbol,
                        createResetState(symbol)
                    );
                };
            } catch {
                updateRangeState(setRanges, symbol, createResetState(symbol));
            }
        },
        [setRanges, clearValidationCache]
    );

    return { handleUpdateRange };
}
