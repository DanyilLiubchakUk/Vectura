import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
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
    verification: {
        google: "dMPN-Z0Fn7EY5GBdO1gUZ-zhPG-ivAWogBx5n-zIIuU",
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
            </body>
        </html>
    );
}
