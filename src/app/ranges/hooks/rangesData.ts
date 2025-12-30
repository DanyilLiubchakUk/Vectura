import { API_BASE } from "@/app/ranges/constants";
import { useState, useEffect } from "react";
import type { SymbolRange } from "@/backtest/types";
import type { RangeItem } from "@/app/ranges/types";

export function useRanges() {
    const [ranges, setRanges] = useState<RangeItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadRanges = async () => {
        try {
            setLoading(true);
            const response = await fetch(API_BASE);
            const result = await response.json();
            if (result.data) {
                setRanges(result.data.map((r: SymbolRange) => ({ ...r })));
            }
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRanges();
    }, []);

    const handleDelete = async (symbol: string) => {
        try {
            const response = await fetch(API_BASE, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    operation: "deleteSymbol",
                    symbol,
                }),
            });

            if (response.ok) {
                await loadRanges();
            }
        } catch (error) {
            // Handle error silently
        }
    };

    return {
        ranges,
        setRanges,
        loading,
        loadRanges,
        handleDelete,
    };
}
