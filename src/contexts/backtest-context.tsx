"use client";

import { createContext, useContext, ReactNode } from "react";
import { useBacktest, type UseBacktestReturn } from "@/hooks/use-backtest";

const BacktestContext = createContext<UseBacktestReturn | undefined>(undefined);

export function BacktestProvider({ children }: { children: ReactNode }) {
    const backtestState = useBacktest();
    return (
        <BacktestContext.Provider value={backtestState}>
            {children}
        </BacktestContext.Provider>
    );
}

export function useBacktestContext(): UseBacktestReturn {
    const context = useContext(BacktestContext);
    if (!context) {
        throw new Error(
            "useBacktestContext must be used within BacktestProvider"
        );
    }
    return context;
}
