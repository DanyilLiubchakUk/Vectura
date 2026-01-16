import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Vectura Backtest",
    description: "Configure your backtest parameters to analyze trading strategy performance using historical market data and find optimal profit opportunities.",
    alternates: {
        canonical: '/backtest',
    },
};

export default function BacktestLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
