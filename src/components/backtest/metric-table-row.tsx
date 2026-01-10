"use client";

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { MEDIA_QUERY_BREAKPOINTS } from "@/constants/media-queries";
import { useElementSize } from "@/hooks/use-element-size";
import { InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { type RefObject } from "react";

interface MetricTableRowProps {
    label: string;
    description: string;
    value: React.ReactNode;
    containerRef: RefObject<HTMLElement | null>;
    descriptionBreakpoint?: "MD" | "LG" | "XL";
}

export function MetricTableRow({
    label,
    description,
    value,
    containerRef,
    descriptionBreakpoint = "XL",
}: MetricTableRowProps) {
    const iconClasses = useElementSize(containerRef, [
        {
            operator: ">=",
            size: MEDIA_QUERY_BREAKPOINTS.LG,
            classes: "block",
        },
        {
            operator: ">=",
            size: MEDIA_QUERY_BREAKPOINTS.XL,
            classes: "hidden",
        },
        {
            operator: "<",
            size: MEDIA_QUERY_BREAKPOINTS[descriptionBreakpoint],
            classes: "block",
        },
        {
            operator: "<",
            size: MEDIA_QUERY_BREAKPOINTS.MD,
            classes: "hidden",
        },
    ]);


    const descriptionClasses = useElementSize(containerRef, [
        {
            operator: ">=",
            size: MEDIA_QUERY_BREAKPOINTS.LG,
            classes: "hidden",
        },
        {
            operator: ">=",
            size: MEDIA_QUERY_BREAKPOINTS.XL,
            classes: "block",
        },
        {
            operator: "<",
            size: MEDIA_QUERY_BREAKPOINTS[descriptionBreakpoint],
            classes: "hidden",
        },
        {
            operator: "<",
            size: MEDIA_QUERY_BREAKPOINTS.MD,
            classes: "block text-[0.65rem]",
        },
    ]);

    const hideSecondColumn = useElementSize(containerRef, [
        {
            operator: "<",
            size: MEDIA_QUERY_BREAKPOINTS.MD,
            classes: "hidden",
        },
    ]);

    const valueBelowLabel = useElementSize(containerRef, [
        {
            operator: "<",
            size: MEDIA_QUERY_BREAKPOINTS.MD,
            classes: "block mt-1",
        },
        {
            operator: ">=",
            size: MEDIA_QUERY_BREAKPOINTS.MD,
            classes: "hidden",
        },
    ]);

    const firtColumnClasses = useElementSize(containerRef, [
        {
            operator: "<",
            size: MEDIA_QUERY_BREAKPOINTS.MD,
            classes: "flex-col-reverse pr-0 py-0 [&_>p]:max-w-18",
        },
    ]);

    return (
        <tr className="border-b border-border/40 last:border-0">
            <td className={cn("py-1 pr-4 align-top flex gap-x-2 items-start", firtColumnClasses)}>
                <p className="text-xs text-muted-foreground w-max">{label}</p>
                <div className={cn("text-sm font-semibold", valueBelowLabel)}>
                    {value}
                </div>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <InfoIcon
                            className={cn(
                                "h-3 w-3 hover:text-foreground cursor-help text-muted-foreground hidden",
                                iconClasses
                            )}
                        />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p className="max-w-xs">{description}</p>
                    </TooltipContent>
                </Tooltip>
            </td>
            <td className={cn("py-1 pr-3 align-top", hideSecondColumn)}>
                <div className="text-sm font-semibold">{value}</div>
            </td>
            <td className="py-2 pl-2 align-top min-w-0">
                {description && (
                    <p
                        className={cn(
                            "text-xs text-muted-foreground",
                            descriptionClasses
                        )}
                    >
                        {description}
                    </p>
                )}
            </td>
        </tr>
    );
}
