export interface ChartThemeColors {
    background: string;
    text: string;
    grid: string;
    priceLine: string;
    buyLine: string;
    sellLine: string;
    equityLine: string;
    cashLine: string;
}

const lightThemeColors: ChartThemeColors = {
    background: "#ffffff",
    text: "#292524", //stone-800
    grid: "#e4e4e7",
    priceLine: "#292524", //stone-800
    buyLine: "#009966", //emerald-600
    sellLine: "#e7000bb3", //red-600~70%
    equityLine: "#155dfc", //blue-600
    cashLine: "#d08700", //yellow-600
};

const darkThemeColors: ChartThemeColors = {
    background: "#18181b",
    text: "#d6d3d1", //stone-300
    grid: "#ffffff1a",
    priceLine: "#d6d3d1", //stone-300
    buyLine: "#00bc7d", //emerald-500
    sellLine: "#fb2c36b3", //red-500~70%
    equityLine: "#2b7fff", //blue-500
    cashLine: "#efb100", //yellow-500
};

export function getChartThemeColors(): ChartThemeColors {
    if (typeof window === "undefined") {
        // SSR fallback - use light theme
        return lightThemeColors;
    }

    const isDark = document.documentElement.classList.contains("dark");
    return isDark ? darkThemeColors : lightThemeColors;
}
