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
    title: "Vectura",
    description: "Trading strategy backtesting platform",
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
