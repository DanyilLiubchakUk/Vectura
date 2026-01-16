import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "How the Backtest Works",
    description: "Understand how to use the Vectura backtesting engine and interpret its parameters and results.",
    alternates: {
        canonical: '/how-backtest-works',
    },
};

export default function HowBacktestWorksLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
