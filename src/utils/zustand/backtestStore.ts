import { createStore } from "zustand/vanilla";

export interface IbacktestSession {
    stock: string;
    start: string;
    end: string;
    initialCapital: number;
}
export interface IbacktestCapital {
    cash: number;
    max: number;
    equity: number;
}
export interface IbacktestActions {
    toBuy: IorderAction[];
    toSell: IsellAction[];
}
export interface Itrade {
    id: string;
    timeStamp: string;
    tradeType: "sell" | "buy";
    shares: number;
    price: number;
    closesTradeId?: string;
}
export interface IpdtStatus {
    date: string;
    roundTrips: number;
}
export interface IopenTrade {
    price: number;
    shares: number;
    timeStamp: string;
    id: string;
}
export interface IorderAction {
    id: string;
    atPrice: number;
    belowOrHigher: "below" | "higher";
}
export interface IsellAction extends IorderAction {
    shares: number;
    tradeId: string;
}

export interface IbacktestStorage {
    session: IbacktestSession | null;
    capital: IbacktestCapital | null;
    actions: IbacktestActions;
    tradeHistory: Itrade[];
    pdtStatus: IpdtStatus[];
    openTrades: IopenTrade[];
}

export const backtestStore = createStore<IbacktestStorage>(() => ({
    session: null,
    capital: null,
    actions: {
        toBuy: [],
        toSell: [],
    },
    tradeHistory: [],
    pdtStatus: [],
    openTrades: [],
}));
