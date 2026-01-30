import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckListItemProps {
    children: React.ReactNode;
    className?: string;
}

export function CheckListItem({
    children,
    className,
}: CheckListItemProps) {
    return (
        <li className={cn("flex items-start gap-2", className)}>
            <CheckCircle2
                className="h-4 w-4 mt-0.5 shrink-0 text-primary"
            />
            <span>{children}</span>
        </li>
    );
}
