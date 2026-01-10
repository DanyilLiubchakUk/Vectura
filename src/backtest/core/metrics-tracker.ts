import { roundDown } from "../utils/helpers";

/**
 * Raw data accumulated during backtest execution.
 * All final calculations are performed in result-calculator.ts
 */
export interface MetricsRawData {
    // Strategy tracking
    investedCapitalRatioSum: number;
    peakEquity: number;

    // Drawdown tracking
    currentDrawdownStart: string | null;
    maxDrawdownPct: number;
    maxDrawdownDollar: number;
    drawdownPeriods: Array<{
        startTimestamp: string;
        endTimestamp: string;
    }>;

    // Trade counting
    tradeCount: number;

    // Monthly snapshots (YYYY-MM -> equity value)
    monthlyEquity: Map<string, number>;

    // Buy & Hold
    buyHoldTotalShares: number;
    buyHoldCash: number;
}

export class MetricsTracker {
    // Strategy tracking
    private investedCapitalRatioSum: number = 0;
    private peakEquity: number = 0;

    // Drawdown tracking
    private currentDrawdownStart: string | null = null;
    private maxDrawdownPct: number = 0;
    private maxDrawdownDollar: number = 0;
    private drawdownPeriods: Array<{
        startTimestamp: string;
        endTimestamp: string;
    }> = [];

    // Trade counting
    private tradeCount: number = 0;

    // Monthly snapshots
    private monthlyEquity: Map<string, number> = new Map();

    // Buy & Hold
    private buyHoldTotalShares: number = 0;
    private buyHoldCash: number = 0;
    private cashFloor: number = 0;

    private endDate: string;

    constructor(
        startDate: string,
        endDate: string,
        initialCapital: number,
        cashFloor: number
    ) {
        this.endDate = endDate;
        this.cashFloor = cashFloor;
        this.peakEquity = initialCapital;
        this.buyHoldCash = initialCapital;

        // Initialize first month snapshot
        const startMonthKey = this.getMonthKey(startDate);
        // the first month starts equity as only initialCapital
        this.monthlyEquity.set(startMonthKey, initialCapital);
    }

    /**
     * Get month key in YYYY-MM format from timestamp
     */
    private getMonthKey(timestamp: string): string {
        const date = new Date(timestamp);
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        return `${year}-${month}`;
    }

    /**
     * Record equity update
     */
    recordEquityUpdate(
        timestamp: string,
        equity: number,
        cash: number
    ): void {
        // Accumulate ratio for average invested capital calculation
        // Track sum of (investedCapital/equity) ratios to calculate average correctly
        if (equity > 0) {
            const investedCapital = equity - cash;

            const ratio = investedCapital / equity;
            this.investedCapitalRatioSum += ratio;
        }

        if (equity > this.peakEquity) {
            // If we were in a drawdown and recovered, close the drawdown period
            if (this.currentDrawdownStart !== null) {
                this.drawdownPeriods.push({
                    startTimestamp: this.currentDrawdownStart,
                    endTimestamp: timestamp,
                });
                this.currentDrawdownStart = null;
            }

            this.peakEquity = equity;
        } else {
            // Calculate current drawdown
            const drawdownDollar = this.peakEquity - equity;
            const drawdownPct =
                this.peakEquity > 0 ? (drawdownDollar / this.peakEquity) * 100 : 0;

            // Update maximum drawdown
            if (drawdownPct > this.maxDrawdownPct) {
                this.maxDrawdownPct = drawdownPct;
            }
            if (drawdownDollar > this.maxDrawdownDollar) {
                this.maxDrawdownDollar = drawdownDollar;
            }

            // Start or update drawdown period
            if (this.currentDrawdownStart === null) {
                this.currentDrawdownStart = timestamp;
            }
        }

        // Sets months equity to the very last day available
        this.monthlyEquity.set(this.getMonthKey(timestamp), equity);
    }

    /**
     * Record trade execution
     */
    recordTrade(): void {
        this.tradeCount++;
    }

    /**
     * Process Buy & Hold contribution - buy immediately at current price
     */
    processBuyHoldContribution(timestamp: string, amount: number, price: number): void {
        if (price <= 0 || !isFinite(price) || !isFinite(amount) || amount <= 0) {
            // Invalid price or amount, keep as cash
            this.buyHoldCash += amount;
            return;
        }

        // Add contribution to cash and total invested
        this.buyHoldCash += amount;

        // Calculate available cash for investment (leave cash floor)
        const availableCash = Math.max(0, this.buyHoldCash - this.cashFloor);

        if (availableCash > 0 && price > 0) {
            // Calculate shares to buy
            const shares = roundDown(availableCash / price);
            const cost = roundDown(shares * price);

            if (shares > 0 && cost > 0) {
                // Update total shares and cash
                this.buyHoldTotalShares += shares;
                this.buyHoldCash -= cost;
            }
        }
    }

    /**
     * Initialize Buy & Hold with initial capital
     * Called at start of backtest with first available price
     */
    initializeBuyHold(initialPrice: number): void {
        if (initialPrice <= 0 || !isFinite(initialPrice)) {
            return;
        }

        // Calculate available cash for investment (leave cash floor)
        const availableCash = Math.max(0, this.buyHoldCash - this.cashFloor);

        if (availableCash > 0) {
            const shares = roundDown(availableCash / initialPrice)
            const cost = roundDown(shares * initialPrice);

            if (shares > 0 && cost > 0) {
                this.buyHoldTotalShares = shares;
                this.buyHoldCash -= cost;
            }
        }
    }

    /**
     * Get raw accumulated data
     */
    getRawData(): MetricsRawData {
        // Close any open drawdown period
        const finalDrawdownPeriods = [...this.drawdownPeriods];
        if (this.currentDrawdownStart !== null) {
            finalDrawdownPeriods.push({
                startTimestamp: this.currentDrawdownStart,
                endTimestamp: this.endDate,
            });
        }

        return {
            investedCapitalRatioSum: this.investedCapitalRatioSum,
            peakEquity: this.peakEquity,
            currentDrawdownStart: this.currentDrawdownStart,
            maxDrawdownPct: this.maxDrawdownPct,
            maxDrawdownDollar: this.maxDrawdownDollar,
            drawdownPeriods: finalDrawdownPeriods,
            tradeCount: this.tradeCount,
            monthlyEquity: new Map(this.monthlyEquity),
            buyHoldTotalShares: this.buyHoldTotalShares,
            buyHoldCash: this.buyHoldCash,
        };
    }
}
