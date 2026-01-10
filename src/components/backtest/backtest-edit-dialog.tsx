"use client";

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    backtestFormSchema,
    type BacktestFormValues,
} from "@/components/backtest/schema";
import { ExecutionModeField } from "@/components/backtest/sections/execution-mode-field";
import { StrategyFields } from "@/components/backtest/sections/strategy-fields";
import { CapitalFields } from "@/components/backtest/sections/capital-fields";
import { FormContainerProvider } from "@/contexts/form-container-context";
import { BasicFields } from "@/components/backtest/sections/basic-fields";
import { useBacktestRunsStore } from "@/stores/backtest-runs-store";
import { MEDIA_QUERY_BREAKPOINTS } from "@/constants/media-queries";
import { useBacktestRun } from "@/hooks/use-backtest-run";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useElementSize } from "@/hooks/use-element-size";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useRef, useState } from "react";
import { Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export function BacktestEditDialog({ runId }: { runId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const { run, cancel, runBacktest } = useBacktestRun(runId);
    const updateRun = useBacktestRunsStore((state) => state.updateRun);

    if (!run) {
        return null;
    }

    const formValues: BacktestFormValues = {
        name: run.name,
        executionMode: run.config.executionMode,
        stock: run.config.stock,
        algorithm: run.config.algorithm,
        startDate: run.config.startDate,
        endDate: run.config.endDate,
        startCapital: run.config.startCapital,
        contributionFrequencyDays: run.config.contributionFrequencyDays,
        contributionAmount: run.config.contributionAmount,
        capitalPct: run.config.capitalPct,
        buyBelowPct: run.config.buyBelowPct,
        sellAbovePct: run.config.sellAbovePct,
        buyAfterSellPct: run.config.buyAfterSellPct,
        cashFloor: run.config.cashFloor,
        orderGapPct: run.config.orderGapPct,
    };

    const handleRun = async (values: BacktestFormValues) => {
        if (run.status === "running") {
            cancel();
        }

        updateRun(runId, { name: values.name });

        await runBacktest(values);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger title="Edit Parameters" asChild>
                <Pencil className="h-4 w-4" />
            </DialogTrigger>
            <DialogContent className="p-0 max-h-[calc(100%-2rem)] flex flex-col sm:max-w-[calc(100%-2rem)] md:max-w-2xl lg:max-w-4xl xl:max-w-6xl">
                <ScrollArea className="p-4 flex overflow-auto flex-col">
                    <DialogHeader>
                        <DialogTitle>Edit Backtest</DialogTitle>
                    </DialogHeader>
                    <EditFormContent
                        initialValues={formValues}
                        onRun={handleRun}
                        onCancel={() => setIsOpen(false)}
                    />
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}

function EditFormContent({
    initialValues,
    onRun,
    onCancel,
}: {
    initialValues: BacktestFormValues;
    onRun: (values: BacktestFormValues) => Promise<void>;
    onCancel: () => void;
}) {
    const form = useForm<BacktestFormValues>({
        resolver: zodResolver(
            backtestFormSchema
        ) as Resolver<BacktestFormValues>,
        defaultValues: initialValues,
    });

    const gridRef = useRef<HTMLDivElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const parentGridClasses = useElementSize(gridRef, [
        {
            operator: ">=",
            size: MEDIA_QUERY_BREAKPOINTS.LG,
            classes: "items-start",
        },
        {
            operator: "<",
            size: MEDIA_QUERY_BREAKPOINTS.MD,
            classes: "items-start",
        },
        {
            operator: "<",
            size: MEDIA_QUERY_BREAKPOINTS.SM,
            classes: "gap-4",
        },
    ]);

    const handleSubmit = async (values: BacktestFormValues) => {
        setIsSubmitting(true);
        try {
            onCancel();
            await onRun(values);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <FormContainerProvider containerRef={gridRef}>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="space-y-6"
                        id="edit-form"
                    >
                        <TooltipProvider>
                            <div
                                ref={gridRef}
                                className={cn(
                                    "grid items-end gap-6 grid-cols-12",
                                    parentGridClasses
                                )}
                            >
                                <BasicFields control={form.control} />
                                <CapitalFields control={form.control} />
                                <StrategyFields control={form.control} />
                                <ExecutionModeField control={form.control} />
                            </div>
                        </TooltipProvider>
                    </form>
                </Form>
            </FormContainerProvider>
            <DialogFooter className="mt-3">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    Cancel
                </Button>
                <Button type="submit" form="edit-form" disabled={isSubmitting}>
                    {isSubmitting ? "Running..." : "Run with New Parameters"}
                </Button>
            </DialogFooter>
        </>
    );
}
