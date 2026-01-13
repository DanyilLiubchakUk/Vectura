import { FormFieldWithTooltip } from "@/components/backtest/fields/form-field-with-tooltip";
import { FormControl, FormField, FormDescription } from "@/components/ui/form";
import { useFormContainer } from "@/contexts/form-container-context";
import { MEDIA_QUERY_BREAKPOINTS } from "@/constants/media-queries";
import { useElementSize } from "@/hooks/use-element-size";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import React from "react";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

interface SliderFieldProps<T extends FieldValues> {
    name: FieldPath<T>;
    control: Control<T>;
    switchComponent?: React.ReactNode | null;
    label: string;
    description?: string;
    min: number;
    max: number;
    step?: number;
    disabled?: boolean;
    className?: string;
}

export function SliderField<T extends FieldValues>({
    name,
    control,
    label,
    switchComponent = null,
    description,
    min,
    max,
    step = 0.1,
    disabled = false,
    className,
}: SliderFieldProps<T>) {
    const containerRef = useFormContainer();
    const sliderClasses = useElementSize(containerRef || { current: null }, [
        {
            operator: ">=",
            size: MEDIA_QUERY_BREAKPOINTS.MD,
            classes: "items-center flex-row",
        },
        {
            operator: ">=",
            size: MEDIA_QUERY_BREAKPOINTS.LG,
            classes: "items-start flex-col",
        },
    ]);

    const descriptionClasses = useElementSize(
        containerRef || { current: null },
        [
            {
                operator: ">=",
                size: MEDIA_QUERY_BREAKPOINTS.MD,
                classes: "hidden",
            },
            {
                operator: ">=",
                size: MEDIA_QUERY_BREAKPOINTS.LG,
                classes: "block",
            },
        ]
    );

    return (
        <FormField
            control={control}
            name={name}
            render={({ field, fieldState }) => (
                <FormFieldWithTooltip
                    label={label}
                    switchComponent={switchComponent}
                    description={description}
                    className={className}
                    hasError={!!fieldState.error}
                >
                    <div
                        className={cn(
                            "flex gap-3 flex-wrap flex-col",
                            sliderClasses
                        )}
                    >
                        <div className="flex gap-3 items-center">
                            <FormControl>
                                <Input
                                    type="number"
                                    min={min}
                                    max={max}
                                    step={step}
                                    className="w-20"
                                    disabled={disabled}
                                    {...field}
                                    onChange={(e) =>
                                        field.onChange(Number(e.target.value))
                                    }
                                />
                            </FormControl>
                            {description && (
                                <FormDescription
                                    className={cn(
                                        "text-xs",
                                        descriptionClasses
                                    )}
                                >
                                    {description}
                                </FormDescription>
                            )}
                        </div>
                        <div className="w-full">
                            <Slider
                                min={min}
                                max={max}
                                step={step}
                                value={[field.value]}
                                onValueChange={(values) =>
                                    field.onChange(values[0])
                                }
                                disabled={disabled}
                                className="w-full"
                            />
                        </div>
                    </div>
                </FormFieldWithTooltip>
            )}
        />
    );
}
