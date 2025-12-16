import { FormFieldWithTooltip } from "@/components/backtest/fields/form-field-with-tooltip";
import { FormControl, FormField } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

interface TextInputFieldProps<T extends FieldValues> {
    name: FieldPath<T>;
    control: Control<T>;
    label: string;
    description?: string;
    placeholder?: string;
    type?: "text" | "number" | "email" | "password";
    step?: string;
    min?: number;
    max?: number;
    className?: string;
    inputClassName?: string;
    transformValue?: (value: string) => string | number;
}

export function TextInputField<T extends FieldValues>({
    name,
    control,
    label,
    description,
    placeholder,
    type = "text",
    step,
    min,
    max,
    className,
    inputClassName,
    transformValue,
}: TextInputFieldProps<T>) {
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
                        <Input
                            type={type}
                            placeholder={placeholder}
                            step={step}
                            min={min}
                            max={max}
                            className={inputClassName}
                            {...field}
                            onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(
                                    transformValue
                                        ? transformValue(value)
                                        : value
                                );
                            }}
                        />
                    </FormControl>
                </FormFieldWithTooltip>
            )}
        />
    );
}
