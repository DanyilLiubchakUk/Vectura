import { withApiAuth, readJsonBodyOr400 } from "@/lib/api-helpers";
import { TradingAgentStatus } from "@/lib/domain";
import { NextResponse } from "next/server";
import { isUuid } from "@/lib/validation";
import { prisma } from "@/lib/db";
import { z } from "zod";

const bodySchema = z.object({
  status: z.enum(
    [TradingAgentStatus.ACTIVE, TradingAgentStatus.PAUSED] as const
  ),
});

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

    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid status", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await prisma.tradingAgent.updateMany({
      where: { id: agentId, userId: user.id },
      data: {
        status: parsed.data.status,
        lastErrorAt: null,
        lastErrorCode: null,
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({ status: parsed.data.status });
  });
}
