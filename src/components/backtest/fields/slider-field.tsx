import { FormFieldWithTooltip } from "@/components/backtest/fields/form-field-with-tooltip";
import { FormControl, FormField, FormDescription } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

interface SliderFieldProps<T extends FieldValues> {
    name: FieldPath<T>;
    control: Control<T>;
    label: string;
    description?: string;
    min: number;
    max: number;
    step?: number;
    className?: string;
}

export function SliderField<T extends FieldValues>({
    name,
    control,
    label,
    description,
    min,
    max,
    step = 0.1,
    className,
}: SliderFieldProps<T>) {
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
                    <div className="flex gap-3 md:items-center flex-wrap flex-col md:flex-row">
                        <div className="flex gap-3 items-center">
                            <FormControl>
                                <Input
                                    type="number"
                                    min={min}
                                    max={max}
                                    step={step}
                                    className="w-20"
                                    {...field}
                                    onChange={(e) =>
                                        field.onChange(Number(e.target.value))
                                    }
                                />
                            </FormControl>
                            {description && (
                                <FormDescription className="sm:hidden text-xs">
                                    {description}
                                </FormDescription>
                            )}
                        </div>
                        <Slider
                            min={min}
                            max={max}
                            step={step}
                            value={[field.value]}
                            onValueChange={(values) =>
                                field.onChange(values[0])
                            }
                            className="flex-1"
                        />
                    </div>
                </FormFieldWithTooltip>
            )}
        />
    );
}
