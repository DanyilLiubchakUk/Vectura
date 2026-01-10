import { calculateDaysBetween, formatDay } from "@/backtest/storage/dateUtils";

export const dateToSliderValue = (
    date: string | null,
    minDate: string,
    maxDate: string,
    totalDays: number
): number => {
    if (!date) return 0;
    const dateMs = new Date(date + "T00:00:00Z").getTime();
    const minMs = new Date(minDate + "T00:00:00Z").getTime();
    const daysFromStart = Math.round((dateMs - minMs) / (1000 * 60 * 60 * 24));
    return (daysFromStart / totalDays) * 100;
};

export const sliderValueToDate = (
    value: number,
    minDate: string,
    maxDate: string,
    totalDays: number
): string => {
    const minMs = new Date(minDate + "T00:00:00Z").getTime();
    const daysFromStart = Math.round((value / 100) * totalDays);
    const dateMs = minMs + daysFromStart * (1000 * 60 * 60 * 24);
    return formatDay(new Date(dateMs));
};

export const formatDate = (date: string | null): string => {
    if (!date) return "";
    const d = new Date(date + "T00:00:00Z");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const year = d.getUTCFullYear();
    return `${month}/${day}/${year}`;
};

export const calculateStepSize = (
    firstAvailable: string,
    maxDate: string
): number => {
    const totalDays = calculateDaysBetween(firstAvailable, maxDate, true);
    return 100 / totalDays; // Step size for one day
};
