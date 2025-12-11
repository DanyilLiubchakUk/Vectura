export function roundDown(num: number, digits: number = 4): number {
    const base = 10 ** digits;
    return Math.floor(num * base) / base;
}

export function generateOrderId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function calculateEquity(
    cash: number,
    openTrades: Array<{ shares: number }>,
    currentPrice: number
): number {
    const positionsValue = openTrades.reduce(
        (sum, trade) => sum + currentPrice * trade.shares,
        0
    );
    return cash + positionsValue;
}
