import {
    FormItem,
    FormLabel,
    FormDescription,
    FormMessage,
} from "@/components/ui/form";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { useFormContainer } from "@/contexts/form-container-context";
import { MEDIA_QUERY_BREAKPOINTS } from "@/constants/media-queries";
import { useElementSize } from "@/hooks/use-element-size";
import { InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Control, FieldPath, FieldValues } from "react-hook-form";

interface FormFieldWithTooltipProps<T extends FieldValues> {
    name: FieldPath<T>;
    control: Control<T>;
    label: string;
    description?: string;
    className?: string;
    children: React.ReactNode;
    hasError?: boolean;
}

export function FormFieldWithTooltip<T extends FieldValues>({
    label,
    description,
    className,
    children,
    hasError = false,
}: Omit<FormFieldWithTooltipProps<T>, "name" | "control">) {
    const containerRef = useFormContainer();
    const iconClasses = useElementSize(containerRef || { current: null }, [
        {
            operator: ">=",
            size: MEDIA_QUERY_BREAKPOINTS.MD,
            classes: "block",
        },
        {
            operator: ">=",
            size: MEDIA_QUERY_BREAKPOINTS.LG,
            classes: "hidden",
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
        <FormItem className={className}>
            <div className="flex items-center gap-2">
                <FormLabel className="flex items-center gap-2">
                    {label}
                </FormLabel>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <InfoIcon
                            className={cn(
                                "h-4 w-4 hover:text-foreground hidden cursor-help",
                                iconClasses,
                                hasError
                                    ? "text-destructive hover:text-destructive/50"
                                    : "text-muted-foreground"
                            )}
                        />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{description}</p>
                    </TooltipContent>
                </Tooltip>
            </div>
            {children}
            {description && (
                <FormDescription
                    className={cn(
                        "[[data-slot=form-item]:has([data-slot=slider])_&]:hidden text-xs",
                        descriptionClasses
                    )}
                >
                    {description}
                </FormDescription>
            )}
            <FormMessage className="text-xs" />
        </FormItem>
    );
}
