import { createStore } from "zustand/vanilla";

export interface IautoTradeSession {
    start: string;
    end: string;
}
export interface IautoTradeCapital {
    cash: number;
    cashMax: number;
    equityMax: number;
    equity: number;
}
export interface IautoTradeActions {
    toBuy: IorderAction[];
    toSell: IsellAction[];
}
export interface IpdtDay {
    date: string;
    roundTrips: number;
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
export interface IopenTrade {
    id: string;
    timeStamp: string;
    price: number;
    shares: number;
}
export interface IautoTradeStorage {
    session: IautoTradeSession;
    capital: IautoTradeCapital;
    actions: IautoTradeActions;
    pdtCount: number;
    pdtDays: IpdtDay[];
}

export const autoTradeStorage = createStore<IautoTradeStorage>(() => ({
    session: {
        end: "",
        start: "",
    },
    capital: {
        cashMax: 0,
        cash: 0,
        equityMax: 0,
        equity: 0,
    },
    actions: {
        toBuy: [],
        toSell: [],
    },
    pdtCount: 0,
    pdtDays: [],
}));
