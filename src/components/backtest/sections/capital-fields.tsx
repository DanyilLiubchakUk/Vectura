import { FormFieldWithTooltip } from "@/components/backtest/fields/form-field-with-tooltip";
import { TextInputField } from "@/components/backtest/fields/text-input-field";
import { useFormContainer } from "@/contexts/form-container-context";
import { MEDIA_QUERY_BREAKPOINTS } from "@/constants/media-queries";
import { FormField, FormControl } from "@/components/ui/form";
import { useElementSize } from "@/hooks/use-element-size";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BacktestFormValues } from "@/components/backtest/schema";
import type { Control } from "react-hook-form";

interface CapitalFieldsProps {
    control: Control<BacktestFormValues>;
}

export function CapitalFields({ control }: CapitalFieldsProps) {
    const containerRef = useFormContainer();
    const gridClasses = useElementSize(containerRef, [
        {
            operator: ">=",
            size: MEDIA_QUERY_BREAKPOINTS.MD,
            classes: "col-span-3",
        },
    ]);

    return (
        <>
            {/* Starting Capital */}
            <TextInputField
                name="startCapital"
                control={control}
                label="Starting Capital"
                description="Initial investment amount in USD"
                placeholder="1000"
                type="number"
                step="1"
                className={cn("col-span-6", gridClasses)}
            />

            {/* Cash Floor */}
            <TextInputField
                name="cashFloor"
                control={control}
                label="Cash Floor ($)"
                description="Dollar amount cash floor to maintain"
                placeholder="200"
                type="number"
                step="1"
                min={0}
                transformValue={(value) => Number(value)}
                className={cn("col-span-6", gridClasses)}
            />

            {/* Contribution Frequency */}
            <FormField
                control={control}
                name="contributionFrequencyDays"
                render={({ field, fieldState }) => (
                    <FormFieldWithTooltip
                        label="Contribution Frequency (Days)"
                        description="How often to add funds"
                        hasError={!!fieldState.error}
                        className={cn("col-span-6", gridClasses)}
                    >
                        <FormControl>
                            <Input
                                type="number"
                                placeholder="7"
                                step="1"
                                min="0"
                                {...field}
                                value={field.value === null || field.value === undefined || isNaN(field.value) ? "" : String(field.value)}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "") {
                                        field.onChange(NaN);
                                    } else {
                                        const numValue = Number(value);
                                        field.onChange(isNaN(numValue) ? NaN : numValue);
                                    }
                                }}
                            />
                        </FormControl>
                    </FormFieldWithTooltip>
                )}
            />

            {/* Contribution Amount */}
            <FormField
                control={control}
                name="contributionAmount"
                render={({ field, fieldState }) => (
                    <FormFieldWithTooltip
                        label="Contribution Amount"
                        description="Amount to contribute each time"
                        hasError={!!fieldState.error}
                        className={cn("col-span-6", gridClasses)}
                    >
                        <FormControl>
                            <Input
                                type="number"
                                placeholder="500"
                                step="1"
                                min="0"
                                {...field}
                                value={field.value === null || field.value === undefined || isNaN(field.value) ? "" : String(field.value)}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value === "") {
                                        field.onChange(NaN);
                                    } else {
                                        const numValue = Number(value);
                                        field.onChange(isNaN(numValue) ? NaN : numValue);
                                    }
                                }}
                            />
                        </FormControl>
                    </FormFieldWithTooltip>
                )}
            />
        </>
    );
}
