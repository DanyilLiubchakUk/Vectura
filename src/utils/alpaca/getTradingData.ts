import Alpaca from "@/utils/alpaca";

export type Tbar = {
    ClosePrice: number;
    HighPrice: number;
    LowPrice: number;
    TradeCount: number;
    OpenPrice: number;
    Timestamp: string;
    Volume: number;
    VWAP: number;
};
export type TaccountInfo = {
    id: string;
    admin_configurations: any;
    user_configurations: any;
    account_number: string;
    status: string;
    crypto_status: string;
    options_approved_level: number;
    options_trading_level: number;
    currency: string;
    buying_power: string;
    regt_buying_power: string;
    daytrading_buying_power: string;
    effective_buying_power: string;
    non_marginable_buying_power: string;
    options_buying_power: string;
    bod_dtbp: string;
    cash: string;
    accrued_fees: string;
    portfolio_value: string;
    pattern_day_trader: boolean;
    trading_blocked: boolean;
    transfers_blocked: boolean;
    account_blocked: boolean;
    created_at: string;
    trade_suspended_by_user: boolean;
    multiplier: string;
    shorting_enabled: boolean;
    equity: string;
    last_equity: string;
    long_market_value: string;
    short_market_value: string;
    position_market_value: string;
    initial_margin: string;
    maintenance_margin: string;
    last_maintenance_margin: string;
    sma: string;
    daytrade_count: number;
    balance_asof: string;
    crypto_tier: number;
    intraday_adjustments: string;
    pending_reg_taf_fees: string;
};
export type Torder = {
    id: string;
    client_order_id: string;
    created_at: string;
    updated_at: string;
    submitted_at: string;
    filled_at: string;
    expired_at: any;
    canceled_at: any;
    failed_at: any;
    replaced_at: any;
    replaced_by: any;
    replaces: any;
    asset_id: string;
    symbol: string;
    asset_class: string;
    notional: any;
    qty: string;
    filled_qty: string;
    filled_avg_price: string;
    order_class: string;
    order_type: string;
    type: string;
    side: string;
    position_intent: string;
    time_in_force: string;
    limit_price: any;
    stop_price: any;
    status: string;
    extended_hours: boolean;
    legs: any;
    trail_percent: any;
    trail_price: any;
    hwm: any;
    subtag: any;
    source: string;
    expires_at: string;
};
export type Tclock = {
    is_open: boolean;
    next_close: string;
    next_open: string;
    timestamp: string;
};

export async function getBars(
    symbol: string,
    start: string,
    end: string,
    timeframe: string,
    limit: number
): Promise<{ data?: Tbar[]; success: boolean; error?: any }> {
    try {
        const requestBody = {
            start, // "2022-04-01"
            end, // "2022-04-02"
            timeframe, // Alpaca.newTimeframe(30, Alpaca.timeframeUnit.MIN)
            limit, // 2
        };
        const bars = await Alpaca.getBarsV2(symbol, requestBody);
        const got: Tbar[] = [];
        for await (let b of bars) {
            got.push(b);
        }

        return { data: got, success: true };
    } catch (error) {
        return { success: false, error };
    }
}

export async function getAccountInfo(): Promise<{
    data?: TaccountInfo;
    success: boolean;
    error?: any;
}> {
    try {
        const account: TaccountInfo = await Alpaca.getAccount();

        return { data: account, success: true };
    } catch (error) {
        return { success: false, error };
    }
}

export async function getOrderStatusById(orderId: string): Promise<{
    data?: { order: Torder; status: string; successStatus: boolean };
    success: boolean;
    error?: any;
}> {
    try {
        const order: Torder = await Alpaca.getOrder(orderId);
        const successStatus = order.status === "filled";

        return {
            data: { order, status: order.status, successStatus },
            success: true,
        };
    } catch (error) {
        return { success: false, error };
    }
}

export async function getOpenOrders(): Promise<{
    data?: Torder[];
    success: boolean;
    error?: any;
}> {
    try {
        const orders: Torder[] = await Alpaca.getOrders({
            status: "open",
            direction: "desc",
            limit: undefined,
            after: undefined,
            nested: undefined,
            symbols: undefined,
            until: undefined,
        });

        return { data: orders, success: true };
    } catch (error) {
        return { success: false, error };
    }
}

export async function getMarketClock(): Promise<{
    data?: Tclock;
    success: boolean;
    error?: any;
}> {
    try {
        const clock: Tclock = await Alpaca.getClock();

        return { data: clock, success: true };
    } catch (error) {
        return { success: false, error };
    }
}
