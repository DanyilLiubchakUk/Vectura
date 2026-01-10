import { FormFieldWithTooltip } from "@/components/backtest/fields/form-field-with-tooltip";
import { FormControl, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

interface DateFieldProps<T extends FieldValues> {
    name: FieldPath<T>;
    control: Control<T>;
    label: string;
    description?: string;
    className?: string;
}

export function DateField<T extends FieldValues>({
    name,
    control,
    label,
    description,
    className,
}: DateFieldProps<T>) {
    return (
        <FormField
            control={control}
            name={name}
            render={({ field, fieldState }) => (
                <FormFieldWithTooltip
                    label={label}
                    description={description}
                    className={className}
                    hasError={!!fieldState.error}
                >
                    <FormControl>
                        <Input type="date" {...field} />
                    </FormControl>
                </FormFieldWithTooltip>
            )}
        />
    );
}
