import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { BacktestForm } from "@/components/backtest";
import { Logo } from "@/components/logo";

export default function BacktestPage() {
    return (
        <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
                <div className="container flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
                    <div className="flex items-center gap-2">
                        <Logo className="h-5 w-auto" />
                        <h1 className="text-lg font-semibold">Backtest</h1>
                    </div>
                    <ThemeToggle />
                </div>
            </header>

            <main className="container mx-auto flex-1 max-w-5xl px-4 py-8 md:px-6 lg:px-8">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <h2 className="text-3xl font-bold tracking-tight">
                            Trading Strategy Backtest
                        </h2>
                        <p className="text-muted-foreground">
                            Configure your backtest parameters to analyze
                            trading strategy performance using historical market
                            data.
                        </p>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Backtest Configuration</CardTitle>
                            <CardDescription>
                                Enter your parameters to simulate trading
                                performance and find optimal profit
                                opportunities
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <BacktestForm />
                        </CardContent>
                    </Card>
                </div>
            </main>

            <footer className="border-t py-6 md:py-8">
                <p className="container px-4 text-sm text-muted-foreground md:px-6 lg:px-8">
                    Backtest results are simulated and not guaranteed
                </p>
            </footer>
        </div>
    );
}
