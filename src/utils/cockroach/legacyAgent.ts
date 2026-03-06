import { GRID_TRADE_DEFAULT_CONFIG } from "@/utils/trading/algorithms/constants";
import { TRADE_SYMBOL } from "@/auto-trade/constants";
import { TradingAgentStatus } from "@/lib/domain";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const LEGACY_USER_ID = "legacy-system";

function inferAccountTypeFromBaseUrl(baseUrl: string | undefined): "paper" | "live" {
  const url = (baseUrl ?? "").toLowerCase();
  if (url.includes("paper")) return "paper";
  return "live";
}

export async function ensureLegacyAgent(): Promise<{
  agentId: string;
  symbol: string;
}> {
  const keyId = process.env.APCA_API_KEY_ID;
  if (!keyId) {
    throw new Error("APCA_API_KEY_ID is not set (legacy auto-trade)");
  }

  const alpacaAccountId = `env:${keyId}`;
  const alpacaAccountType = inferAccountTypeFromBaseUrl(
    process.env.APCA_API_BASE_URL
  );

  await prisma.user.upsert({
    where: { userId: LEGACY_USER_ID },
    create: { userId: LEGACY_USER_ID, email: null, name: "Legacy system" },
    update: {},
  });

  const agent = await prisma.tradingAgent.upsert({
    where: { alpacaAccountId },
    create: {
      userId: LEGACY_USER_ID,
      name: "Legacy AutoTrade",
      status: TradingAgentStatus.ACTIVE,
      symbol: TRADE_SYMBOL,
      alpacaEncrypted: "ENV",
      alpacaAccountId,
      alpacaAccountType,
      strategyParams: GRID_TRADE_DEFAULT_CONFIG as unknown as Prisma.InputJsonValue,
      riskLimits: {} as unknown as Prisma.InputJsonValue,
    },
    update: {
      symbol: TRADE_SYMBOL,
      alpacaAccountType,
      // Keep strategyParams/riskLimits as-is; only set defaults on creation.
    },
    select: { id: true, symbol: true },
  });

  return { agentId: agent.id, symbol: agent.symbol };
}
