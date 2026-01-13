export const GRID_TRADE_DEFAULT_CONFIG: Igrid = {
    capitalPct: 60, // Percentage of capital to use per buy (N %)
    buyBelowPct: 2, // Percentage below current price to set NextBuyOn (N %)
    sellAbovePct: 18, // Percentage above buy price to set SellOn (N %)
    buyAfterSellPct: 25, // Percentage higher to buy more after each sell (N %)
    cashFloor: 200, // Dollar amount cash floor
    orderGapPct: 1.5, // Percent gap to join orders (N %), use -1 to disable filtering
} as const;

export interface Igrid {
    capitalPct: number;
    buyBelowPct: number;
    sellAbovePct: number;
    buyAfterSellPct: number;
    cashFloor: number;
    orderGapPct: number;
}
