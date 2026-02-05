"use client";

import {
    Database,
    Code,
    Server,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { AppHeader } from "@/components/layout/app-header";
import { PageNav } from "@/components/layout/page-nav";

export default function DevelopmentJourneyPage() {
    return (
        <div className="min-h-screen flex flex-col">
            <AppHeader title="Development Journey" />

            <main className="flex-1 container mx-auto px-4 md:px-6 lg:px-8 py-6 md:py-12">
                <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
                    <PageHeader
                        title="Development Journey"
                        description="Technical challenges and solutions"
                    />

                    <article className="prose prose-slate dark:prose-invert max-w-none space-y-6 md:space-y-8">
                        <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                            <p>
                                Building this backtesting engine involved
                                solving multiple technical challenges. Each
                                problem required research, experimentation, and
                                optimization. This page documents the journey
                                from initial implementation to the current
                                system.
                            </p>
                        </div>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                State Management: From Files to In-Memory
                            </h2>
                            <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                                <p>
                                    Initially, I stored backtest state in CSV
                                    files. This worked for small tests, but
                                    became a major problem with large backtests.
                                    Inserting and deleting data required
                                    rewriting entire files, which was extremely
                                    slow.
                                </p>
                                <p>
                                    I decided to switch to in-memory state
                                    management using Zustand. This eliminated
                                    file I/O operations completely. State
                                    updates became instant, saving significant
                                    compute time and reducing complexity. The
                                    system now handles backtests of any length
                                    efficiently.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                Finding Free Solutions
                            </h2>
                            <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                                <p>
                                    Finding reliable, free APIs for
                                    minute-by-minute stock data and split
                                    information required extensive research.
                                    After testing various options, I settled on
                                    Alpaca API for minute bars, AlphaVantage API
                                    for stock splits, and Supabase for data
                                    storage - all using their free tiers.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                PDT Rule Implementation
                            </h2>
                            <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                                <p>
                                    Implementing Pattern Day Trader rules was
                                    complex. The system needs to track if each
                                    trade is a day trade (buy and sell same
                                    day), count round trips within the last 5
                                    business days (not calendar days), handle
                                    weekends and holidays correctly, and prevent
                                    selling if it would create a 4th day trade
                                    when restricted.
                                </p>
                                <p>
                                    I solved this with a rolling window
                                    algorithm that calculates business days
                                    correctly and detects round trips
                                    accurately.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                Performance Optimization
                            </h2>
                            <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                                <p>
                                    Performance was a critical challenge. The
                                    initial implementation struggled with
                                    long-term backtests.
                                </p>
                            </div>

                            <Card className="border-destructive/20 bg-destructive/10 dark:bg-destructive/10">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5 text-destructive" />
                                        <CardTitle>Initial Problem</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        A 10-year backtest was taking 7 hours to
                                        complete and would eventually crash due
                                        to too many actions to track.
                                    </p>
                                </CardContent>
                            </Card>

                            <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                                <div>
                                    <h3 className="font-semibold mb-2 text-foreground">
                                        Solutions
                                    </h3>
                                    <ul className="space-y-1 list-disc list-inside ml-4">
                                        <li>
                                            Order gap filtering to merge similar
                                            buy orders
                                        </li>
                                        <li>
                                            Chunk processing - process data in
                                            monthly chunks instead of loading
                                            everything
                                        </li>
                                        <li>
                                            Optimized data structures for faster
                                            order matching
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <Card className="border-green-200 dark:border-green-900 bg-green-100/55 dark:bg-green-950/45">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-5 w-5  text-green-600 dark:text-green-500" />
                                        <CardTitle>Result</CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        The same 10-year backtest now completes
                                        in a fraction of the time and can handle
                                        backtests of any length without
                                        crashing.
                                    </p>
                                </CardContent>
                            </Card>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                Data Pipeline Optimizations
                            </h2>
                            <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                                <div>
                                    <h3 className="font-semibold mb-2 text-foreground">
                                        Finding First Available Day
                                    </h3>
                                    <p>
                                        To find when Alpaca first started
                                        providing data for a stock, the system
                                        needs to search from now going back many
                                        years (potentially 10 years × 365 days =
                                        thousands of days). Instead of checking
                                        each day one by one, I implemented
                                        binary search. This reduces API calls
                                        from thousands to approximately 180
                                        calls maximum.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2 text-foreground">
                                        Data Compression
                                    </h3>
                                    <p>
                                        Data is compressed to minimize storage.
                                        Minute bars are first compacted to just
                                        timestamp and price tuples, then Gzip
                                        compression is applied. This reduces
                                        storage by over 90% while maintaining
                                        fast access times.
                                    </p>
                                </div>

                                <div>
                                    <h3 className="font-semibold mb-2 text-foreground">
                                        Incremental Downloads
                                    </h3>
                                    <p>
                                        The system only downloads missing date
                                        ranges instead of re-downloading
                                        everything. It tracks what data is
                                        already stored to avoid unnecessary API
                                        calls.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                Cloud Architecture: API Gateway → Cloudflare Workers
                            </h2>
                            <div className="space-y-3 text-sm md:text-base text-muted-foreground">
                                <p>
                                    Cloud Mode initially used AWS API Gateway WebSocket to connect the client
                                    directly to Lambda. The client would connect to the WebSocket, and Lambda
                                    would push progress over that connection. This worked, but API Gateway is
                                    only free for the first 12 months of AWS account creation - after that, costs
                                    add up.
                                </p>
                                <h3 className="font-semibold mb-2 text-foreground">
                                    The solution was to migrate to Cloudflare Workers. Now the flow is:
                                </h3>
                                <ol className="list-decimal list-inside space-y-2 ml-4">
                                    <li>
                                        Client POSTs to Worker <code className="text-xs bg-muted px-1 rounded">/start-backtest</code> →
                                        Worker invokes Lambda and returns a job ID
                                    </li>
                                    <li>
                                        Client opens a WebSocket to the Worker with that job ID
                                    </li>
                                    <li>
                                        Worker uses Durable Objects (keyed by job ID) for stateful memory per backtest session
                                    </li>
                                    <li>
                                        Lambda receives the same job ID. When it has progress, it POSTs to the
                                        Worker <code className="text-xs bg-muted px-1 rounded">/callback</code> with the job ID
                                    </li>
                                    <li>
                                        Worker routes the payload to the right Durable Object, which forwards
                                        it to the correct WebSocket → the client gets progress in real time
                                    </li>
                                </ol>
                                <p>
                                    From the client's perspective, it's still a single WebSocket connection.
                                    Cloudflare Workers and Durable Objects run on a fully free tier, so Cloud
                                    Mode stays free indefinitely.
                                </p>
                            </div>
                        </section>

                        <section className="space-y-3">
                            <h2 className="text-xl md:text-2xl font-bold">
                                Technical Stack
                            </h2>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="grid md:grid-cols-3 gap-4 md:gap-6">
                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Code className="h-4 w-4 text-muted-foreground" />
                                                <h3 className="font-semibold text-sm">
                                                    Frontend
                                                </h3>
                                            </div>
                                            <ul className="space-y-1 text-sm text-muted-foreground">
                                                <li>• Next.js 14+</li>
                                                <li>• TypeScript</li>
                                                <li>• Tailwind CSS</li>
                                                <li>• shadcn/ui</li>
                                                <li>• Zustand</li>
                                            </ul>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Database className="h-4 w-4 text-muted-foreground" />
                                                <h3 className="font-semibold text-sm">
                                                    Backend
                                                </h3>
                                            </div>
                                            <ul className="space-y-1 text-sm text-muted-foreground">
                                                <li>• Supabase</li>
                                                <li>• Alpaca API</li>
                                                <li>• AlphaVantage API</li>
                                                <li>• Next.js API Routes</li>
                                                <li>• Gzip compression</li>
                                            </ul>
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 mb-3">
                                                <Server className="h-4 w-4 text-muted-foreground" />
                                                <h3 className="font-semibold text-sm">
                                                    Cloud
                                                </h3>
                                            </div>
                                            <ul className="space-y-1 text-sm text-muted-foreground">
                                                <li>• AWS Lambda (backtest execution)</li>
                                                <li>• Cloudflare Workers</li>
                                                <li>• Durable Objects (job routing)</li>
                                                <li>• WebSocket (progress streaming)</li>
                                                <li>• Fully free tier</li>
                                            </ul>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </section>
                    </article>

                    <PageNav
                        previousLink={{
                            href: "/how-backtest-works",
                            label: "How the Backtest Works",
                        }}
                        nextLink={{
                            href: "/about",
                            label: "About Vectura",
                        }}
                    />
                </div>
            </main>
        </div>
    );
}
