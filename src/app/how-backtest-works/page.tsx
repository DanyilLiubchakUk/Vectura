"use client";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import Script from "next/script";
import { AlertTriangle, CheckCircle2, HardDrive, Cloud } from "lucide-react";
import { CheckListItem } from "@/components/ui/check-list-item";
import { PageHeader } from "@/components/layout/page-header";
import { AppHeader } from "@/components/layout/app-header";
import { PageNav } from "@/components/layout/page-nav";

const faqSchema = [
    {
        "@type": "Question",
        "name": "What is backtesting?",
        "acceptedAnswer": {
            "@type": "Answer",
            "text": "Backtesting is the process of testing a trading strategy using historical data to determine its viability. It helps traders evaluate the effectiveness of their strategies before risking real capital."
        }
    },
    {
        "@type": "Question",
        "name": "How does Vectura's backtesting engine work?",
        "acceptedAnswer": {
            "@type": "Answer",
            "text": "Vectura simulates a grid trading strategy using real historical market data, minute-by-minute prices adjusted for stock splits. It processes prices sequentially, creating buy and sell orders dynamically based on execution and predefined percentage distances."
        }
    },
    {
        "@type": "Question",
        "name": "What is the difference between Local and Cloud Mode?",
        "acceptedAnswer": {
            "@type": "Answer",
            "text": "Local Mode runs the backtest on your machine and is recommended for most users. If your local computer is too slow or cannot complete the test, you can use Cloud Mode (runs on AWS Lambda) instead."
        }
    },
    {
        "@type": "Question",
        "name": "Why should I observe behavior, not just returns, in backtesting?",
        "acceptedAnswer": {
            "@type": "Answer",
            "text": "Observing behavior (inactivity periods, drawdowns, capital utilization) provides a deeper understanding of the strategy's effectiveness and risks. Focusing solely on final returns can lead to misunderstandings and unrealistic expectations."
        }
    },
    {
        "@type": "Question",
        "name": "How reliable is the historical data used in backtests?",
        "acceptedAnswer": {
            "@type": "Answer",
            "text": "Vectura uses Alpaca API for minute-by-minute price data and AlphaVantage API for stock splits. The data is real historical market prices, not simulated or smoothed. Stock splits are automatically adjusted to ensure accurate price continuity."
        }
    },
    {
        "@type": "Question",
        "name": "What does the contribution system do?",
        "acceptedAnswer": {
            "@type": "Answer",
            "text": "The contribution system allows you to simulate dollar-cost averaging by adding cash to your account at regular intervals (e.g., $100 every 7 days). This prevents the strategy from becoming inactive during prolonged downturns and enables continued buying at discounted prices."
        }
    },
    {
        "@type": "Question",
        "name": "How should I interpret backtest results?",
        "acceptedAnswer": {
            "@type": "Answer",
            "text": "Focus on behavior patterns rather than final returns: look at how often the strategy trades, how long it stays inactive, maximum drawdowns, and capital utilization. A good strategy shows consistent activity, reasonable drawdowns, and efficient use of capital across different market conditions."
        }
    },
];

const faqPageSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqSchema.map(item => ({
        "@type": "Question",
        "name": item.name,
        "acceptedAnswer": {
            "@type": "Answer",
            "text": item.acceptedAnswer.text
        }
    }))
};

const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": "How to Use the Backtest",
    "description": "Step-by-step guide to configuring and running a trading strategy backtest on Vectura.",
    "step": [
        {
            "@type": "HowToStep",
            "name": "Configure Parameters",
            "text": "Fill in the backtest form with your strategy parameters: Stock symbol, Date range, Starting capital, Algorithm parameters, and Contribution schedule (optional)."
        },
        {
            "@type": "HowToStep",
            "name": "Choose Execution Mode",
            "text": "Local Mode runs the backtest on your machine and is recommended for most users. If your local computer is too slow or cannot complete the test, you can use Cloud Mode (runs on AWS Lambda) instead."
        },
        {
            "@type": "HowToStep",
            "name": "Watch Progress",
            "text": "Monitor real-time progress as the backtest runs, including download progress, days remaining."
        },
        {
            "@type": "HowToStep",
            "name": "Analyze Results",
            "text": "After the backtest completes, review the results to understand your strategy's behavior, inactivity periods, and drawdowns."
        }
    ]
};

export default function HowBacktestWorksPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <AppHeader title="How the Backtest Works" />

            <main className="flex-1 container mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-12">
                <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
                    <PageHeader
                        title="How the Backtest Works"
                        description="Using the backtest and understanding what the parameters mean"
                    />

                    <article className="prose prose-slate dark:prose-invert max-w-none space-y-6 md:space-y-8">
                        <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                            <p>
                                This page explains how to use the backtest and
                                how changing parameters changes behavior. This
                                is not theory. Everything described here affects
                                execution directly.
                            </p>
                        </div>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                What the Backtest Actually Simulates
                            </h2>
                            <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                                <p>
                                    The backtest runs on real historical market
                                    data, minute-by-minute prices, adjusted for
                                    stock splits, within strict date boundaries.
                                </p>
                                <p>
                                    It simulates a grid trading strategy, where
                                    buys happen on price drops, sells happen on
                                    price increases, and new orders are created
                                    dynamically based on execution. The backtest
                                    processes prices sequentially, exactly as
                                    they would appear in real time.
                                </p>
                                <p>
                                    Grid trading does not try to predict
                                    direction. Instead, it assumes price moves
                                    up and down, volatility can be harvested,
                                    and trends exist but are unpredictable. The
                                    strategy places buy and sell orders at
                                    predefined percentage distances and lets
                                    price trigger them naturally.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                How to Use the Backtest
                            </h2>

                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Step 1: Configure Parameters
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Fill in the backtest form with your
                                        strategy parameters:
                                    </p>
                                    <ul className="space-y-1 text-sm text-muted-foreground">
                                        <CheckListItem>
                                            <strong className="text-foreground">
                                                Stock symbol:
                                            </strong>{" "}
                                            Enter a stock symbol like TQQQ,
                                            AAPL, or SPY
                                        </CheckListItem>
                                        <CheckListItem>
                                            <strong className="text-foreground">
                                                Date range:
                                            </strong>{" "}
                                            Choose start and end dates for the
                                            backtest period
                                        </CheckListItem>
                                        <CheckListItem>
                                            <strong className="text-foreground">
                                                Starting capital:
                                            </strong>{" "}
                                            Initial amount to start trading with
                                        </CheckListItem>
                                        <CheckListItem>
                                            <strong className="text-foreground">
                                                Algorithm parameters:
                                            </strong>{" "}
                                            Configure buy/sell percentages,
                                            capital allocation, and other
                                            strategy settings
                                        </CheckListItem>
                                        <CheckListItem>
                                            <strong className="text-foreground">
                                                Contribution schedule
                                                (optional):
                                            </strong>{" "}
                                            Set up regular cash additions to
                                            simulate dollar-cost averaging
                                        </CheckListItem>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Step 2: Choose Execution Mode
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="space-y-3">
                                        <div className="p-4 rounded-lg border bg-muted/50">
                                            <div className="flex items-center gap-2 mb-2">
                                                <HardDrive className="h-4 w-4 text-primary" />
                                                <h3 className="font-semibold">
                                                    Local Mode
                                                </h3>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Runs on your machine. Best for
                                                quick tests and development.
                                            </p>
                                            <ul className="text-sm text-muted-foreground space-y-1">
                                                <li>• Fast for small ranges</li>
                                                <li>
                                                    • Full control over
                                                    execution
                                                </li>
                                                <li>
                                                    • Uses your computer's power
                                                </li>
                                                <li>
                                                    • Can run multiple in
                                                    parallel
                                                </li>
                                            </ul>
                                        </div>

                                        <div className="p-4 rounded-lg border bg-muted/50">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Cloud className="h-4 w-4 text-primary" />
                                                <h3 className="font-semibold">
                                                    Cloud Mode (AWS Lambda)
                                                </h3>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Runs on AWS Lambda. Best when
                                                you don't want to use local
                                                resources or need longer
                                                execution times.
                                            </p>
                                            <ul className="text-sm text-muted-foreground space-y-1">
                                                <li>
                                                    • Handles long-running
                                                    backtests (up to 15 minutes)
                                                </li>
                                                <li>
                                                    • No local resource usage
                                                </li>
                                                <li>
                                                    • Can run multiple in
                                                    parallel
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                                <div>
                                    <h3 className="font-semibold mb-2 text-foreground">
                                        Step 3: Watch Progress
                                    </h3>
                                    <p className="mb-3">
                                        Monitor real-time progress as the
                                        backtest runs. If missing data needs to
                                        be fetched, you'll see download
                                        progress. The system shows days
                                        remaining, and estimated completion
                                        time. It indicates what the system is
                                        doing (downloading, processing chunks,
                                        etc.).
                                    </p>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2 text-foreground">
                                        Step 4: Analyze Results
                                    </h3>
                                    <p className="mb-3">
                                        After the backtest completes, review the
                                        results
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                How the Algorithm Works
                            </h2>

                            <Card>
                                <CardHeader>
                                    <CardTitle>
                                        Algorithm Execution Flow
                                    </CardTitle>
                                    <CardDescription>
                                        How the system creates actions and
                                        executes trades
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <h3 className="font-semibold mb-2 text-sm">
                                            1. Action Creation
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            The algorithm creates buy orders and
                                            sell orders based on your strategy
                                            parameters. Buy orders are set at a
                                            percentage below the current price.
                                            Sell orders are set at a percentage
                                            above the buy price. These orders
                                            are stored in memory and checked
                                            every minute.
                                        </p>
                                    </div>

                                    <div className="border-t pt-4">
                                        <h3 className="font-semibold mb-2 text-sm">
                                            2. Order Execution
                                        </h3>
                                        <p className="text-sm text-muted-foreground mb-2">
                                            Every minute, the system checks if
                                            the current price triggers any
                                            orders. If the price drops to or
                                            below a buy order price, it executes
                                            a buy (if cash is available). If the
                                            price rises to or above a sell order
                                            price, it executes a sell (if the
                                            PDT rule allows).
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            After a buy, new sell and buy orders
                                            are created for the next
                                            opportunity. After a sell, a new buy
                                            order is created at a higher price
                                            to scale up the position.
                                        </p>
                                    </div>

                                    <div className="border-t pt-4">
                                        <h3 className="font-semibold mb-2 text-sm">
                                            3. State Updates
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            After each trade, the system updates
                                            cash balance, share count, equity
                                            value, trade history, and PDT
                                            status.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                Key Parameters and Their Effect
                            </h2>

                            <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                                <p>
                                    These parameters control how the algorithm
                                    trades. Start with defaults and adjust to
                                    change strategy behavior.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <h3 className="font-semibold mb-1 text-base text-foreground">
                                        Capital %{" "}
                                        <span className="text-sm font-normal text-muted-foreground italic">
                                            (Default: 60%)
                                        </span>
                                    </h3>
                                    <p className="text-sm md:text-base text-muted-foreground">
                                        Percentage of available cash used per
                                        buy. Higher = more aggressive, but runs
                                        out of cash faster. Lower = more
                                        conservative, but underutilizes capital.
                                        Controls risk exposure, not
                                        profitability.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-1 text-base text-foreground">
                                        Buy Below %{" "}
                                        <span className="text-sm font-normal text-muted-foreground italic">
                                            (Default: 2%)
                                        </span>
                                    </h3>
                                    <p className="text-sm md:text-base text-muted-foreground">
                                        How far below current price to place buy
                                        orders. Smaller = more frequent buys.
                                        Larger = only on deeper dips. Controls
                                        trade frequency and drawdown behavior.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-1 text-base text-foreground">
                                        Sell Above %{" "}
                                        <span className="text-sm font-normal text-muted-foreground italic">
                                            (Default: 18%)
                                        </span>
                                    </h3>
                                    <p className="text-sm md:text-base text-muted-foreground">
                                        Profit target before selling. Smaller =
                                        quicker profits, more trades. Larger =
                                        fewer trades, bigger moves. Controls
                                        profit-taking behavior.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-1 text-base text-foreground">
                                        Buy After Sell %{" "}
                                        <span className="text-sm font-normal text-muted-foreground italic">
                                            (Default: 25%)
                                        </span>
                                    </h3>
                                    <p className="text-sm md:text-base text-muted-foreground">
                                        Where to place next buy after a sell.
                                        Critical parameter. Enables grid to move
                                        upward, prevents inactivity in strong
                                        trends, keeps algorithm active. Without
                                        this, strategy can stop trading for long
                                        periods.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-1 text-base text-foreground">
                                        Cash Floor{" "}
                                        <span className="text-sm font-normal text-muted-foreground italic">
                                            (Default: $200)
                                        </span>
                                    </h3>
                                    <p className="text-sm md:text-base text-muted-foreground">
                                        Minimum cash that is never used.
                                        Prevents full capital lockup, adds
                                        safety buffer, reduces overtrading.
                                        About survivability, not profit.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-1 text-base text-foreground">
                                        Order Gap %{" "}
                                        <span className="text-sm font-normal text-muted-foreground italic">
                                            (Default: 1.5%)
                                        </span>
                                    </h3>
                                    <p className="text-sm md:text-base text-muted-foreground">
                                        Merges buy orders closer than this
                                        percentage. Reduces action spam,
                                        improves performance, keeps execution
                                        realistic. Without filtering, creates
                                        more orders than can be executed. This
                                        feature can be toggled on/off in the
                                        backtest configuration.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 text-sm md:text-base text-muted-foreground">
                                <p>
                                    Grid trading is sensitive. Small changes in
                                    these parameters can significantly affect
                                    trade frequency, drawdown depth, time spent
                                    inactive, and cash utilization. This is why
                                    the backtest exists - not to show profits,
                                    but to show behavior.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                Important Edge Cases
                            </h2>

                            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
                                        <CardTitle>
                                            Waiting for Capital: The Cash Floor
                                            Problem
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        Sometimes the algorithm encounters a
                                        good buying opportunity, but there's not
                                        enough cash available (due to cash floor
                                        or all capital being deployed). The buy
                                        order remains active but cannot execute.
                                        The system waits for prices to rise and
                                        trigger sell orders first. Only after
                                        selling shares and freeing cash can new
                                        buys occur.
                                    </p>
                                    <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-900">
                                        <p className="text-xs font-semibold mb-1">
                                            Example: Post-COVID Recovery
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            After the 2020 coronavirus crash,
                                            some stocks took nearly 2 years to
                                            recover. If the algorithm bought at
                                            the bottom and ran out of cash, it
                                            would wait silently for those 2
                                            years until prices rose enough to
                                            trigger sell orders. During this
                                            period, no trading activity occurs.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
                                        <CardTitle>
                                            Contribution System: Injecting Cash
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-sm text-muted-foreground">
                                        The contribution system solves the
                                        waiting problem by allowing periodic
                                        cash injections. Set contribution
                                        frequency (e.g., every 7 days) and
                                        amount (e.g., $500). At scheduled
                                        intervals, cash is added to the account.
                                        This enables buying opportunities that
                                        were previously blocked and simulates
                                        dollar-cost averaging.
                                    </p>
                                    <div className="p-3 rounded-lg bg-green-100 dark:bg-green-950/40 border border-green-200 dark:border-green-900">
                                        <p className="text-xs font-semibold mb-1">
                                            With Contributions
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            In the post-COVID scenario, if
                                            contributions are enabled, the
                                            system adds cash regularly. As
                                            prices remain low, it can continue
                                            buying at discounted prices instead
                                            of just waiting.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                                <div>
                                    <h3 className="font-semibold mb-2 text-foreground">
                                        PDT Rule Restrictions
                                    </h3>
                                    <p>
                                        Accounts under $25,000 with 3+ day
                                        trades in 5 business days face
                                        restrictions. Buys are still allowed,
                                        but sells that would create a 4th day
                                        trade are blocked. The system must wait
                                        for a day trade to "age out" (exit the
                                        5-business-day window) before selling.
                                        This can cause delays in taking profits
                                        during volatile periods.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2 text-foreground">
                                        Order Gap Filtering
                                    </h3>
                                    <p>
                                        Multiple buy orders that are very close
                                        together get merged. This reduces order
                                        clutter and prevents creating too many
                                        small positions. This setting can be
                                        toggled on or off.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2 text-foreground">
                                        Scaling Up Strategy
                                    </h3>
                                    <p>
                                        After selling at a profit, the algorithm
                                        creates new buy orders at higher prices
                                        (Buy After Sell Percentage). This allows
                                        scaling up position size as prices rise,
                                        capturing momentum while maintaining
                                        entry discipline.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                How to Use This Backtest Properly
                            </h2>
                            <Card className="border-primary/20 bg-primary/5">
                                <CardContent>
                                    <ul className="space-y-3 text-sm text-muted-foreground">
                                        <CheckListItem variant="primary">
                                            Observe behavior, not returns
                                        </CheckListItem>
                                        <CheckListItem variant="primary">
                                            Watch inactivity periods
                                        </CheckListItem>
                                        <CheckListItem variant="primary">
                                            Look at drawdowns, not final equity
                                        </CheckListItem>
                                        <CheckListItem variant="primary">
                                            Change one parameter at a time
                                        </CheckListItem>
                                        <CheckListItem variant="primary">
                                            Run multiple backtests in parallel
                                            to compare different parameter sets
                                        </CheckListItem>
                                    </ul>
                                </CardContent>
                            </Card>
                            <p className="text-sm md:text-base text-muted-foreground">
                                If you only look at the final number, you will
                                misunderstand the strategy.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                Why This Backtest Is Honest
                            </h2>
                            <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                                <p>
                                    It respects data limits, applies stock
                                    splits correctly, does not smooth results,
                                    and does not hide bad behavior.
                                </p>
                                <p>
                                    If a strategy fails here, it would fail in
                                    reality too. That is the point.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                Frequently Asked Questions
                            </h2>
                            <Accordion type="single" collapsible className="w-full">
                                {faqSchema.map((faq, index) => (
                                    <AccordionItem key={index} value={`item-${index + 1}`}>
                                        <AccordionTrigger>{faq.name}</AccordionTrigger>
                                        <AccordionContent>{faq.acceptedAnswer.text}</AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        </section>
                    </article>

                    <Script
                        id="faq-schema"
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{
                            __html: JSON.stringify(faqPageSchema),
                        }}
                        strategy="lazyOnload"
                    />
                    <Script
                        id="howto-schema"
                        type="application/ld+json"
                        dangerouslySetInnerHTML={{
                            __html: JSON.stringify(howToSchema),
                        }}
                        strategy="lazyOnload"
                    />

                    <PageNav
                        previousLink={{
                            href: "/about",
                            label: "About Vectura",
                        }}
                        nextLink={{
                            href: "/development-journey",
                            label: "Development Journey",
                        }}
                    />
                </div>
            </main>
        </div>
    );
}
