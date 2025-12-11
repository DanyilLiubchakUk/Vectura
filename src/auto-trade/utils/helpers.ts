export function roundDown(num: number, digits: number = 9): number {
    const base = 10 ** digits;
    return Math.floor(num * base) / base;
}

export function generateOrderId(now: string): string {
    return `${now.slice(0, 16)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function formatDay(date: Date): string {
    return date.toISOString().split("T")[0];
}

export function dateToStartOfDayISO(dateStr: string): string {
    const date = new Date(dateStr + "T00:00:00.000Z");
    return date.toISOString();
}

export function dateToEndOfDayISO(dateStr: string): string {
    const date = new Date(dateStr + "T23:59:59.999Z");
    return date.toISOString();
}
