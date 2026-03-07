import { getMarketClock } from "@/utils/alpaca/getTradingData";
import { logger, schedules } from "@trigger.dev/sdk";
import { TradingAgentStatus } from "@/lib/domain";
import { runAgentBatch } from "./run-agent-batch";
import { prisma } from "@/lib/db-cli";

const BATCH_SIZE = 30;
const MAX_AGENTS_PER_CRON = 10_000;

/** Doc 06: rough window 14–20 UTC, Mon–Fri (avoids calling Alpaca when clearly outside). */
function isWithinRoughMarketWindow(utcDate: Date): boolean {
  const utcHour = utcDate.getUTCHours();
  const utcDay = utcDate.getUTCDay(); // 0 Sun .. 6 Sat
  return utcHour >= 14 && utcHour <= 20 && utcDay >= 1 && utcDay <= 5;
}

/**
 * Uses Alpaca market clock (half-days, holidays). Returns true only when market is open.
 * On API error or missing credentials, returns null and we fall back to rough window.
 */
async function isMarketOpenFromAlpaca(): Promise<boolean | null> {
  const clock = await getMarketClock();
  if (!clock.success || !clock.data) return null;
  return clock.data.is_open;
}

/**
 * Cron runs every market minute. Queries ACTIVE agents, batches into
 * chunks of BATCH_SIZE, enqueues one run-agent-batch job per chunk.
 */
export const schedule = schedules.task({
  id: "auto-trade",
  cron: "* 14-20 * * 1-5",
  maxDuration: 180,
  run: async (payload) => {
    const minuteSlot = payload.timestamp.toISOString();
    const runTime = payload.timestamp;

    if (!isWithinRoughMarketWindow(runTime)) {
      logger.log("Outside rough market window; skipping enqueue", {
        timestamp: minuteSlot,
      });
      return {
        success: true,
        message: "Outside market window",
        timestamp: minuteSlot,
        batchesEnqueued: 0,
        totalAgents: 0,
      };
    }

    const marketOpen = await isMarketOpenFromAlpaca();
    if (marketOpen === false) {
      logger.log("Alpaca market clock: market closed; skipping enqueue", {
        timestamp: minuteSlot,
      });
      return {
        success: true,
        message: "Market is not open (Alpaca clock)",
        timestamp: minuteSlot,
        batchesEnqueued: 0,
        totalAgents: 0,
      };
    }
    if (marketOpen === null) {
      logger.log("Alpaca clock unavailable; using rough window only", {
        timestamp: minuteSlot,
      });
    }

    try {
      const rows = await prisma.tradingAgent.findMany({
        where: { status: TradingAgentStatus.ACTIVE },
        select: { id: true },
        take: MAX_AGENTS_PER_CRON,
      });
      const agentIds = rows.map((r) => r.id);

      if (agentIds.length === 0) {
        logger.log("No ACTIVE agents; skipping enqueue", {
          timestamp: minuteSlot,
        });
        return {
          success: true,
          message: "No ACTIVE agents",
          timestamp: minuteSlot,
          batchesEnqueued: 0,
          totalAgents: 0,
        };
      }

      const chunks: string[][] = [];
      for (let i = 0; i < agentIds.length; i += BATCH_SIZE) {
        chunks.push(agentIds.slice(i, i + BATCH_SIZE));
      }

      for (const chunk of chunks) {
        await runAgentBatch.trigger({ agent_ids: chunk, minute_slot: minuteSlot });
      }

      logger.log("Enqueued agent batches", {
        timestamp: minuteSlot,
        batchesEnqueued: chunks.length,
        totalAgents: agentIds.length,
      });

      return {
        success: true,
        message: `Enqueued ${chunks.length} batches (${agentIds.length} agents)`,
        timestamp: minuteSlot,
        batchesEnqueued: chunks.length,
        totalAgents: agentIds.length,
      };
    } catch (error) {
      logger.log("Failure in auto-trade schedule", { error, timestamp: minuteSlot });
      return {
        success: false,
        message:
          error instanceof Error ? error.message : "Schedule run failed",
        timestamp: minuteSlot,
        batchesEnqueued: 0,
        totalAgents: 0,
      };
    }
  },
});
