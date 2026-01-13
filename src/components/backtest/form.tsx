"use client";

import {
    defaultBacktestFormValues,
    saveBacktestFormValues,
} from "@/components/backtest/defaults";
import {
    backtestFormSchema,
    type BacktestFormValues,
} from "@/components/backtest/schema";
import { ExecutionModeField } from "@/components/backtest/sections/execution-mode-field";
import { StrategyFields } from "@/components/backtest/sections/strategy-fields";
import { CapitalFields } from "@/components/backtest/sections/capital-fields";
import { FormContainerProvider } from "@/contexts/form-container-context";
import { BasicFields } from "@/components/backtest/sections/basic-fields";
import { MEDIA_QUERY_BREAKPOINTS } from "@/constants/media-queries";
import { useRef, useCallback, useState, useEffect } from "react";
import { useBacktestRunner } from "@/hooks/use-backtest-runner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useElementSize } from "@/hooks/use-element-size";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { cn } from "@/lib/utils";

export default function BacktestForm({
    onRunStarted,
    initialValues,
}: {
    onRunStarted?: (runId: string) => void;
    initialValues?: BacktestFormValues;
}) {
    const form = useForm<BacktestFormValues>({
        resolver: zodResolver(
            backtestFormSchema
        ) as Resolver<BacktestFormValues>,
        defaultValues: defaultBacktestFormValues,
        mode: "onSubmit",
    });

    const isResettingRef = useRef(false);
    const saveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (initialValues) {
            isResettingRef.current = true;
            form.reset(initialValues);
            const timer = setTimeout(() => {
                isResettingRef.current = false;
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [form, initialValues]);

    const formValues = form.watch();
    useEffect(() => {
        if (isResettingRef.current) {
            return;
        }

        if (saveDebounceTimerRef.current) {
            clearTimeout(saveDebounceTimerRef.current);
        }

        saveDebounceTimerRef.current = setTimeout(() => {
            if (!isResettingRef.current) {
                saveBacktestFormValues(formValues);
            }
        }, 500); // 500ms debounce

        return () => {
            if (saveDebounceTimerRef.current) {
                clearTimeout(saveDebounceTimerRef.current);
            }
        };
    }, [formValues]);

    const { startBacktest } = useBacktestRunner();
    const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(
        null
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const gridRef = useRef<HTMLDivElement>(null);

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

    const handleSubmit = useCallback(
        async (values: BacktestFormValues) => {
            if (isSubmitting) {
                return;
            }

            setIsSubmitting(true);

            try {
                saveBacktestFormValues(values);

                const runId = await startBacktest(values);

                if (onRunStarted) {
                    onRunStarted(runId);
                }
            } finally {
                setIsSubmitting(false);
            }
        },
        [isSubmitting, startBacktest, onRunStarted]
    );

    async function onSubmit(values: BacktestFormValues) {
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }

        const timer = setTimeout(() => {
            handleSubmit(values);
        }, 300); // 300ms debounce

        setDebounceTimer(timer);
    }

    useEffect(() => {
        return () => {
            if (debounceTimer) {
                clearTimeout(debounceTimer);
            }
        };
    }, [debounceTimer]);

    return (
        <FormContainerProvider containerRef={gridRef}>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
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

                    <div className="gap-2 flex flex-col-reverse sm:flex-row sm:justify-end mt-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                form.reset();
                            }}
                            disabled={isSubmitting}
                        >
                            Reset
                        </Button>
                        <Button
                            type="submit"
                            className="min-w-[120px]"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Starting..." : "Run Backtest"}
                        </Button>
                    </div>
                </form>
            </Form>
        </FormContainerProvider>
    );
}
