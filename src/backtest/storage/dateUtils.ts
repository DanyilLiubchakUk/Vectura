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
    const dateA = new Date(a + "T00:00:00Z").getTime();
    const dateB = new Date(b + "T00:00:00Z").getTime();
    return dateA < dateB;
}

export function isLaterDay(a: string, b: string): boolean {
    const dateA = new Date(a + "T00:00:00Z").getTime();
    const dateB = new Date(b + "T00:00:00Z").getTime();
    return dateA > dateB;
}

export function getTodayMinusDays(days: number): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const day = now.getUTCDate();

    const date = new Date(Date.UTC(year, month, day));
    date.setUTCDate(date.getUTCDate() - days);
    return formatDay(date);
}

export function isDayBeforeOrEqual(a: string, b: string): boolean {
    const dateA = new Date(a + "T00:00:00Z").getTime();
    const dateB = new Date(b + "T00:00:00Z").getTime();
    return dateA <= dateB;
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
    const parseAsUTC = (timestamp: string): number => {
        if (timestamp.includes("T")) {
            if (timestamp.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(timestamp)) {
                return new Date(timestamp).getTime();
            }
            return new Date(timestamp + "Z").getTime();
        }
        return new Date(timestamp + "T00:00:00Z").getTime();
    };

    const start = parseAsUTC(startTimestamp);
    const end = parseAsUTC(endTimestamp);

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
    const startBoundary = new Date(startDate + "T00:00:00Z");
    startBoundary.setUTCHours(14, 30, 0, 0);
    const endBoundary = new Date(endDate + "T00:00:00Z");
    endBoundary.setUTCHours(21, 0, 0, 0);
    const startBoundaryIso = startBoundary.toISOString();
    const endBoundaryIso = endBoundary.toISOString();
    const desiredStart = backtestTime
        ? (() => {
            if (backtestTime.includes("T")) {
                if (backtestTime.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(backtestTime)) {
                    return new Date(backtestTime).toISOString();
                }
                return new Date(backtestTime + "Z").toISOString();
            }
            return new Date(backtestTime + "T00:00:00Z").toISOString();
        })()
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
