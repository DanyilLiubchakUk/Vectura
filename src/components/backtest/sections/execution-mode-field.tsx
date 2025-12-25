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
                            return (
                                <Tooltip key={opt.value}>
                                    <TooltipTrigger asChild className="flex-1">
                                        <Label
                                            htmlFor={`execution-mode-${opt.value}`}
                                            className="flex-col items-start justify-center has-data-[state=checked]:border-primary/50 has-data-[state=checked]:bg-input/20 has-data-[state=checked]:dark:bg-input/30 relative rounded-md border p-2 shadow-xs outline-none transition-colors data-[state=checked]:border-primary/60 group"
                                        >
                                            <div className="flex justify-between w-full">
                                                <div className="flex items-center gap-3">
                                                    <Icon className="size-4 group-[has-data-[state=checked]]:text-muted-foreground" />
                                                    <span className="pr-3">
                                                        {opt.label}
                                                    </span>
                                                </div>
                                                <RadioGroupItem
                                                    value={opt.value}
                                                    id={`execution-mode-${opt.value}`}
                                                    aria-label={opt.value}
                                                />
                                            </div>
                                            <FormDescription
                                                className={cn(
                                                    "text-xs",
                                                    descriptionClasses
                                                )}
                                            >
                                                {opt.description}
                                            </FormDescription>
                                        </Label>
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
