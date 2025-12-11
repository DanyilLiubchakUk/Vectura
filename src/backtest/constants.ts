export const MINUTE_BAR_BATCH_SIZE = Number(
    process.env.MINUTE_BAR_BATCH_SIZE ?? 10
);
export const DAYS_BEFORE_TODAY = Number(process.env.DAYS_BEFORE_TODAY ?? 10);
export const BINARY_SEARCH_MAX_ITERATIONS = 16

// TIME_BETWEEN_BATCHES controls how many milliseconds we wait between API batches to avoid rate limiting.
// If your computer is very fast (high computation power), you should use a higher value (up to 300ms) because it processes batches quickly and could hit the rate limit if requests are sent too rapidly.
// If your computer is slow (low computation power), it will take longer to compute each batch, so you can use a lower value (down to 150ms) to avoid unnecessary waiting.
// In testing, 150ms works for very slow computers, 300ms is the safest for the fastest computers, and 200ms is optimal for most cases.
export const TIME_BETWEEN_BATCHES = Number(
    process.env.TIME_BETWEEN_BATCHES ?? 200
);
export const CHUNK_MONTHS = 3;
export const FETCH_LIMIT = Number(process.env.FETCH_LIMIT ?? 696 * 1.5);

export const MARKET_OPEN_HOUR_UTC = 14;
export const MARKET_OPEN_MINUTE_UTC = 30;
export const MARKET_CLOSE_HOUR_UTC = 21;

export const PERCENT_GAP_TO_JOIN = 1.5; // Lower number - slower,more buys. Higher number - faster, less buys
