"use client";

import {
    backtestFormSchema,
    type BacktestFormValues,
} from "@/components/backtest/schema";
import { ExecutionModeField } from "@/components/backtest/sections/execution-mode-field";
import { StrategyFields } from "@/components/backtest/sections/strategy-fields";
import { CapitalFields } from "@/components/backtest/sections/capital-fields";
import { prepareBacktestSubmissionData } from "@/components/backtest/utils";
import { defaultBacktestFormValues } from "@/components/backtest/defaults";
import { BasicFields } from "@/components/backtest/sections/basic-fields";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";

export default function BacktestForm() {
    const form = useForm<BacktestFormValues>({
        resolver: zodResolver(
            backtestFormSchema
        ) as Resolver<BacktestFormValues>,
        defaultValues: defaultBacktestFormValues,
    });

    function onSubmit(values: BacktestFormValues) {
        const submitData = prepareBacktestSubmissionData(values);
        console.log("Backtest submission:", submitData);
        // TODO: Integrate with API or backtest engine
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <TooltipProvider>
                    <div className="grid items-start gap-6 grid-cols-2 lg:grid-cols-4">
                        <BasicFields control={form.control} />
                        <CapitalFields control={form.control} />
                        <StrategyFields control={form.control} />
                        <ExecutionModeField control={form.control} />
                    </div>
                </TooltipProvider>

                <div className="flex justify-end gap-4 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => form.reset()}
                    >
                        Reset
                    </Button>
                    <Button type="submit" className="min-w-[120px]">
                        Run Backtest
                    </Button>
                </div>
            </form>
        </Form>
    );
}
