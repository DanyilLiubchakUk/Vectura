import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { executionModeOptions } from "@/components/backtest/defaults";
import { useFormContainer } from "@/contexts/form-container-context";
import { MEDIA_QUERY_BREAKPOINTS } from "@/constants/media-queries";
import { FormField, FormDescription } from "@/components/ui/form";
import { useElementSize } from "@/hooks/use-element-size";
import { Cloud, ServerOff } from "lucide-react";
import { Label } from "@/components/ui/label";
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
                            const radioId = `execution-mode-${opt.value}`;
                            return (
                                <Tooltip key={opt.value}>
                                    <div className="flex-1">
                                        <TooltipTrigger asChild>
                                            <div
                                                className={cn(
                                                    "cursor-pointer flex-col items-start justify-center relative rounded-md border p-2 shadow-xs outline-none transition-colors group flex-1",
                                                    "border-input bg-input/20 dark:bg-input/30",
                                                    "hover:bg-input/40 dark:hover:bg-input/50",
                                                    "hover:border-ring/50",
                                                    isChecked && "border-primary/60 bg-input/30 dark:bg-input/40",
                                                    isChecked && "hover:bg-input/40 dark:hover:bg-input/50"
                                                )}
                                            >
                                                <div className="flex items-start gap-2">
                                                    <Label
                                                        htmlFor={radioId}
                                                        className="flex flex-col items-start flex-1 cursor-pointer"
                                                    >
                                                        <div className="flex items-center gap-3 w-full">
                                                            <Icon
                                                                className={cn(
                                                                    "size-4 transition-colors",
                                                                    isChecked
                                                                        ? "text-primary"
                                                                        : "text-muted-foreground"
                                                                )}
                                                            />
                                                            <span
                                                                className={cn(
                                                                    "transition-colors font-medium",
                                                                    isChecked
                                                                        ? "text-foreground"
                                                                        : "text-muted-foreground"
                                                                )}
                                                            >
                                                                {opt.label}
                                                            </span>
                                                        </div>
                                                        <FormDescription
                                                            className={cn(
                                                                "text-xs transition-colors mt-1",
                                                                descriptionClasses,
                                                                isChecked
                                                                    ? "text-foreground/70"
                                                                    : "text-muted-foreground"
                                                            )}
                                                        >
                                                            {opt.description}
                                                        </FormDescription>
                                                    </Label>
                                                    <RadioGroupItem
                                                        value={opt.value}
                                                        id={radioId}
                                                        aria-label={opt.value}
                                                        className="shrink-0 mt-0.5"
                                                    />
                                                </div>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent className={tooltipClasses}>
                                            <p>{opt.description}</p>
                                        </TooltipContent>
                                    </div>
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
