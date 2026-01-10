import { formatDate } from "@/app/ranges/utils/date-helpers";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface SuggestionButtonsProps {
    type: "start" | "end";
    selectedDate: string;
    suggestions: { previous: string | null; next: string | null };
    onSuggestionClick: (date: string) => void;
}

export function SuggestionButtons({
    type,
    selectedDate,
    suggestions,
    onSuggestionClick,
}: SuggestionButtonsProps) {
    const hasSuggestions = suggestions.previous || suggestions.next;

    if (!hasSuggestions) return null;

    return (
        <div className="space-y-2 text-xs">
            <div className="flex items-start gap-2 text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div className="flex-1">
                    <p>
                        <span className="font-medium">
                            {formatDate(selectedDate)}
                        </span>{" "}
                        is a{" "}
                        <span className="font-medium">closed market day</span>.
                        Choose one of the nearest{" "}
                        <span className="font-medium">open trading days</span>:
                    </p>
                </div>
            </div>
            <div className="flex gap-2 flex-wrap items-center pl-5">
                {suggestions.previous && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-5 px-1 text-xs"
                        onClick={() => onSuggestionClick(suggestions.previous!)}
                    >
                        {formatDate(suggestions.previous)}
                    </Button>
                )}
                {suggestions.next && (
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-5 px-1 text-xs"
                        onClick={() => onSuggestionClick(suggestions.next!)}
                    >
                        {formatDate(suggestions.next)}
                    </Button>
                )}
            </div>
        </div>
    );
}
