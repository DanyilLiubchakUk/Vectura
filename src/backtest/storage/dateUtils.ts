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
