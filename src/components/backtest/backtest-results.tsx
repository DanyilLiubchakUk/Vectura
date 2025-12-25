import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BacktestResult } from "@/backtest/types";

interface BacktestResultsProps {
    result: BacktestResult;
}

export function BacktestResults({ result }: BacktestResultsProps) {
    return (
        <Card>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Stock</p>
                        <p className="text-lg font-semibold">{result.stock}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Date Range
                        </p>
                        <p className="text-lg font-semibold">
                            {result.startDate} to {result.endDate}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Starting Capital
                        </p>
                        <p className="text-lg font-semibold">
                            ${result.startCapital.toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Final Equity
                        </p>
                        <p className="text-lg font-semibold">
                            ${result.finalEquity.toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Total Return
                        </p>
                        <p
                            className={`text-lg font-semibold ${
                                result.totalReturn >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                            }`}
                        >
                            ${result.totalReturn.toLocaleString()} (
                            {result.totalReturnPercent.toFixed(2)}%)
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Execution Time
                        </p>
                        <p className="text-lg font-semibold">
                            {result.executionTime}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">
                            Processed Bars
                        </p>
                        <p className="text-lg font-semibold">
                            {result.processedBars.toLocaleString()}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
