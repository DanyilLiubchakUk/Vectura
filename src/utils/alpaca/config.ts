import type { AlpacaAccountType } from "@/lib/domain";

export const ALPACA_PAPER_BASE_URL =
  "https://paper-api.alpaca.markets" as const;

export const ALPACA_LIVE_BASE_URL =
  "https://api.alpaca.markets" as const;

export function getAlpacaBaseUrl(accountType: AlpacaAccountType): string {
  return accountType === "paper"
    ? ALPACA_PAPER_BASE_URL
    : ALPACA_LIVE_BASE_URL;
}
