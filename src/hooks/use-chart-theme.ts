import { getChartThemeColors, type ChartThemeColors } from "@/utils/backtest/chart-colors";
import { useState, useEffect } from "react";

/**
 * Hook that tracks chart theme colors and updates when theme changes
 */
export function useChartTheme(): ChartThemeColors {
    const [themeColors, setThemeColors] = useState<ChartThemeColors>(getChartThemeColors());

    useEffect(() => {
        const observer = new MutationObserver(() => {
            setThemeColors(getChartThemeColors());
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ["class"],
        });

        return () => observer.disconnect();
    }, []);

    return themeColors;
}
