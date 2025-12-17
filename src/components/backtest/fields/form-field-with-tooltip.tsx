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
                                "h-4 w-4 hover:text-foreground hidden sm:block cursor-help",
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
                <FormDescription className="[[data-slot=form-item]:has([data-slot=slider])_&]:hidden text-xs">
                    {description}
                </FormDescription>
            )}
            <FormMessage className="text-xs" />
        </FormItem>
    );
}
