import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Vectura Backtest",
    description: "Configure your backtest parameters to analyze trading strategy performance using historical market data and find optimal profit opportunities.",
    alternates: {
        canonical: '/backtest',
    },
    openGraph: {
        title: "Vectura Backtest",
        description: "Configure your backtest parameters to analyze trading strategy performance using historical market data and find optimal profit opportunities.",
        url: '/backtest',
        siteName: "Vectura",
        locale: 'en_US',
        type: 'website',
        images: [
            {
                url: '/images/social/backtest-feature-image.png',
                width: 1200,
                height: 630,
                alt: 'Vectura Backtest',
                type: 'image/png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Vectura Backtest',
        description: "Configure your backtest parameters to analyze trading strategy performance using historical market data and find optimal profit opportunities.",
        images: ['/images/social/backtest-feature-image.png'],
    },
};

export default function BacktestLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
