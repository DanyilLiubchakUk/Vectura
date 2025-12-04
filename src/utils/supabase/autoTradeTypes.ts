export interface SSplitInfo {
    effective_date: string;
    split_factor: number;
}
export interface STradeHistory {
    id: string;
    timestamp: string | null;
    trade_type: string | null;
    shares: number | null;
    price: number | null;
    close_trade_id: string | null;
}
export interface SToBuy {
    id: string;
    at_price: number | null;
    below_or_higher: string | null;
}
export interface SToSell extends SToBuy {
    shares: number | null;
    trade_id: string;
}
export interface SOpenTrade {
    id: string;
    timestamp: string | null;
    price: number | null;
    shares: number | null;
}
