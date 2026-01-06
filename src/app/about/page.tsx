"use client";

import { PageHeader } from "@/components/layout/page-header";
import { AppHeader } from "@/components/layout/app-header";
import { PageNav } from "@/components/layout/page-nav";
import { useTheme } from "@/components/theme-provider";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function AboutPage() {
    const { theme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const algorithmDyingLight =
        "NDasFaDpWXdDOG0tAqfdTpmReCWq2V51skBbn8ufx40HNSch";
    const algorithmDyingDark =
        "NDasFaDpWXdDyGnkWUIEeoHaU95m6cjMQDwpRLBVz4WTZq32";
    const actionsCompoundLight =
        "NDasFaDpWXdDVZPaoqjsA6Hovqlf8jGukFDmai9NRgTrLcBQ";
    const actionsCompoundDark =
        "NDasFaDpWXdD8Hb8ajouPKkTDU6pC1GmyJqLVEd5MjRonz02";

    const urlFromId = (id: string) => {
        return `https://utfs.io/a/vx037ud6ao/${id}`;
    };
    const algorithmDyingImage =
        mounted && theme === "dark" ? algorithmDyingDark : algorithmDyingLight;
    const actionsCompoundImage =
        mounted && theme === "dark"
            ? actionsCompoundDark
            : actionsCompoundLight;

    return (
        <div className="min-h-screen flex flex-col">
            <AppHeader title="About Vectura" />

            <main className="flex-1 container mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-12">
                <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
                    <PageHeader
                        title="Why This Backtesting Engine Exists"
                        description="The story behind Vectura"
                    />

                    <article className="prose prose-slate dark:prose-invert max-w-none space-y-6 md:space-y-8">
                        <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                            <p>
                                This project did not start as a trading
                                platform.
                            </p>
                            <p>
                                It started as an idea to build an AI product
                                that could find good buy and sell moments in the
                                stock market using news, price movement, and
                                other signals. At first, that sounded
                                reasonable. But the more research I did, the
                                more obvious it became that finance and AI are
                                not natural friends, especially when you care
                                about transparency, repeatability, and
                                real-world constraints.
                            </p>
                            <p>
                                Instead of forcing AI into a space where it
                                mostly adds noise, I shifted my focus to
                                rule-based trading algorithms - systems that can
                                be tested, explained, and broken down step by
                                step.
                            </p>
                            <p>
                                That shift is what eventually led me to grid
                                trading, and later, to building this backtesting
                                engine.
                            </p>
                        </div>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                The First Version: Simple, and Wrong
                            </h2>
                            <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                                <p>
                                    The very first version of the algorithm was
                                    basic.
                                </p>
                                <p>
                                    I used a CSV file with predefined buy and
                                    sell price levels:
                                </p>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                    <li>
                                        If price went below a buy level → buy
                                    </li>
                                    <li>
                                        If price went above a sell level → sell
                                    </li>
                                    <li>
                                        After each buy, add: one sell order
                                        above and one buy order below
                                    </li>
                                </ul>
                                <p>
                                    This worked fine on small ranges and calm
                                    price action. But it completely failed in
                                    trending markets.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                The "Algorithm Dying" Problem
                            </h2>
                            <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                                <p>
                                    I ran into a serious issue when a stock
                                    moved strongly upward.
                                </p>
                                <p>
                                    For example: A stock buys at $20, sells at
                                    $24, then rises to $40, $60, $80. It never
                                    comes back down to the next buy level.
                                </p>
                                <p>
                                    In this situation, the algorithm simply
                                    stops trading. It doesn't lose money. It
                                    just becomes inactive.
                                </p>
                                <p>
                                    This is one of the worst failure modes for
                                    an automated strategy: not losing - but
                                    doing nothing for months or years.
                                </p>
                            </div>

                            <div className="my-6 md:my-8">
                                <div className="relative aspect-video rounded-lg overflow-hidden">
                                    <Image
                                        src={urlFromId(algorithmDyingImage)}
                                        alt="Algorithm Dying: Top shows algorithm sells once and becomes inactive. Bottom shows buying after sell allows the grid to follow the trend and remain active."
                                        fill
                                        className="object-contain"
                                        unoptimized
                                    />
                                </div>
                                <p className="text-xs md:text-sm text-muted-foreground mt-2 text-center">
                                    Top: the algorithm sells once and becomes
                                    inactive. Bottom: buying after sell allows
                                    the grid to follow the trend and remain
                                    active.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                A Controversial Fix: Buy After Sell
                            </h2>
                            <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                                <p>
                                    To prevent the algorithm from becoming
                                    inactive, I added a rule that felt wrong at
                                    first: After a sell, place a new buy order
                                    above the sell price.
                                </p>
                                <p>
                                    This immediately raised a valid concern:
                                    "Why would you buy higher right after you
                                    sold?"
                                </p>
                                <p>
                                    I didn't have a perfect theoretical
                                    explanation - but I had a practical one:
                                </p>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                    <li>It keeps the algorithm alive</li>
                                    <li>
                                        It allows the grid to move upward with
                                        price
                                    </li>
                                    <li>
                                        It prevents long-term inactivity in
                                        strong trends
                                    </li>
                                </ul>
                                <p>
                                    The strategy stopped "dying" and began
                                    adapting.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                Performance Reality: CSV Was a Dead End
                            </h2>
                            <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                                <p>
                                    Once the logic improved, I pushed the
                                    backtest to longer ranges. A 5-year test
                                    took several hours, produced over a million
                                    CSV rows, and spent most of its time
                                    searching files instead of simulating
                                    trades.
                                </p>
                                <p>
                                    At that point, the bottleneck wasn't trading
                                    logic - it was data handling.
                                </p>
                                <p>
                                    I removed CSV files entirely and moved
                                    everything into memory-based structures.
                                    This reduced execution time dramatically and
                                    made long backtests possible at all.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                Data Limits, Stock Splits, and Reality
                            </h2>
                            <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                                <p>
                                    When I tried to run even longer backtests, I
                                    ran into real-world data limits:
                                </p>
                                <ul className="list-disc list-inside space-y-1 ml-4">
                                    <li>
                                        Alpaca's free historical data only goes
                                        back to 2016-01-04
                                    </li>
                                    <li>Earlier requests fail unpredictably</li>
                                    <li>
                                        Large price "crashes" appeared that
                                        weren't market events
                                    </li>
                                </ul>
                                <p>
                                    Those crashes turned out to be stock splits.
                                    Most free data sources don't apply splits
                                    retroactively. That makes long-term
                                    backtests misleading or outright wrong.
                                </p>
                                <p>
                                    To fix this, I fetched split data
                                    separately, stored it per symbol, and
                                    applied splits manually to historical
                                    prices. Only after that did long-range
                                    backtests become realistic.
                                </p>
                                <p>
                                    The backtest can run from the whole stock
                                    history with the boundary of 2016-01-04
                                    (when Alpaca's free historical data starts)
                                    till today minus 10 days. I added the 10-day
                                    buffer to make sure that Alpaca and
                                    AlphaVantage data is settled.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                Too Many Actions, Too Much Noise
                            </h2>
                            <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                                <p>
                                    Grid strategies naturally generate many buy
                                    actions, especially during downtrends. This
                                    created performance issues, unrealistic
                                    execution (not enough cash), and unnecessary
                                    computation.
                                </p>
                                <p>
                                    The solution was action clustering: Group
                                    buy orders by percentage ranges, keep only
                                    the most favorable prices, and reduce noise
                                    without changing behavior.
                                </p>
                            </div>

                            <div className="my-6 md:my-8">
                                <div className="relative aspect-video rounded-lg overflow-hidden">
                                    <Image
                                        src={urlFromId(actionsCompoundImage)}
                                        alt="Actions Compound: Top shows unfiltered buy actions compound and overload the system. Bottom shows filtered clusters keep only meaningful levels."
                                        fill
                                        className="object-contain"
                                        unoptimized
                                    />
                                </div>
                                <p className="text-xs md:text-sm text-muted-foreground mt-2 text-center">
                                    Top: unfiltered buy actions compound and
                                    overload the system. Bottom: filtered
                                    clusters keep only meaningful levels.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                What This App Is (And Is Not)
                            </h2>
                            <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                                <p>This app is not a promise of profit.</p>
                                <p>
                                    It is: a backtesting engine built on real
                                    data, shaped by real constraints, designed
                                    to fail loudly instead of silently.
                                </p>
                                <p>
                                    Every rule, limit, and behavior exists
                                    because it broke at some point.
                                </p>
                                <p>
                                    This is not a marketing product. It's a
                                    system built by pushing ideas until they
                                    failed - and fixing what mattered.
                                </p>
                            </div>
                        </section>
                    </article>

                    <PageNav
                        nextLink={{
                            href: "/how-backtest-works",
                            label: "How the Backtest Works",
                        }}
                    />
                </div>
            </main>
        </div>
    );
}
