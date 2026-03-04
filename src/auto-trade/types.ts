export interface SplitInfoRecord {
  effective_date: string;
  split_factor: number;
}

export interface TradeHistoryRecord {
  id: string;
  timestamp: string | null;
  trade_type: string | null;
  shares: number | null;
  price: number | null;
  close_trade_id: string | null;
}

export interface ToBuyRecord {
  id: string;
  at_price: number | null;
  below_or_higher: string | null;
}

export interface ToSellRecord extends ToBuyRecord {
  shares: number | null;
  trade_id: string;
}

export interface OpenTradeRecord {
  id: string;
  timestamp: string | null;
  price: number | null;
  shares: number | null;
}
