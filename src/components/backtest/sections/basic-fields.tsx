import { TextInputField } from "@/components/backtest/fields/text-input-field";
import { useFormContainer } from "@/contexts/form-container-context";
import { DateField } from "@/components/backtest/fields/date-field";
import { MEDIA_QUERY_BREAKPOINTS } from "@/constants/media-queries";
import { useElementSize } from "@/hooks/use-element-size";
import { cn } from "@/lib/utils";
import type { BacktestFormValues } from "@/components/backtest/schema";
import type { Control } from "react-hook-form";

interface BasicFieldsProps {
    control: Control<BacktestFormValues>;
}

export function BasicFields({ control }: BasicFieldsProps) {
    const containerRef = useFormContainer();
    const gridClasses = useElementSize(containerRef, [
        {
            operator: ">=",
            size: MEDIA_QUERY_BREAKPOINTS.MD,
            classes: "col-span-3",
        },
    ]);
    const dateClasses = useElementSize(containerRef, [
        {
            operator: "<",
            size: MEDIA_QUERY_BREAKPOINTS.SM,
            classes: "col-span-12",
        },
    ]);

    return (
        <>
            {/* Backtest Name */}
            <TextInputField
                name="name"
                control={control}
                label="Backtest Name"
                description="Give your backtest a name to identify it"
                placeholder="My Backtest"
                className={cn("col-span-6", gridClasses)}
            />

            {/* Stock Symbol */}
            <TextInputField
                name="stock"
                control={control}
                label="Stock Symbol"
                description="Enter the stock ticker symbol to backtest"
                placeholder="TQQQ"
                inputClassName="uppercase"
                transformValue={(value) => value.toUpperCase()}
                className={cn("col-span-6", gridClasses)}
            />

            {/* Start Date */}
            <DateField
                name="startDate"
                control={control}
                label="Start Date"
                description="Backtest start date (MM/DD/YYYY)"
                className={cn("col-span-6", gridClasses, dateClasses)}
            />

            {/* End Date */}
            <DateField
                name="endDate"
                control={control}
                label="End Date"
                description="Backtest end date (MM/DD/YYYY)"
                className={cn("col-span-6", gridClasses, dateClasses)}
            />
        </>
    );
}
