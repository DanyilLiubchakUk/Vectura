"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BacktestRunExecutor } from "@/components/backtest/backtest-run-executor";
import { BacktestRunsList } from "@/components/backtest/backtest-runs-list";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";
import BacktestForm from "@/components/backtest/form";
import { Logo } from "@/components/logo";
import { useState } from "react";

function BacktestPageContent() {
    const [activeTab, setActiveTab] = useState("form");

    const handleRunStarted = () => {
        // On mobile, switch to progress tab when run starts
        if (window.innerWidth < 768) {
            setActiveTab("progress");
        }
    };

    return (
        <div className="grid grid-rows-[auto_1fr_auto] min-h-screen md:max-h-screen">
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
                <div className="flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
                    <div className="flex items-center gap-2">
                        <Logo className="h-5 w-auto" />
                        <h1 className="text-lg font-semibold">Backtest</h1>
                    </div>
                    <ThemeToggle />
                </div>
            </header>

            <main className="overflow-hidden">
                {/* Desktop: Resizable Panels */}
                <div className="hidden md:flex h-full">
                    <ResizablePanelGroup
                        orientation="horizontal"
                        className="h-full"
                    >
                        <ResizablePanel defaultSize={50} minSize={400}>
                            <ScrollArea className="h-full p-4 md:p-6 lg:p-8">
                                <div className="space-y-6 mx-auto">
                                    <div className="space-y-2">
                                        <h2 className="text-3xl font-bold tracking-tight">
                                            Trading Strategy Backtest
                                        </h2>
                                        <p className="text-muted-foreground">
                                            Configure your backtest parameters
                                            to analyze trading strategy
                                            performance using historical market
                                            data.
                                        </p>
                                    </div>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle>
                                                Backtest Configuration
                                            </CardTitle>
                                            <CardDescription>
                                                Enter your parameters to
                                                simulate trading performance and
                                                find optimal profit
                                                opportunities
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <BacktestForm
                                                onRunStarted={handleRunStarted}
                                            />
                                        </CardContent>
                                    </Card>
                                </div>
                            </ScrollArea>
                        </ResizablePanel>
                        <ResizableHandle withHandle />
                        <ResizablePanel defaultSize={50} minSize={400}>
                            <div className="h-full flex flex-col p-4 md:p-6 lg:p-8">
                                <BacktestRunsList />
                            </div>
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </div>

                {/* Mobile: Tabs */}
                <div className="md:hidden flex flex-col h-full">
                    <Tabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                        className="flex-1 flex flex-col overflow-hidden"
                    >
                        <div className="px-4 pt-4">
                            <div className="space-y-2 mb-4">
                                <h2 className="text-2xl font-bold tracking-tight">
                                    Trading Strategy Backtest
                                </h2>
                                <p className="text-muted-foreground text-sm">
                                    Configure your backtest parameters to
                                    analyze trading strategy performance.
                                </p>
                            </div>
                            <TabsList className="w-full">
                                <TabsTrigger value="form" className="flex-1">
                                    Form
                                </TabsTrigger>
                                <TabsTrigger
                                    value="progress"
                                    className="flex-1"
                                >
                                    Results
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        <TabsContent
                            value="form"
                            className="flex-1 overflow-y-auto px-4 pb-4 mt-4"
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Backtest Configuration
                                    </CardTitle>
                                    <CardDescription>
                                        Enter your parameters to simulate
                                        trading performance
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <BacktestForm
                                        onRunStarted={handleRunStarted}
                                    />
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent
                            value="progress"
                            className="flex-1 flex flex-col overflow-hidden mt-4"
                        >
                            <BacktestRunsList onRunAdded={handleRunStarted} />
                        </TabsContent>
                    </Tabs>
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

export default function BacktestPage() {
    return (
        <>
            <BacktestRunExecutor />
            <BacktestPageContent />
        </>
    );
}
