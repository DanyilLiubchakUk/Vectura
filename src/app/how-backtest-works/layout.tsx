import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "How the Backtest Works",
    description: "Understand how to use the Vectura backtesting engine and interpret its parameters and results.",
    alternates: {
        canonical: '/how-backtest-works',
    },
    openGraph: {
        title: "How the Backtest Works",
        description: 'Understand how to use the Vectura backtesting engine and interpret its parameters and results.',
        url: '/how-backtest-works',
        siteName: "Vectura",
        locale: 'en_US',
        type: 'website',
        images: [
            {
                url: '/images/social/educational-image.png',
                width: 1200,
                height: 630,
                alt: 'How Backtesting Works',
                type: 'image/png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'How the Backtest Works',
        description: 'Understand how to use the Vectura backtesting engine and interpret its parameters and results.',
        images: ['/images/social/educational-image.png'],
    },
};

export default function HowBacktestWorksLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
