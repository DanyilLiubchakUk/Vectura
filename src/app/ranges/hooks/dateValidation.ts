import { formatDay } from "@/backtest/storage/dateUtils";
import { API_BASE } from "@/app/ranges/constants";
import { useRef, useCallback } from "react";
import type {
    RangeItem,
    ValidationResult,
    ValidationCacheEntry,
} from "@/app/ranges/types";

export function useDateValidation() {
    const validationTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
    const validationCache = useRef<
        Record<string, Record<string, ValidationCacheEntry>>
    >({});

    const validateDate = useCallback(
        async (
            symbol: string,
            start: string,
            end: string,
            rangeData: RangeItem,
            ranges: RangeItem[]
        ): Promise<ValidationResult> => {
            try {
                const range =
                    rangeData || ranges.find((r) => r.symbol === symbol);
                if (!range) {
                    return { valid: false, message: "Range not found" };
                }

                const today = new Date();
                today.setUTCDate(today.getUTCDate() - 10);
                const maxDate = formatDay(today);

                if (end > maxDate) {
                    return {
                        valid: false,
                        message: `End date must be before ${maxDate}`,
                        startSuggestions: { previous: null, next: null },
                        endSuggestions: { previous: null, next: null },
                    };
                }

                if (start > maxDate) {
                    return {
                        valid: false,
                        message: `Start date must be before ${maxDate}`,
                        startSuggestions: { previous: null, next: null },
                        endSuggestions: { previous: null, next: null },
                    };
                }

                if (
                    range.first_available_day &&
                    start < range.first_available_day
                ) {
                    return {
                        valid: false,
                        message: `Start date must be on or after ${range.first_available_day} (first available day)`,
                    };
                }

                if (!validationCache.current[symbol]) {
                    validationCache.current[symbol] = {};
                }
                const cache = validationCache.current[symbol];

                let isStartOpen: boolean | undefined = cache[start]?.isOpen;
                let isEndOpen: boolean | undefined = cache[end]?.isOpen;

                if (isStartOpen === undefined || isEndOpen === undefined) {
                    const checksToMake: Array<{ day: string }> = [];
                    if (isStartOpen === undefined)
                        checksToMake.push({ day: start });
                    if (isEndOpen === undefined)
                        checksToMake.push({ day: end });

                    const checkPromises = checksToMake.map(({ day }) =>
                        fetch(API_BASE, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                operation: "checkDayDirectly",
                                symbol,
                                day,
                            }),
                        }).then(async (res) => {
                            const result = await res.json();
                            return { day, isOpen: result.data === true };
                        })
                    );

                    const checkResults = await Promise.all(checkPromises);

                    checkResults.forEach(({ day, isOpen }) => {
                        if (!validationCache.current[symbol][day]) {
                            validationCache.current[symbol][day] = { isOpen };
                        } else {
                            validationCache.current[symbol][day].isOpen =
                                isOpen;
                        }
                    });

                    checkResults.forEach(({ day, isOpen }) => {
                        if (day === start) isStartOpen = isOpen;
                        if (day === end) isEndOpen = isOpen;
                    });
                }

                if (!isStartOpen || !isEndOpen) {
                    const invalidDays: string[] = [];
                    if (!isStartOpen) invalidDays.push(start);
                    if (!isEndOpen) invalidDays.push(end);

                    const daysToFetch: string[] = [];
                    invalidDays.forEach((day) => {
                        if (!validationCache.current[symbol][day]?.nearest) {
                            daysToFetch.push(day);
                        }
                    });

                    let nearestForStart = !isStartOpen
                        ? validationCache.current[symbol][start]?.nearest
                        : null;
                    let nearestForEnd = !isEndOpen
                        ? validationCache.current[symbol][end]?.nearest
                        : null;

                    if (daysToFetch.length > 0) {
                        const nearestPromises = daysToFetch.map((day) => {
                            return fetch(API_BASE, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    operation: "findNearestMarketDays",
                                    symbol,
                                    day,
                                }),
                            }).then(async (res) => {
                                const json = await res.json();
                                return { day, nearest: json.data };
                            });
                        });

                        const nearestResults = await Promise.all(
                            nearestPromises
                        );

                        nearestResults.forEach(({ day, nearest }) => {
                            if (!validationCache.current[symbol][day]) {
                                validationCache.current[symbol][day] = {
                                    isOpen: false,
                                    nearest,
                                };
                            } else {
                                validationCache.current[symbol][day].nearest =
                                    nearest;
                            }
                        });

                        nearestResults.forEach(({ day, nearest }) => {
                            if (day === start) nearestForStart = nearest;
                            if (day === end) nearestForEnd = nearest;
                        });
                    }

                    const filterSuggestions = (
                        suggestions:
                            | { previous: string | null; next: string | null }
                            | null
                            | undefined
                    ): { previous: string | null; next: string | null } => {
                        if (!suggestions) {
                            return { previous: null, next: null };
                        }
                        return {
                            previous:
                                suggestions.previous &&
                                suggestions.previous <= maxDate
                                    ? suggestions.previous
                                    : null,
                            next:
                                suggestions.next && suggestions.next <= maxDate
                                    ? suggestions.next
                                    : null,
                        };
                    };

                    const filteredStartSuggestions =
                        filterSuggestions(nearestForStart);
                    const filteredEndSuggestions =
                        filterSuggestions(nearestForEnd);

                    let errorMessage = "";
                    if (!isStartOpen) {
                        if (start > maxDate) {
                            errorMessage = `Start date must be before ${maxDate}.`;
                        } else if (start === maxDate) {
                            const hasValidStartSuggestions =
                                filteredStartSuggestions.previous ||
                                filteredStartSuggestions.next;
                            if (!hasValidStartSuggestions) {
                                errorMessage = `Start date ${start} is a closed market day and is at the maximum allowed date.`;
                            }
                        } else {
                            const hasValidStartSuggestions =
                                filteredStartSuggestions.previous ||
                                filteredStartSuggestions.next;
                            errorMessage = `Start date ${start} is not a market trading day.${
                                hasValidStartSuggestions
                                    ? " Choose one of the suggested dates."
                                    : ""
                            }`;
                        }
                    }
                    if (!isEndOpen) {
                        if (end > maxDate) {
                            errorMessage = errorMessage
                                ? `${errorMessage} End date must be before ${maxDate}.`
                                : `End date must be before ${maxDate}.`;
                        } else if (end === maxDate) {
                            const hasValidEndSuggestions =
                                filteredEndSuggestions.previous ||
                                filteredEndSuggestions.next;
                            if (!hasValidEndSuggestions) {
                                const endMsg = `End date ${end} is a closed market day and is at the maximum allowed date.`;
                                errorMessage = errorMessage
                                    ? `${errorMessage} ${endMsg}`
                                    : endMsg;
                            }
                        } else {
                            const hasValidEndSuggestions =
                                filteredEndSuggestions.previous ||
                                filteredEndSuggestions.next;
                            const endMsg = `End date ${end} is not a market trading day.${
                                hasValidEndSuggestions
                                    ? " Choose one of the suggested dates."
                                    : ""
                            }`;
                            errorMessage = errorMessage
                                ? `${errorMessage} ${endMsg}`
                                : endMsg;
                        }
                    }

                    return {
                        valid: false,
                        message: errorMessage || undefined,
                        startSuggestions: filteredStartSuggestions,
                        endSuggestions: filteredEndSuggestions,
                    };
                }

                return {
                    valid: true,
                    adjustedStart: start,
                    adjustedEnd: end,
                };
            } catch (error) {
                return {
                    valid: false,
                    message: "Validation failed",
                };
            }
        },
        []
    );

    const debouncedValidate = useCallback(
        (
            symbol: string,
            start: string,
            end: string,
            rangeData: RangeItem,
            ranges: RangeItem[],
            onValidationComplete: (result: ValidationResult) => void
        ) => {
            if (validationTimeouts.current[symbol]) {
                clearTimeout(validationTimeouts.current[symbol]);
            }

            validationTimeouts.current[symbol] = setTimeout(async () => {
                const validation = await validateDate(
                    symbol,
                    start,
                    end,
                    rangeData,
                    ranges
                );
                onValidationComplete(validation);
                delete validationTimeouts.current[symbol];
            }, 500);
        },
        [validateDate]
    );

    const clearCache = (symbol: string) => {
        if (validationCache.current[symbol]) {
            delete validationCache.current[symbol];
        }
    };

    return {
        validateDate,
        debouncedValidate,
        clearCache,
    };
}
