export const TradingAgentStatus = {
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  ERROR: "ERROR",
} as const;

export type TradingAgentStatus =
  (typeof TradingAgentStatus)[keyof typeof TradingAgentStatus];

export const AlpacaAccountType = {
  paper: "paper",
  live: "live",
} as const;

export type AlpacaAccountType =
  (typeof AlpacaAccountType)[keyof typeof AlpacaAccountType];
