import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const url = process.env.COCKROACH_DATABASE_URL;
if (!url) {
  console.error("COCKROACH_DATABASE_URL is not set");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

async function getLegacyAgentId(): Promise<string> {
  const agent = await prisma.tradingAgent.findFirst({
    where: { name: "Legacy AutoTrade" },
    select: { id: true },
  });
  if (!agent) {
    throw new Error(
      'No agent named "Legacy AutoTrade" found. Create one by running the app (e.g. trigger job), or pass an agent ID: npm run agents:print-state <agentId>',
    );
  }
  return agent.id;
}

async function main() {
  const [, , maybeAgentId] = process.argv;

  const agentId =
    maybeAgentId && maybeAgentId.trim().length > 0
      ? maybeAgentId
      : await getLegacyAgentId();

  const agent = await prisma.tradingAgent.findUnique({
    where: { id: agentId },
    include: {
      accountSnapshots: {
        orderBy: { date: "desc" },
        take: 1,
      },
      tradeHistories: {
        orderBy: { timestamp: "desc" },
        take: 1,
      },
    },
  });

  if (!agent) {
    console.error(`Agent not found for id: ${agentId}`);
    process.exit(1);
  }

  const latestSnapshot = agent.accountSnapshots[0] ?? null;
  const lastTrade = agent.tradeHistories[0] ?? null;

  console.log("Agent");
  console.log({
    id: agent.id,
    name: agent.name,
    status: agent.status,
    symbol: agent.symbol,
    alpacaAccountType: agent.alpacaAccountType,
    createdAt: agent.createdAt.toISOString(),
  });

  console.log("Latest snapshot");
  console.log(
    latestSnapshot
      ? {
        date: latestSnapshot.date.toISOString().slice(0, 10),
        equity: latestSnapshot.equity.toNumber(),
        cash: latestSnapshot.cash.toNumber(),
        equityMax: latestSnapshot.equityMax.toNumber(),
        cashMax: latestSnapshot.cashMax.toNumber(),
        pdtDaytradeCount: latestSnapshot.pdtDaytradeCount,
      }
      : null,
  );

  console.log("Last trade");
  console.log(
    lastTrade
      ? {
        tradeId: lastTrade.tradeId,
        timestamp: lastTrade.timestamp.toISOString(),
        side: lastTrade.side,
        qty: lastTrade.qty.toNumber(),
        price: lastTrade.price.toNumber(),
      }
      : null,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
    process.exit(1);
  });
