/**
 * Run one agent for one minute slot.
 * Claims (agent_id, minute_slot), loads agent, decrypts credentials,
 * syncs account snapshot from Alpaca, updates trade_executions.
 * Uses db-cli so it can run in Trigger.dev worker.
 *
 * Grid order placement (reconcile open orders, place with client_order_id,
 * write trade_history) can be added here next; idempotency is enforced by
 * UNIQUE(agent_id, minute_slot) and UNIQUE(agent_id, client_order_id).
 */
import { getAlpacaEncryptionMasterKey } from "@/lib/alpacaMasterKey";
import { decryptAlpacaCredentials } from "@/lib/alpacaEncryption";
import { getAlpacaBaseUrl } from "@/utils/alpaca/config";
import { TradingAgentStatus } from "@/lib/domain";
import Alpaca from "@alpacahq/alpaca-trade-api";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db-cli";
import type { AlpacaAccountType } from "@/lib/domain";

const EXECUTION_STATUS = {
  RUNNING: "RUNNING",
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
} as const;

function utcDayFromIso(ts: string): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function toDbDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

function assertAccountType(value: string): AlpacaAccountType {
  if (value === "paper" || value === "live") return value;
  return "live";
}

export type RunOneAgentResult =
  | { ok: true; executionId: string; ordersPlaced: number }
  | { ok: false; reason: string; executionId?: string };

/**
 * Run one agent for the given minute slot. Uses a single transaction for
 * slot claim and final update; strategy and Alpaca calls run outside the
 * transaction so we don't hold the connection. On failure we still update
 * the execution row to FAILED and commit (never leave RUNNING).
 */
export async function runOneAgent(
  agentId: string,
  minuteSlotIso: string,
  masterKey: Buffer,
): Promise<RunOneAgentResult> {
  let executionId: string | null = null;
  let ordersPlaced = 0;

  try {
    const slot = new Date(minuteSlotIso);

    try {
      const execution = await prisma.tradeExecution.create({
        data: {
          agentId,
          minuteSlot: slot,
          status: EXECUTION_STATUS.RUNNING,
        },
        select: { id: true },
      });
      executionId = execution.id;
    } catch (createErr: unknown) {
      const code = (createErr as { code?: string })?.code;
      if (code === "P2002") {
        return { ok: false, reason: "slot_already_claimed" };
      }
      throw createErr;
    }

    const agent = await prisma.tradingAgent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        status: true,
        symbol: true,
        alpacaEncrypted: true,
        alpacaAccountType: true,
        strategyParams: true,
      },
    });

    if (!agent || agent.status !== TradingAgentStatus.ACTIVE) {
      await prisma.tradeExecution.update({
        where: { id: executionId },
        data: {
          status: EXECUTION_STATUS.FAILED,
          finishedAt: new Date(),
          errorCode: "AGENT_INACTIVE_OR_MISSING",
          errorMessage: !agent ? "Agent not found" : "Agent not ACTIVE",
        },
      });
      return { ok: false, reason: "agent_inactive_or_missing", executionId };
    }

    const credentials = decryptAlpacaCredentials(agent.alpacaEncrypted, masterKey);
    const accountType = assertAccountType(agent.alpacaAccountType);
    const alpaca = new Alpaca({
      keyId: credentials.keyId,
      secretKey: credentials.secret,
      baseUrl: getAlpacaBaseUrl(accountType),
    });

    const account = await alpaca.getAccount();
    const equity = Number(account?.equity ?? 0);
    const cash = Number(account?.cash ?? 0);
    const daytradeCount = Number(account?.daytrade_count ?? 0);
    const day = utcDayFromIso(minuteSlotIso);
    const date = toDbDate(day);

    const existingSnapshot = await prisma.accountSnapshot.findUnique({
      where: { agentId_date: { agentId, date } },
      select: { equityMax: true, cashMax: true, sessionStart: true },
    });

    const equityMax = existingSnapshot
      ? Math.max(equity, existingSnapshot.equityMax.toNumber())
      : equity;
    const cashMax = existingSnapshot
      ? Math.max(cash, existingSnapshot.cashMax.toNumber())
      : cash;
    const sessionStart = existingSnapshot?.sessionStart ?? new Date(minuteSlotIso);

    await prisma.accountSnapshot.upsert({
      where: { agentId_date: { agentId, date } },
      create: {
        agentId,
        date,
        equity: new Prisma.Decimal(equity),
        cash: new Prisma.Decimal(cash),
        equityMax: new Prisma.Decimal(equityMax),
        cashMax: new Prisma.Decimal(cashMax),
        pdtDaytradeCount: daytradeCount,
        pdtDays: [] as unknown as Prisma.InputJsonValue,
        sessionStart,
        sessionEnd: new Date(minuteSlotIso),
      },
      update: {
        equity: new Prisma.Decimal(equity),
        cash: new Prisma.Decimal(cash),
        equityMax: new Prisma.Decimal(equityMax),
        cashMax: new Prisma.Decimal(cashMax),
        pdtDaytradeCount: daytradeCount,
        sessionEnd: new Date(minuteSlotIso),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = err instanceof Error ? (err as { code?: string }).code : undefined;
    if (executionId) {
      await prisma.tradeExecution.update({
        where: { id: executionId },
        data: {
          status: EXECUTION_STATUS.FAILED,
          finishedAt: new Date(),
          errorCode: code ?? "RUN_ERROR",
          errorMessage: message.slice(0, 500),
        },
      });
    }
    return {
      ok: false,
      reason: message,
      executionId: executionId ?? undefined,
    };
  }

  if (!executionId) return { ok: false, reason: "no_execution_id" };

  await prisma.tradeExecution.update({
    where: { id: executionId },
    data: {
      status: EXECUTION_STATUS.SUCCESS,
      finishedAt: new Date(),
      ordersPlaced,
    },
  });

  return { ok: true, executionId, ordersPlaced };
}
