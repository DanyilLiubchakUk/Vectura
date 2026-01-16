import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import Script from "next/script";
import "./globals.css";

const inter = Inter({
    subsets: ["latin"],
    variable: "--font-sans",
    display: "swap",
});

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!),
    title: "Vectura",
    description: "Trading strategy backtesting platform",
    keywords: [
        "trading",
        "backtest",
        "strategy",
        "algorithmic trading",
        "finance",
        "stock market",
        "quantitative trading",
        "quant",
        "backtesting platform",
        "strategy tester",
        "automated trading",
        "trading bot",
        "historical data",
        "financial data",
        "equity curve",
        "risk management",
        "performance metrics",
        "trading software",
        "backtest strategies",
        "trading simulator",
        "investment strategies",
        "Alpaca",
        "easy backtesting",
    ],
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
    alternates: {
        canonical: '/',
    },
    appleWebApp: {
        title: 'Vectura',
    },
    verification: {
        google: "dMPN-Z0Fn7EY5GBdO1gUZ-zhPG-ivAWogBx5n-zIIuU",
    },
    openGraph: {
        title: "Vectura - Trading Strategy Backtesting Platform",
        description: "Simulate and analyze your trading strategies with historical market data.",
        url: '/',
        siteName: "Vectura",
        locale: 'en_US',
        type: 'website',
        images: [
            {
                url: '/images/social/default-og-image.png',
                width: 1200,
                height: 630,
                alt: "Vectura - Trading Strategy Backtesting Platform",
                type: 'image/png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        site: '@vectura_app',
        creator: '@vectura_app',
        title: "Vectura - Trading Strategy Backtesting Platform",
        description: "Simulate and analyze your trading strategies with historical market data.",
        images: ['/images/social/default-og-image.png'],

    },
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
    const jsonLd = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebSite",
                "@id": `${siteUrl}/#website`,
                name: "Vectura",
                url: siteUrl,
                description: "Trading strategy backtesting platform",
                inLanguage: "en-US",
            },
            {
                "@type": "Organization",
                "@id": `${siteUrl}/#organization`,
                name: "Vectura",
                url: siteUrl,
                logo: `${siteUrl}/icon.svg`,
            },
            {
                "@type": "SoftwareApplication",
                "@id": `${siteUrl}/#software-application`,
                name: "Vectura",
                operatingSystem: "Any",
                applicationCategory: "FinanceApplication",
                offers: {
                    "@type": "Offer",
                    price: "0",
                    priceCurrency: "USD",
                },
            },
        ],
    };

    return (
        <html
            lang="en"
            className={cn("h-full", inter.variable)}
            suppressHydrationWarning
        >
            <body
                className={cn(
                    "min-h-full bg-background text-foreground antialiased"
                )}
            >
                <ThemeProvider defaultTheme="system" storageKey="vectura-theme">
                    {children}
                </ThemeProvider>
                <Script
                    id="json-ld"
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                    strategy="lazyOnload"
                />
            </body>
        </html>
    );
}
