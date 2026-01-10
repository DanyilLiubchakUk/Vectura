"use client";

import { algorithmOptions } from "@/components/backtest/sections/basic-fields";
import { MEDIA_QUERY_BREAKPOINTS } from "@/constants/media-queries";
import { formatDate } from "@/app/ranges/utils/date-helpers";
import { useElementSize } from "@/hooks/use-element-size";
import { useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { BacktestConfig } from "@/backtest/types";

export function BacktestConfigDisplay({ config }: { config: BacktestConfig }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const algorithmName = algorithmOptions.find(
        (algo) => algo.value === config.algorithm
    )?.label;

    const formatPercent = (value: number) => `${value}%`;

    const gridClasses = useElementSize(containerRef, [
        {
            operator: "<",
            size: MEDIA_QUERY_BREAKPOINTS.MD,
            classes: "grid-cols-2",
        },
    ]);

    const configItems = useMemo(() => {
        const items: (string | null)[] = [
            `${algorithmName} on ${config.stock}`,
            `${formatDate(config.startDate)} - ${formatDate(config.endDate)}`,
            `Buy Below: ${formatPercent(config.buyBelowPct)}`,
            `Sell Above: ${formatPercent(config.sellAbovePct)}`,
            `Buy After Sell: ${formatPercent(config.buyAfterSellPct)}`,
            `Cash per trade: ${formatPercent(config.capitalPct)}`,
            config.contributionFrequencyDays && config.contributionAmount
                ? `Contribute $${config.contributionAmount.toLocaleString()} every ${config.contributionFrequencyDays
                }d`
                : null,
            `Start capital: $${config.startCapital}`,
            `Cash floor: $${config.cashFloor}`,
            `Join gap: ${formatPercent(config.orderGapPct)}`,
        ];

        return items.filter((item): item is string => item !== null);
    }, [config, algorithmName]);

    return (
        <div ref={containerRef} className="rounded-md border bg-card p-2 mb-0">
            <div
                className={cn(
                    "grid gap-x-3 gap-y-1.5 text-[10px] grid-cols-5",
                    gridClasses
                )}
            >
                {configItems.map((item, index) => (
                    <p key={index} className="min-w-0 font-medium truncate">
                        {item}
                    </p>
                ))}
            </div>
        </div>
    );
}
