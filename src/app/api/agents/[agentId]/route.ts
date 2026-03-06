import { validateAlpacaCredentials } from "@/utils/alpaca/alpacaValidate";
import { getAlpacaEncryptionMasterKey } from "@/lib/alpacaMasterKey";
import { withApiAuth, readJsonBodyOr400 } from "@/lib/api-helpers";
import { encryptAlpacaCredentials } from "@/lib/alpacaEncryption";
import { getAgentDetail } from "@/lib/agents-data";
import { NextResponse } from "next/server";
import { isUuid } from "@/lib/validation";
import { prisma } from "@/lib/db";
import { z } from "zod";

const updateBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  symbol: z.string().min(1).max(20).toUpperCase().optional(),
  alpacaKeyId: z.string().transform((s) => s.trim()).optional(),
  alpacaSecretKey: z.string().transform((s) => s.trim()).optional(),
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  return withApiAuth(async (user) => {
    const { agentId } = await params;
    if (!isUuid(agentId)) {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
    }

    const data = await getAgentDetail(agentId, user.id);
    if (!data) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  return withApiAuth(async (user) => {
    const { agentId } = await params;
    if (!isUuid(agentId)) {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
    }

    const body = await readJsonBodyOr400(request);
    if (body instanceof Response) return body;

    const parsed = updateBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const existing = await prisma.tradingAgent.findFirst({
      where: { id: agentId, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    const updateData: {
      name?: string;
      symbol?: string;
      alpacaAccountType?: string;
      alpacaEncrypted?: string;
      alpacaAccountId?: string;
      strategyParams?: object;
      lastErrorAt?: null;
      lastErrorCode?: null;
    } = {};

    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.symbol !== undefined) updateData.symbol = parsed.data.symbol;
    if (parsed.data.strategyParams !== undefined)
      updateData.strategyParams = {
        ...(existing.strategyParams as object),
        ...parsed.data.strategyParams,
      };

    if (
      parsed.data.alpacaKeyId !== undefined &&
      parsed.data.alpacaSecretKey !== undefined
    ) {
      const keyId = parsed.data.alpacaKeyId.trim();
      const secret = parsed.data.alpacaSecretKey.trim();
      if (!keyId || !secret) {
        return NextResponse.json(
          { error: "Both API key and secret are required to update credentials" },
          { status: 400 }
        );
      }

      const validation = await validateAlpacaCredentials(keyId, secret);

      if (!validation.success) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }

      updateData.alpacaAccountType = validation.accountType;

      if (validation.alpacaAccountId !== existing.alpacaAccountId) {
        const conflict = await prisma.tradingAgent.findUnique({
          where: { alpacaAccountId: validation.alpacaAccountId },
        });
        if (conflict) {
          return NextResponse.json(
            { error: "This Alpaca account is already linked to another agent" },
            { status: 409 }
          );
        }
      }

      const masterKey = await getAlpacaEncryptionMasterKey();
      updateData.alpacaEncrypted = encryptAlpacaCredentials(
        { keyId, secret },
        masterKey
      );
      updateData.alpacaAccountId = validation.alpacaAccountId;
    }

    updateData.lastErrorAt = null;
    updateData.lastErrorCode = null;

    const agent = await prisma.tradingAgent.update({
      where: { id: agentId },
      data: updateData,
      select: {
        id: true,
        name: true,
        symbol: true,
        status: true,
        alpacaAccountType: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(agent);
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  return withApiAuth(async (user) => {
    const { agentId } = await params;
    if (!isUuid(agentId)) {
      return NextResponse.json({ error: "Invalid agent ID" }, { status: 400 });
    }

    const result = await prisma.tradingAgent.deleteMany({
      where: { id: agentId, userId: user.id },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  });
}
