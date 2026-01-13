import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { executionModeOptions } from "@/components/backtest/defaults";
import { useFormContainer } from "@/contexts/form-container-context";
import { MEDIA_QUERY_BREAKPOINTS } from "@/constants/media-queries";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { FormField, FormDescription } from "@/components/ui/form";
import { useElementSize } from "@/hooks/use-element-size";
import { RadioGroup } from "@/components/ui/radio-group";
import { Cloud, ServerOff } from "lucide-react";
import { CircleIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BacktestFormValues } from "@/components/backtest/schema";
import type { Control } from "react-hook-form";

interface ExecutionModeFieldProps {
    control: Control<BacktestFormValues>;
}

const iconMap = [ServerOff, Cloud] as const;

export function ExecutionModeField({ control }: ExecutionModeFieldProps) {
    const containerRef = useFormContainer();
    const colSpanClasses = useElementSize(containerRef, [
        {
            operator: ">=",
            size: MEDIA_QUERY_BREAKPOINTS.MD,
            classes: "col-span-6",
        },
    ]);

    const descriptionClasses = useElementSize(containerRef, [
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
    ]);

    const tooltipClasses = useElementSize(containerRef, [
        {
            operator: "<",
            size: MEDIA_QUERY_BREAKPOINTS.MD,
            classes: "hidden",
        },
        {
            operator: ">=",
            size: MEDIA_QUERY_BREAKPOINTS.LG,
            classes: "hidden",
        },
    ]);

    return (
        <FormField
            control={control}
            name="executionMode"
            render={({ field, fieldState }) => (
                <div className={cn("self-center col-span-12", colSpanClasses)}>
                    <RadioGroup
                        className="flex gap-3"
                        value={field.value}
                        onValueChange={field.onChange}
                    >
                        {executionModeOptions.map((opt, i) => {
                            const Icon = iconMap[i];
                            const isChecked = field.value === opt.value;
                            return (
                                <Tooltip key={opt.value}>
                                    <TooltipTrigger asChild className="flex-1">
                                        <RadioGroupPrimitive.Item
                                            value={opt.value}
                                            className={cn(
                                                "cursor-pointer flex-col items-start justify-center relative rounded-md border p-2 shadow-xs outline-none transition-colors group flex-1",
                                                "border-input bg-input/20 dark:bg-input/30",
                                                "hover:bg-input/40 dark:hover:bg-input/50",
                                                "hover:border-ring/50",
                                                "focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2",
                                                isChecked && "border-primary/60 bg-input/30 dark:bg-input/40",
                                                isChecked && "hover:bg-input/40 dark:hover:bg-input/50"
                                            )}
                                        >
                                            <div className="flex justify-between w-full items-center">
                                                <div className="flex items-center gap-3 flex-1">
                                                    <Icon
                                                        className={cn(
                                                            "size-4 transition-colors",
                                                            isChecked
                                                                ? "text-primary"
                                                                : "text-muted-foreground",
                                                        )}
                                                    />
                                                    <span
                                                        className={cn(
                                                            "pr-3 transition-colors",
                                                            isChecked
                                                                ? "text-foreground font-medium"
                                                                : "text-muted-foreground"
                                                        )}
                                                    >
                                                        {opt.label}
                                                    </span>
                                                </div>
                                                <div className="shrink-0 aspect-square size-4 rounded-full border border-input text-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 relative flex items-center justify-center">
                                                    <RadioGroupPrimitive.Indicator className="relative flex items-center justify-center">
                                                        <CircleIcon className="fill-primary absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2" />
                                                    </RadioGroupPrimitive.Indicator>
                                                </div>
                                            </div>
                                            <FormDescription
                                                className={cn(
                                                    "text-xs transition-colors text-start mt-2",
                                                    descriptionClasses,
                                                    isChecked
                                                        ? "text-foreground/70"
                                                        : "text-muted-foreground"
                                                )}
                                            >
                                                {opt.description}
                                            </FormDescription>
                                        </RadioGroupPrimitive.Item>
                                    </TooltipTrigger>
                                    <TooltipContent className={tooltipClasses}>
                                        <p>{opt.description}</p>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </RadioGroup>
                    {fieldState.error && (
                        <p className="text-destructive text-xs mt-1">
                            {fieldState.error.message}
                        </p>
                    )}
                </div>
            )}
        />
    );
}
