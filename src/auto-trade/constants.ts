export const UPDATE_AFTER_NEW_SPLIT_BATCH_SIZE = 250;

export const PDT_EQUITY_THRESHOLD = 25000;
export const MAX_PDT_WINDOW = 5;

export const TRADE_SYMBOL = "TQQQ";
export const TRADING_ALGORITHM = "GridVersion0";

export const GRID_TRADE_V0_DEFAULT_CONFIG = {
    Xc: 60, // Percentage of capital to use per buy (N %)
    Xb: 2, // Percentage below current price to set NextBuyOn (N %)
    Xs: 18, // Percentage above buy price to set SellOn (N %)
    Xl: 200, // Dollar amount cash floor
} as const;
