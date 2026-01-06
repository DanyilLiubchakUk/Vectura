"use client";

import {
    calculateDaysBetween,
    getTodayMinusDays,
} from "@/backtest/storage/dateUtils";
import { useDateValidation } from "@/app/ranges/hooks/dateValidation";
import { sliderValueToDate } from "@/app/ranges/utils/date-helpers";
import { useRangeUpdate } from "@/app/ranges/hooks/rangeUpdate";
import { RangeCard } from "@/app/ranges/components/RangeCard";
import { AppHeader } from "@/components/layout/app-header";
import { useRanges } from "@/app/ranges/hooks/rangesData";
import { Card, CardContent } from "@/components/ui/card";
import { DAYS_BEFORE_TODAY } from "@/backtest/constants";
import { OLDEST_DAY } from "@/constants/time";
import { useCallback } from "react";

export default function RangesPage() {
    const { ranges, setRanges, loading, handleDelete } = useRanges();
    const { debouncedValidate, clearCache } = useDateValidation();
    const { handleUpdateRange } = useRangeUpdate(setRanges, clearCache);

    const handleRangeChange = useCallback(
        (symbol: string, values: number[]) => {
            const range = ranges.find((r) => r.symbol === symbol);
            if (!range) return;

            const firstAvailable = range.first_available_day || OLDEST_DAY;
            const maxDate = getTodayMinusDays(DAYS_BEFORE_TODAY);
            const totalDays = calculateDaysBetween(
                firstAvailable,
                maxDate,
                true
            );

            const newStart = sliderValueToDate(
                values[0],
                firstAvailable,
                maxDate,
                totalDays
            );
            const newEnd = sliderValueToDate(
                values[1],
                firstAvailable,
                maxDate,
                totalDays
            );

            setRanges((prev) =>
                prev.map((r) => {
                    if (r.symbol !== symbol) return r;
                    return {
                        ...r,
                        editingStart: newStart,
                        editingEnd: newEnd,
                        isValidating: true,
                    };
                })
            );

            const currentRange = ranges.find((r) => r.symbol === symbol);
            if (currentRange) {
                debouncedValidate(
                    symbol,
                    newStart,
                    newEnd,
                    {
                        ...currentRange,
                        editingStart: newStart,
                        editingEnd: newEnd,
                    },
                    ranges,
                    (result) => {
                        setRanges((prev) =>
                            prev.map((r) =>
                                r.symbol === symbol
                                    ? {
                                          ...r,
                                          isValidating: false,
                                          isValid: result.valid || false,
                                          validationMessage: result.message,
                                          startSuggestions:
                                              result.startSuggestions,
                                          endSuggestions: result.endSuggestions,
                                      }
                                    : r
                            )
                        );
                    }
                );
            }
        },
        [ranges, debouncedValidate]
    );

    const handleDateInputChange = useCallback(
        (symbol: string, type: "start" | "end", date: string) => {
            const range = ranges.find((r) => r.symbol === symbol);
            if (!range) return;

            const firstAvailable = range.first_available_day || OLDEST_DAY;
            const maxDate = getTodayMinusDays(DAYS_BEFORE_TODAY);

            const newStart =
                type === "start"
                    ? date
                    : range.editingStart || range.have_from || firstAvailable;
            const newEnd =
                type === "end"
                    ? date
                    : range.editingEnd || range.have_to || maxDate;

            setRanges((prev) => {
                const updated = prev.map((r) => {
                    if (r.symbol !== symbol) return r;
                    return {
                        ...r,
                        editingStart: newStart,
                        editingEnd: newEnd,
                        isValidating: true,
                    };
                });

                const updatedRange = updated.find((r) => r.symbol === symbol);
                if (updatedRange) {
                    debouncedValidate(
                        symbol,
                        newStart,
                        newEnd,
                        updatedRange,
                        updated,
                        (result) => {
                            setRanges((prevState) =>
                                prevState.map((r) =>
                                    r.symbol === symbol
                                        ? {
                                              ...r,
                                              isValidating: false,
                                              isValid: result.valid || false,
                                              validationMessage: result.message,
                                              startSuggestions:
                                                  result.startSuggestions,
                                              endSuggestions:
                                                  result.endSuggestions,
                                          }
                                        : r
                                )
                            );
                        }
                    );
                }

                return updated;
            });
        },
        [ranges, debouncedValidate]
    );

    const handleSuggestionClick = useCallback(
        (symbol: string, type: "start" | "end", date: string) => {
            const range = ranges.find((r) => r.symbol === symbol);
            if (!range) return;

            const firstAvailable = range.first_available_day || OLDEST_DAY;
            const maxDate = getTodayMinusDays(DAYS_BEFORE_TODAY);

            const newStart =
                type === "start"
                    ? date
                    : range.editingStart || range.have_from || firstAvailable;
            const newEnd =
                type === "end"
                    ? date
                    : range.editingEnd || range.have_to || maxDate;

            setRanges((prev) => {
                const updated = prev.map((r) => {
                    if (r.symbol !== symbol) return r;

                    const clearedStartSuggestions =
                        type === "start"
                            ? { previous: null, next: null }
                            : r.startSuggestions || {
                                  previous: null,
                                  next: null,
                              };
                    const clearedEndSuggestions =
                        type === "end"
                            ? { previous: null, next: null }
                            : r.endSuggestions || {
                                  previous: null,
                                  next: null,
                              };

                    const otherDateIsValid =
                        (type === "start" &&
                            !clearedEndSuggestions.previous &&
                            !clearedEndSuggestions.next) ||
                        (type === "end" &&
                            !clearedStartSuggestions.previous &&
                            !clearedStartSuggestions.next);

                    return {
                        ...r,
                        editingStart: newStart,
                        editingEnd: newEnd,
                        isValid: otherDateIsValid,
                        isValidating: false,
                        startSuggestions: clearedStartSuggestions,
                        endSuggestions: clearedEndSuggestions,
                    };
                });

                const updatedRange = updated.find((r) => r.symbol === symbol);
                if (updatedRange) {
                    const otherDateHasSuggestions =
                        (type === "start" &&
                            updatedRange.endSuggestions &&
                            (updatedRange.endSuggestions.previous ||
                                updatedRange.endSuggestions.next)) ||
                        (type === "end" &&
                            updatedRange.startSuggestions &&
                            (updatedRange.startSuggestions.previous ||
                                updatedRange.startSuggestions.next));

                    if (otherDateHasSuggestions) {
                        debouncedValidate(
                            symbol,
                            newStart,
                            newEnd,
                            updatedRange,
                            updated,
                            (result) => {
                                setRanges((prevState) =>
                                    prevState.map((r) =>
                                        r.symbol === symbol
                                            ? {
                                                  ...r,
                                                  isValidating: false,
                                                  isValid:
                                                      result.valid || false,
                                                  validationMessage:
                                                      result.message,
                                                  startSuggestions:
                                                      type === "start"
                                                          ? {
                                                                previous: null,
                                                                next: null,
                                                            }
                                                          : result.startSuggestions || {
                                                                previous: null,
                                                                next: null,
                                                            },
                                                  endSuggestions:
                                                      type === "end"
                                                          ? {
                                                                previous: null,
                                                                next: null,
                                                            }
                                                          : result.endSuggestions || {
                                                                previous: null,
                                                                next: null,
                                                            },
                                              }
                                            : r
                                    )
                                );
                            }
                        );
                    }
                }

                return updated;
            });
        },
        [ranges, debouncedValidate]
    );

    const onUpdateRange = useCallback(
        (symbol: string) => {
            handleUpdateRange(symbol, ranges);
        },
        [handleUpdateRange, ranges]
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <p className="text-muted-foreground">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <AppHeader title="Range Manager" />

            <main className="flex-1 container mx-auto px-4 md:px-6 lg:px-8 py-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    {ranges.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <p className="text-muted-foreground">
                                    No stock ranges found. Run a backtest to
                                    create ranges.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        ranges.map((range) => (
                            <RangeCard
                                key={range.symbol}
                                range={range}
                                onRangeChange={handleRangeChange}
                                onDateInputChange={handleDateInputChange}
                                onSuggestionClick={handleSuggestionClick}
                                onUpdateRange={onUpdateRange}
                                onDelete={handleDelete}
                            />
                        ))
                    )}
                </div>
            </main>
        </div>
    );
}
