import { GRID_TRADE_DEFAULT_CONFIG } from "@/utils/trading/algorithms/constants";
import { validateAlpacaCredentials } from "@/utils/alpaca/alpacaValidate";
import { getAlpacaEncryptionMasterKey } from "@/lib/alpacaMasterKey";
import { withApiAuth, readJsonBodyOr400 } from "@/lib/api-helpers";
import { encryptAlpacaCredentials } from "@/lib/alpacaEncryption";
import { getAgentsForDashboard } from "@/lib/agents-data";
import { TradingAgentStatus } from "@/lib/domain";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createBodySchema = z.object({
  name: z.string().min(1).max(200),
  symbol: z.string().min(1).max(20).toUpperCase(),
  alpacaKeyId: z.string().transform((s) => s.trim()).pipe(z.string().min(1, "API key is required")),
  alpacaSecretKey: z.string().transform((s) => s.trim()).pipe(z.string().min(1, "API secret is required")),
  strategyParams: z
    .object({
      capitalPct: z.number().optional(),
      buyBelowPct: z.number().optional(),
      sellAbovePct: z.number().optional(),
      buyAfterSellPct: z.number().optional(),
      cashFloor: z.number().optional(),
      orderGapPct: z.number().optional(),
    })
    .optional(),
});

export async function GET() {
  return withApiAuth(async (user) => {
    const data = await getAgentsForDashboard(user.id);
    return NextResponse.json(data);
  });
}

export async function POST(request: Request) {
  return withApiAuth(async (user) => {
    const body = await readJsonBodyOr400(request);
    if (body instanceof Response) return body;

    const parsed = createBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      name,
      symbol,
      alpacaKeyId,
      alpacaSecretKey,
      strategyParams: customParams,
    } = parsed.data;

    const validation = await validateAlpacaCredentials(
      alpacaKeyId,
      alpacaSecretKey
    );

    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { alpacaAccountId, accountType: alpacaAccountType } = validation;

    const existing = await prisma.tradingAgent.findUnique({
      where: { alpacaAccountId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This Alpaca account is already linked to another agent" },
        { status: 409 }
      );
    }

    const strategyParams = {
      ...GRID_TRADE_DEFAULT_CONFIG,
      ...(customParams ?? {}),
    };

    const masterKey = await getAlpacaEncryptionMasterKey();
    const alpacaEncrypted = encryptAlpacaCredentials(
      { keyId: alpacaKeyId, secret: alpacaSecretKey },
      masterKey
    );

    try {
      const agent = await prisma.tradingAgent.create({
        data: {
          userId: user.id,
          name,
          symbol,
          status: TradingAgentStatus.PAUSED,
          alpacaEncrypted,
          alpacaAccountId,
          alpacaAccountType,
          strategyParams: strategyParams as object,
          riskLimits: {},
        },
        select: { id: true, name: true, symbol: true, status: true },
      });

      return NextResponse.json(agent, { status: 201 });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        String((err as { code?: string }).code) === "P2002"
      ) {
        return NextResponse.json(
          { error: "This Alpaca account is already linked" },
          { status: 409 }
        );
      }
      throw err;
    }
  });
}
