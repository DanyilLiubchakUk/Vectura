import { getTodayMinusDays } from "@/backtest/storage/dateUtils";
import { DAYS_BEFORE_TODAY } from "@/backtest/constants";
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

                const maxDate = getTodayMinusDays(DAYS_BEFORE_TODAY);

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
                        })
                            .then(async (res) => {
                                if (!res.ok) {
                                    return { day, isOpen: undefined, error: true };
                                }
                                const result = await res.json();

                                if (result.error) {
                                    return { day, isOpen: undefined, error: true };
                                }
                                return { day, isOpen: result.data === true, error: false };
                            })
                            .catch(() => {
                                return { day, isOpen: undefined, error: true };
                            })
                    );

                    const checkResults = await Promise.all(checkPromises);

                    checkResults.forEach(({ day, isOpen, error }) => {
                        if (!error && isOpen !== undefined) {
                            if (!validationCache.current[symbol][day]) {
                                validationCache.current[symbol][day] = { isOpen };
                            } else {
                                validationCache.current[symbol][day].isOpen = isOpen;
                            }
                        } else {
                            if (validationCache.current[symbol][day]) {
                                validationCache.current[symbol][day].isOpen = undefined;
                                if (
                                    validationCache.current[symbol][day].nearest &&
                                    validationCache.current[symbol][day].nearest
                                        .previous === null &&
                                    validationCache.current[symbol][day].nearest
                                        .next === null
                                ) {
                                    validationCache.current[symbol][day].nearest = undefined;
                                }
                            }
                        }
                    });

                    checkResults.forEach(({ day, isOpen, error }) => {
                        if (!error && isOpen !== undefined) {
                            if (day === start) isStartOpen = isOpen;
                            if (day === end) isEndOpen = isOpen;
                        }
                    });
                }

                if (isStartOpen === undefined || isEndOpen === undefined) {
                    return {
                        valid: false,
                        message: "Unable to validate dates due to API error. Please try again or check if dates are within the existing range.",
                        startSuggestions: { previous: null, next: null },
                        endSuggestions: { previous: null, next: null },
                    };
                }

                if (isStartOpen === false || isEndOpen === false) {
                    const invalidDays: string[] = [];
                    if (isStartOpen === false) invalidDays.push(start);
                    if (isEndOpen === false) invalidDays.push(end);

                    const daysToFetch: string[] = [];
                    invalidDays.forEach((day) => {
                        const cached = validationCache.current[symbol][day];
                        if (
                            !cached?.nearest ||
                            (cached.nearest.previous === null &&
                                cached.nearest.next === null)
                        ) {
                            daysToFetch.push(day);
                        }
                    });

                    let nearestForStart =
                        isStartOpen === false
                            ? validationCache.current[symbol][start]?.nearest
                            : null;
                    let nearestForEnd =
                        isEndOpen === false
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
                            })
                                .then(async (res) => {
                                    if (!res.ok) {
                                        return { day, nearest: null, error: true };
                                    }
                                    const json = await res.json();
                                    if (json.error) {
                                        return { day, nearest: null, error: true };
                                    }
                                    return { day, nearest: json.data, error: false };
                                })
                                .catch(() => {
                                    return { day, nearest: null, error: true };
                                });
                        });

                        const nearestResults = await Promise.all(
                            nearestPromises
                        );

                        nearestResults.forEach(({ day, nearest, error }) => {
                            if (!error && nearest !== null) {
                                if (!validationCache.current[symbol][day]) {
                                    validationCache.current[symbol][day] = {
                                        isOpen: false,
                                        nearest,
                                    };
                                } else {
                                    validationCache.current[symbol][day].nearest = nearest;
                                }
                            }
                        });

                        nearestResults.forEach(({ day, nearest, error }) => {
                            if (!error && nearest !== null) {
                                if (day === start) nearestForStart = nearest;
                                if (day === end) nearestForEnd = nearest;
                            }
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
                    if (isStartOpen === false) {
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
                    if (isEndOpen === false) {
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

                if (isStartOpen === true && isEndOpen === true) {
                    return {
                        valid: true,
                        adjustedStart: start,
                        adjustedEnd: end,
                    };
                }
                return {
                    valid: false,
                    message: "Unexpected validation state. Please try again.",
                    startSuggestions: { previous: null, next: null },
                    endSuggestions: { previous: null, next: null },
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
