import { FormFieldWithTooltip } from "@/components/backtest/fields/form-field-with-tooltip";
import { TextInputField } from "@/components/backtest/fields/text-input-field";
import { FormField, FormControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useWatch } from "react-hook-form";
import type { BacktestFormValues } from "@/components/backtest/schema";
import type { Control } from "react-hook-form";

interface CapitalFieldsProps {
    control: Control<BacktestFormValues>;
}

export function CapitalFields({ control }: CapitalFieldsProps) {
    const contributionFrequencyDays = useWatch({
        control,
        name: "contributionFrequencyDays",
    });

    const showContributionAmount =
        contributionFrequencyDays !== undefined &&
        Number(contributionFrequencyDays) > 0;

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
            />

            {/* Contribution Frequency */}
            <FormField
                control={control}
                name="contributionFrequencyDays"
                render={({ field, fieldState }) => (
                    <FormFieldWithTooltip
                        label="Contribution Frequency (Days)"
                        description="How often to add funds (0 to disable)"
                        hasError={!!fieldState.error}
                    >
                        <FormControl>
                            <Input
                                type="number"
                                placeholder="7"
                                step="1"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    field.onChange(
                                        value === "" ? undefined : Number(value)
                                    );
                                }}
                            />
                        </FormControl>
                    </FormFieldWithTooltip>
                )}
            />

            {/* Contribution Amount */}
            {showContributionAmount && (
                <FormField
                    control={control}
                    name="contributionAmount"
                    render={({ field, fieldState }) => (
                        <FormFieldWithTooltip
                            label="Contribution Amount"
                            description="Amount to contribute each period"
                            hasError={!!fieldState.error}
                        >
                            <FormControl>
                                <Input
                                    type="number"
                                    placeholder="500"
                                    step="1"
                                    {...field}
                                    value={field.value ?? ""}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        field.onChange(
                                            value === ""
                                                ? undefined
                                                : Number(value)
                                        );
                                    }}
                                />
                            </FormControl>
                        </FormFieldWithTooltip>
                    )}
                />
            )}
        </>
    );
}
