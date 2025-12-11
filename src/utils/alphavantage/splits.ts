export interface AlphaVantageSplit {
    effective_date: string;
    split_factor: string;
}

export interface AlphaVantageSplitsResponse {
    "Meta Data"?: {
        symbol: string;
    };
    splits?: Record<string, AlphaVantageSplit>;
    "Error Message"?: string;
    Note?: string;
}

export async function fetchSplitsFromAlphaVantage(
    symbol: string
): Promise<Array<{ effective_date: string; split_factor: number }> | null> {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;

    if (!apiKey) {
        console.error(
            "[alphavantage] ALPHA_VANTAGE_API_KEY not found in environment"
        );
        return null;
    }

    const url = `https://www.alphavantage.co/query?function=SPLITS&symbol=${symbol}&apikey=${apiKey}`;

    try {
        const response = await fetch(url);
        const data: any = await response.json();

        if (data["Error Message"]) {
            console.error("[alphavantage] API error", {
                symbol,
                error: data["Error Message"],
            });
            return null;
        }

        if (data["Note"]) {
            console.error("[alphavantage] Rate limit or API note", {
                symbol,
                note: data["Note"],
            });
            return null;
        }

        let splitsArray: Array<{
            effective_date: string;
            split_factor: string;
        }> = [];

        if (data["Stock Splits"] && typeof data["Stock Splits"] === "object") {
            for (const [date, splitData] of Object.entries(
                data["Stock Splits"]
            )) {
                const split = splitData as AlphaVantageSplit;
                splitsArray.push({
                    effective_date: date,
                    split_factor: split.split_factor,
                });
            }
        } else if (data.splits && typeof data.splits === "object") {
            for (const [date, splitData] of Object.entries(data.splits)) {
                const split = splitData as AlphaVantageSplit;
                splitsArray.push({
                    effective_date: date,
                    split_factor: split.split_factor,
                });
            }
        } else if (Array.isArray(data.data)) {
            splitsArray = data.data;
        }

        if (splitsArray.length === 0) {
            console.log("[alphavantage] No splits found for", symbol);
            return [];
        }

        const result: Array<{ effective_date: string; split_factor: number }> =
            [];

        for (const splitItem of splitsArray) {
            const splitFactor = parseSplitFactor(splitItem.split_factor);
            if (splitFactor > 0) {
                result.push({
                    effective_date: splitItem.effective_date,
                    split_factor: splitFactor,
                });
            } else {
                console.warn("[alphavantage] Invalid split factor", {
                    symbol,
                    split_factor: splitItem.split_factor,
                });
            }
        }

        result.sort(
            (a, b) =>
                new Date(b.effective_date).getTime() -
                new Date(a.effective_date).getTime()
        );

        return result;
    } catch (error) {
        console.error("[alphavantage] Fetch error", { symbol, error });
        return null;
    }
}

function parseSplitFactor(splitFactorStr: string): number {
    if (!splitFactorStr || typeof splitFactorStr !== "string") {
        return 0;
    }

    const parts = splitFactorStr.split(":");
    if (parts.length === 2) {
        const numerator = parseFloat(parts[0]);
        const denominator = parseFloat(parts[1]);
        if (
            !isNaN(numerator) &&
            !isNaN(denominator) &&
            denominator > 0 &&
            numerator > 0
        ) {
            return numerator / denominator;
        }
    }

    const direct = parseFloat(splitFactorStr);
    if (!isNaN(direct) && direct > 0) {
        return direct;
    }

    return 0;
}
