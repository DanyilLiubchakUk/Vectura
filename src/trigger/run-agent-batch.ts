/**
 * Batch job task. Receives { agent_ids, minute_slot }, runs runOneAgent
 * for each agent via Promise.allSettled. Uses one Prisma client (db-cli) and
 * cached master key per process.
 */
import { getAlpacaEncryptionMasterKey } from "@/lib/alpacaMasterKey";
import { logger, task } from "@trigger.dev/sdk";
import { runOneAgent } from "./runOneAgent";

const BATCH_PAYLOAD_SCHEMA = {
  agent_ids: [] as string[],
  minute_slot: "",
} as const;

export const runAgentBatch = task({
  id: "run-agent-batch",
  maxDuration: 180,
  run: async (payload: { agent_ids: string[]; minute_slot: string }) => {
    const agentIds = payload.agent_ids ?? BATCH_PAYLOAD_SCHEMA.agent_ids;
    const minuteSlot = payload.minute_slot ?? BATCH_PAYLOAD_SCHEMA.minute_slot;

    if (!minuteSlot || !Array.isArray(agentIds) || agentIds.length === 0) {
      logger.log("run-agent-batch: missing minute_slot or empty agent_ids", {
        minute_slot: minuteSlot,
        count: agentIds?.length ?? 0,
      });
      return { enqueued: 0, succeeded: 0, failed: 0, skipped: 0 };
    }

    const masterKey = await getAlpacaEncryptionMasterKey();
    const results = await Promise.allSettled(
      agentIds.map((agentId) => runOneAgent(agentId, minuteSlot, masterKey)),
    );

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    for (const r of results) {
      if (r.status === "fulfilled") {
        if (r.value.ok) succeeded++;
        else if (r.value.reason === "slot_already_claimed") skipped++;
        else failed++;
      } else failed++;
    }

    logger.log("run-agent-batch: finished", {
      minute_slot: minuteSlot,
      total: agentIds.length,
      succeeded,
      failed,
      skipped,
    });

    return {
      minute_slot: minuteSlot,
      total: agentIds.length,
      succeeded,
      failed,
      skipped,
    };
  },
});
