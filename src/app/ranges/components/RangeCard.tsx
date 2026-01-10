"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    dateToSliderValue,
    formatDate,
    calculateStepSize,
} from "@/app/ranges/utils/date-helpers";
import {
    getTodayMinusDays,
    calculateDaysBetween,
} from "@/backtest/storage/dateUtils";
import { SuggestionButtons } from "@/app/ranges/components/SuggestionButtons";
import { Trash2, Loader2, Download, Database } from "lucide-react";
import { DAYS_BEFORE_TODAY } from "@/backtest/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OLDEST_DAY } from "@/constants/time";
import { useState } from "react";
import type { RangeItem } from "@/app/ranges/types";

interface RangeCardProps {
    range: RangeItem;
    onRangeChange: (symbol: string, values: number[]) => void;
    onDateInputChange: (
        symbol: string,
        type: "start" | "end",
        date: string
    ) => void;
    onSuggestionClick: (
        symbol: string,
        type: "start" | "end",
        date: string
    ) => void;
    onUpdateRange: (symbol: string) => void;
    onDelete: (symbol: string) => void;
}

export function RangeCard({
    range,
    onRangeChange,
    onDateInputChange,
    onSuggestionClick,
    onUpdateRange,
    onDelete,
}: RangeCardProps) {
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const firstAvailable = range.first_available_day || OLDEST_DAY;
    const maxDate = getTodayMinusDays(DAYS_BEFORE_TODAY);
    const currentStart =
        range.editingStart !== undefined
            ? range.editingStart
            : range.have_from || firstAvailable;
    const currentEnd =
        range.editingEnd !== undefined
            ? range.editingEnd
            : range.have_to || maxDate;

    const savedStart = range.have_from || firstAvailable;
    const savedEnd = range.have_to || maxDate;

    const totalDays = calculateDaysBetween(firstAvailable, maxDate, true);
    const stepSize = calculateStepSize(firstAvailable, maxDate);

    const savedStartValue = dateToSliderValue(
        savedStart,
        firstAvailable,
        maxDate,
        totalDays
    );
    const savedEndValue = dateToSliderValue(
        savedEnd,
        firstAvailable,
        maxDate,
        totalDays
    );

    const currentStartValue = dateToSliderValue(
        currentStart,
        firstAvailable,
        maxDate,
        totalDays
    );
    const currentEndValue = dateToSliderValue(
        currentEnd,
        firstAvailable,
        maxDate,
        totalDays
    );

    const hasChanges =
        range.editingStart !== undefined || range.editingEnd !== undefined;

    const startSuggestions = range.startSuggestions || {
        previous: null,
        next: null,
    };
    const endSuggestions = range.endSuggestions || {
        previous: null,
        next: null,
    };
    const hasStartSuggestions =
        startSuggestions.previous || startSuggestions.next;
    const hasEndSuggestions = endSuggestions.previous || endSuggestions.next;

    return (
        <Card className="text-sm p-0">
            <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <span className="font-semibold text-base">
                            {range.symbol}
                        </span>
                        {range.have_from && range.have_to && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <Database className="h-4 w-4" />
                                <div className="flex flex-col items-center">
                                    <span>{formatDate(range.have_from)}</span>
                                    <span className="h-0.5 w-full bg-muted rounded" />
                                    <span>{formatDate(range.have_to)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                    <Dialog
                        open={deleteDialogOpen}
                        onOpenChange={setDeleteDialogOpen}
                    >
                        <DialogTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Delete Stock Data</DialogTitle>
                                <DialogDescription>
                                    This will permanently delete all data for{" "}
                                    <strong>{range.symbol}</strong>. This action
                                    cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => setDeleteDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        onDelete(range.symbol);
                                        setDeleteDialogOpen(false);
                                    }}
                                >
                                    Delete All Data
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label
                            htmlFor={`start-${range.symbol}`}
                            className="text-xs"
                        >
                            Start
                        </Label>
                        <Input
                            id={`start-${range.symbol}`}
                            type="date"
                            value={currentStart}
                            min={firstAvailable}
                            max={maxDate}
                            onChange={(e) =>
                                onDateInputChange(
                                    range.symbol,
                                    "start",
                                    e.target.value
                                )
                            }
                            disabled={range.isUpdating}
                            className="h-8 text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label
                            htmlFor={`end-${range.symbol}`}
                            className="text-xs"
                        >
                            End
                        </Label>
                        <Input
                            id={`end-${range.symbol}`}
                            type="date"
                            value={currentEnd}
                            min={firstAvailable}
                            max={maxDate}
                            onChange={(e) =>
                                onDateInputChange(
                                    range.symbol,
                                    "end",
                                    e.target.value
                                )
                            }
                            disabled={range.isUpdating}
                            className="h-8 text-xs"
                        />
                    </div>
                </div>

                <div className="relative py-3">
                    {range.have_from && range.have_to && (
                        <>
                            <div
                                className="absolute  top-1/2 -translate-y-1/2 -translate-x-1/2 z-45 pointer-events-none h-5 w-1 border-muted-foreground border-y-2 border-l-2"
                                style={{
                                    left: `calc(${savedStartValue}% + ${
                                        8 - 0.16 * savedStartValue - 8
                                    }px)`,
                                }}
                            />
                            <div
                                className="absolute  top-1/2 -translate-y-1/2 -translate-x-1/2 z-45 pointer-events-none h-5 w-1 border-muted-foreground border-y-2 border-r-2"
                                style={{
                                    left: `calc(${savedEndValue}% + ${
                                        8 - 0.16 * savedEndValue + 8
                                    }px)`,
                                }}
                            />
                        </>
                    )}
                    <Slider
                        className="relative z-30"
                        id={`slider-${range.symbol}`}
                        max={100}
                        min={0}
                        step={stepSize}
                        onValueChange={(values) =>
                            onRangeChange(range.symbol, values)
                        }
                        value={[currentStartValue, currentEndValue]}
                        disabled={range.isUpdating}
                    />
                </div>

                {hasStartSuggestions && (
                    <SuggestionButtons
                        type="start"
                        selectedDate={currentStart}
                        suggestions={startSuggestions}
                        onSuggestionClick={(date) =>
                            onSuggestionClick(range.symbol, "start", date)
                        }
                    />
                )}
                {hasEndSuggestions && (
                    <SuggestionButtons
                        type="end"
                        selectedDate={currentEnd}
                        suggestions={endSuggestions}
                        onSuggestionClick={(date) =>
                            onSuggestionClick(range.symbol, "end", date)
                        }
                    />
                )}

                {range.isValidating && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <div className="h-2 w-2 rounded-full bg-accent-foreground animate-pulse" />
                        Validating...
                    </div>
                )}

                {hasChanges &&
                    !range.isValid &&
                    range.validationMessage &&
                    (range.startSuggestions?.previous ||
                    range.startSuggestions?.next ||
                    range.endSuggestions?.previous ||
                    range.endSuggestions?.next ? null : (
                        <div className="text-xs text-destructive">
                            {range.validationMessage}
                        </div>
                    ))}

                {hasChanges && (
                    <Button
                        onClick={() => onUpdateRange(range.symbol)}
                        disabled={
                            range.isUpdating ||
                            range.isValidating ||
                            range.isValid !== true
                        }
                        size="sm"
                        className="h-7 w-full text-xs"
                    >
                        {range.isUpdating ? (
                            <>
                                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            <>
                                <Download className="h-3 w-3 mr-1.5" />
                                Update Range
                            </>
                        )}
                    </Button>
                )}

                {range.isDownloading &&
                    range.downloadProgress &&
                    (() => {
                        const stage = range.downloadProgress.stage;
                        const progress =
                            range.downloadProgress.data?.progress ?? 0;
                        const isBefore = stage === "downloading_before_range";
                        const isAfter = stage === "downloading_after_range";

                        if (!isBefore && !isAfter) return null;

                        return (
                            <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground min-w-[80px]">
                                        {isBefore
                                            ? "Before range"
                                            : "After range"}
                                    </span>
                                    <div className="flex-1">
                                        <Progress value={progress} />
                                    </div>
                                    <span className="text-muted-foreground min-w-[35px] text-right">
                                        {progress}%
                                    </span>
                                </div>
                            </div>
                        );
                    })()}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                    <span>{formatDate(firstAvailable)}</span>
                    <span>{formatDate(maxDate)}</span>
                </div>
            </CardContent>
        </Card>
    );
}
