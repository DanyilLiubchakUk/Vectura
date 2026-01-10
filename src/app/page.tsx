"use client";

import {
    ArrowRight,
    Database,
    Rocket,
    Code,
    Cloud,
    HardDrive,
} from "lucide-react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { CheckListItem } from "@/components/ui/check-list-item";
import { AppHeader } from "@/components/layout/app-header";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
    return (
        <div className="min-h-screen flex flex-col">
            <AppHeader title="Trading Strategy Platform" />

            <main className="flex-1 container mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-12">
                <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 lg:space-y-10">
                    {/* Hero Section */}
                    <div className="text-center space-y-3 md:space-y-4">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
                            Vectura
                        </h1>
                        <p className="text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto">
                            Backtesting platform for trading strategies using
                            real market data
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center pt-1 md:pt-2">
                            <Link
                                href="/backtest"
                                className="[&:hover_button]:bg-muted-foreground [&:hover_button]:text-accent"
                            >
                                <Button size="lg" className="text-lg px-8">
                                    Start Backtesting
                                    <ArrowRight className="ml-2 h-5 w-5 " />
                                </Button>
                            </Link>
                            <Link
                                href="/ranges"
                                className="[&:hover_button]:bg-muted [&:hover_button]:text-accent-foreground"
                            >
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="text-lg px-8"
                                >
                                    Manage Ranges
                                    <Database className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* What is Vectura */}
                    <section className="space-y-3 md:space-y-4">
                        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold">
                            What is Vectura?
                        </h2>
                        <Card className="border-2">
                            <CardContent className="pt-4 md:pt-6 space-y-3 md:space-y-4">
                                <p className="text-base text-muted-foreground">
                                    Vectura helps you test trading ideas using
                                    real historical market data, so you can see
                                    how your strategy would have performed in
                                    the past before risking real money. It’s a
                                    simple way to understand what works, what
                                    doesn’t, and why.
                                </p>
                                <Link
                                    href="/about"
                                    className="[&:hover_button]:underline [&:hover_button]:bg-muted [&:hover_button]:text-accent-foreground"
                                >
                                    <Button
                                        variant="outline"
                                        className="w-full sm:w-auto"
                                    >
                                        Learn more about the app
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    </section>

                    {/* Execution Modes */}
                    <section className="space-y-3 md:space-y-4">
                        <div className="text-center space-y-1.5 md:space-y-2">
                            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold">
                                Execution Modes
                            </h2>
                            <p className="text-sm md:text-base text-muted-foreground">
                                Choose how to run your backtest
                            </p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                            <Card className="border-2">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <HardDrive className="h-5 w-5 text-primary" />
                                            <CardTitle>Local Mode</CardTitle>
                                        </div>
                                    </div>
                                    <CardDescription>
                                        Runs on your computer
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2 md:space-y-3">
                                    <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
                                        <CheckListItem variant="success">
                                            Data stays on your device
                                        </CheckListItem>
                                        <CheckListItem variant="success">
                                            Uses your computer's power
                                        </CheckListItem>
                                        <CheckListItem variant="success">
                                            Real-time progress updates
                                        </CheckListItem>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card className="border-2">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Cloud className="h-5 w-5 text-primary" />
                                            <CardTitle>Cloud Mode</CardTitle>
                                        </div>
                                    </div>
                                    <CardDescription>
                                        Runs on AWS Lambda
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2 md:space-y-3">
                                    <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-muted-foreground">
                                        <CheckListItem variant="success">
                                            Always fast, no matter your device
                                        </CheckListItem>
                                        <CheckListItem variant="success">
                                            Doesn't use your computer
                                        </CheckListItem>
                                        <CheckListItem variant="success">
                                            Real-time progress updates
                                        </CheckListItem>
                                        <CheckListItem variant="success">
                                            Better for slower devices
                                        </CheckListItem>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    <Separator />

                    {/* Quick Navigation */}
                    <section className="space-y-3 md:space-y-4">
                        <div className="text-center space-y-1.5 md:space-y-2">
                            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold">
                                Learn More
                            </h2>
                            <p className="text-sm md:text-base text-muted-foreground">
                                Explore guides and documentation
                            </p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                            <Card className="border-2 md:col-span-2">
                                <CardHeader className="flex items-center gap-3">
                                    <Code className="h-5 w-5 text-primary" />
                                    <CardTitle>
                                        How the Backtest Works
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 md:space-y-4">
                                    <p className="text-xs md:text-sm text-muted-foreground">
                                        Learn how to configure parameters,
                                        choose execution modes, understand the
                                        algorithm, and interpret results.
                                        Everything you need to know about using
                                        and understanding the backtest.
                                    </p>
                                    <Link
                                        href="/how-backtest-works"
                                        className="[&:hover_button]:underline [&:hover_button]:bg-muted [&:hover_button]:text-accent-foreground"
                                    >
                                        <Button
                                            variant="outline"
                                            className="w-full sm:w-auto"
                                        >
                                            Read guide
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>

                            <Card className="border-2 md:col-span-2">
                                <CardHeader className="flex items-center gap-3">
                                    <Rocket className="h-5 w-5 text-primary" />
                                    <CardTitle>Development Journey</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 md:space-y-4">
                                    <p className="text-xs md:text-sm text-muted-foreground">
                                        Read about the development process: from
                                        CSV files to Zustand, finding free APIs,
                                        implementing PDT rules, and optimizing
                                        performance from 7 hours to fast
                                        execution.
                                    </p>
                                    <Link
                                        href="/development-journey"
                                        className="[&:hover_button]:underline [&:hover_button]:bg-muted [&:hover_button]:text-accent-foreground"
                                    >
                                        <Button
                                            variant="outline"
                                            className="w-full sm:w-auto"
                                        >
                                            Read journey
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        </div>
                    </section>

                    <Separator />

                    {/* Quick Start */}
                    <section className="space-y-3 md:space-y-4">
                        <div className="text-center space-y-1.5 md:space-y-2">
                            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold">
                                Quick Start
                            </h2>
                            <p className="text-sm md:text-base text-muted-foreground">
                                Get started in 5 simple steps
                            </p>
                        </div>
                        <Card className="border-2">
                            <CardContent className="pt-4 md:pt-6">
                                <ol className="space-y-3 md:space-y-4 text-sm md:text-base text-muted-foreground">
                                    <li className="flex gap-3">
                                        <span className="font-semibold text-foreground min-w-[28px]">
                                            1.
                                        </span>
                                        <span>
                                            Go to{" "}
                                            <Link
                                                href="/backtest"
                                                className="text-primary hover:underline font-medium"
                                            >
                                                Backtest
                                            </Link>{" "}
                                            page
                                        </span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="font-semibold text-foreground min-w-[28px]">
                                            2.
                                        </span>
                                        <span>
                                            Fill in stock symbol, date range,
                                            and starting capital
                                        </span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="font-semibold text-foreground min-w-[28px]">
                                            3.
                                        </span>
                                        <span>
                                            Choose execution mode (Local or
                                            Cloud)
                                        </span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="font-semibold text-foreground min-w-[28px]">
                                            4.
                                        </span>
                                        <span>
                                            Click "Run Backtest" and watch the
                                            progress
                                        </span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="font-semibold text-foreground min-w-[28px]">
                                            5.
                                        </span>
                                        <span>
                                            Review results and adjust parameters
                                            as needed
                                        </span>
                                    </li>
                                </ol>
                            </CardContent>
                        </Card>
                    </section>
                </div>
            </main>

            <footer className="border-t">
                <div className="container mx-auto px-4 md:px-6 py-6 md:py-8">
                    <div className="max-w-5xl mx-auto">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-6">
                            <div className="text-center md:text-left">
                                <p className="text-sm font-medium text-foreground mb-1">
                                    Vectura
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Trading Strategy Platform
                                </p>
                            </div>
                            <div className="text-center md:text-right">
                                <p className="text-xs text-muted-foreground">
                                    Backtest results are simulated and not
                                    guaranteed.
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Past performance does not guarantee future
                                    results.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
