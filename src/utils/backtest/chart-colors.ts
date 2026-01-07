export interface ChartThemeColors {
    background: string;
    text: string;
    grid: string;
    priceLine: string;
    buyLine: string;
    sellLine: string;
}

const lightThemeColors: ChartThemeColors = {
    background: "#ffffff",
    text: "#09090b",
    grid: "#e4e4e7",
    priceLine: "#09090b",
    buyLine: "#22c55e",
    sellLine: "#ef4444",
};

const darkThemeColors: ChartThemeColors = {
    background: "#18181b",
    text: "#fafafa",
    grid: "#ffffff1a",
    priceLine: "#fafafa",
    buyLine: "#22c55e",
    sellLine: "#ef4444",
};

export function getChartThemeColors(): ChartThemeColors {
    if (typeof window === "undefined") {
        // SSR fallback - use light theme
        return lightThemeColors;
    }

    const isDark = document.documentElement.classList.contains("dark");
    return isDark ? darkThemeColors : lightThemeColors;
}
