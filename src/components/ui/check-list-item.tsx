import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckListItemProps {
    children: React.ReactNode;
    variant?: "default" | "primary" | "success";
    className?: string;
}

export function CheckListItem({
    children,
    variant = "default",
    className,
}: CheckListItemProps) {
    return (
        <li className={cn("flex items-start gap-2", className)}>
            <CheckCircle2
                className={cn(
                    "h-4 w-4 mt-0.5 shrink-0",
                    variant === "primary"
                        ? "text-primary"
                        : variant === "success"
                        ? "text-green-600"
                        : "text-muted-foreground"
                )}
            />
            <span>{children}</span>
        </li>
    );
}
