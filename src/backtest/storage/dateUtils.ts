export interface TimeBoundaries {
    startBoundaryIso: string;
    endBoundaryIso: string;
    desiredStart: string;
}

export function formatDay(date: Date): string {
    return date.toISOString().split("T")[0];
}

export function previousDay(day: string): string {
    const date = new Date(day + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() - 1);
    return formatDay(date);
}

export function nextDay(day: string): string {
    const date = new Date(day + "T00:00:00Z");
    date.setUTCDate(date.getUTCDate() + 1);
    return formatDay(date);
}

export function isEarlierDay(a: string, b: string): boolean {
    return new Date(a) < new Date(b);
}

export function isLaterDay(a: string, b: string): boolean {
    return new Date(a) > new Date(b);
}

export function getTodayMinusDays(days: number): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - days);
    return formatDay(date);
}

export function isDayBeforeOrEqual(a: string, b: string): boolean {
    return new Date(a) <= new Date(b);
}

export function addMonths(day: string, months: number): string {
    const date = new Date(day + "T00:00:00Z");
    date.setUTCMonth(date.getUTCMonth() + months);
    return formatDay(date);
}
export function calculateDaysBetween(
    startTimestamp: string,
    endTimestamp: string,
    inclusive = false,
    clampToZero = false
): number {
    const start = startTimestamp.includes("T")
        ? new Date(startTimestamp).getTime()
        : new Date(startTimestamp + "T00:00:00Z").getTime();
    const end = endTimestamp.includes("T")
        ? new Date(endTimestamp).getTime()
        : new Date(endTimestamp + "T00:00:00Z").getTime();

    const diffMs = end - start;
    const clampedDiff = clampToZero ? Math.max(0, diffMs) : diffMs;
    const days = Math.ceil(clampedDiff / (1000 * 60 * 60 * 24));

    return inclusive ? days + 1 : days;
}
export function calculateTimeBoundaries(
    startDate: string,
    endDate: string,
    backtestTime?: string
): TimeBoundaries {
    const startBoundary = new Date(startDate);
    startBoundary.setUTCHours(14, 30, 0, 0);
    const endBoundary = new Date(endDate);
    endBoundary.setUTCHours(21, 0, 0, 0);
    const startBoundaryIso = startBoundary.toISOString();
    const endBoundaryIso = endBoundary.toISOString();
    const desiredStart = backtestTime
        ? new Date(backtestTime).toISOString()
        : startBoundaryIso;

    return {
        startBoundaryIso,
        endBoundaryIso,
        desiredStart,
    };
}
export function formatExecutionTime(diffMs: number): string {
    const runningHours = Math.floor(diffMs / 3600000);
    const runningMinutes = Math.floor((diffMs % 3600000) / 60000);
    const runningSeconds = Math.floor((diffMs % 60000) / 1000);
    return `${String(runningHours).padStart(2, "0")}:${String(
        runningMinutes
    ).padStart(2, "0")}:${String(runningSeconds).padStart(2, "0")}`;
}
