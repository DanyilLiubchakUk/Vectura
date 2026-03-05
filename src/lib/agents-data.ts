import "server-only";

import { prisma } from "@/lib/db";

export type AgentsListPayload = {
  overall: {
    totalAgents: number;
    activeAgents: number;
    pausedAgents: number;
    errorAgents: number;
    liveAgents: number;
    paperAgents: number;
  };
  agents: Array<{
    id: string;
    name: string;
    status: string;
    symbol: string;
    alpacaAccountType: string;
    createdAt: string;
    latestSnapshot: {
      date: string;
      equity: number;
      cash: number;
      equityMax: number;
      cashMax: number;
      pdtDaytradeCount: number;
      sessionStart: string | null;
      sessionEnd: string | null;
    } | null;
    lastTradeAt: string | null;
  }>;
};

export async function getAgentsForDashboard(): Promise<AgentsListPayload> {
  const agents = await prisma.tradingAgent.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      symbol: true,
      alpacaAccountType: true,
      createdAt: true,
    },
  });

  const agentIds = agents.map((a) => a.id);

  const snapshots =
    agentIds.length === 0
      ? []
      : await prisma.accountSnapshot.findMany({
        where: { agentId: { in: agentIds } },
        orderBy: [{ agentId: "asc" }, { date: "desc" }],
      });

  const lastSnapshots = new Map<string, (typeof snapshots)[number]>();
  for (const snap of snapshots) {
    if (!lastSnapshots.has(snap.agentId)) {
      lastSnapshots.set(snap.agentId, snap);
    }
  }

  const lastTrades =
    agentIds.length === 0
      ? []
      : await prisma.tradeHistory.findMany({
        where: { agentId: { in: agentIds } },
        orderBy: [{ agentId: "asc" }, { timestamp: "desc" }],
        select: {
          agentId: true,
          timestamp: true,
        },
      });

  const lastTradeByAgent = new Map<string, Date>();
  for (const row of lastTrades) {
    if (!lastTradeByAgent.has(row.agentId)) {
      lastTradeByAgent.set(row.agentId, row.timestamp);
    }
  }

  const overall = {
    totalAgents: agents.length,
    activeAgents: agents.filter((a) => a.status === "ACTIVE").length,
    pausedAgents: agents.filter((a) => a.status === "PAUSED").length,
    errorAgents: agents.filter((a) => a.status === "ERROR").length,
    liveAgents: agents.filter((a) => a.alpacaAccountType === "live").length,
    paperAgents: agents.filter((a) => a.alpacaAccountType === "paper").length,
  };

  const items = agents.map((agent) => {
    const snap = lastSnapshots.get(agent.id);
    const lastTradeAt = lastTradeByAgent.get(agent.id);
    return {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      symbol: agent.symbol,
      alpacaAccountType: agent.alpacaAccountType,
      createdAt: agent.createdAt.toISOString(),
      latestSnapshot: snap
        ? {
          date: snap.date.toISOString().slice(0, 10),
          equity: snap.equity.toNumber(),
          cash: snap.cash.toNumber(),
          equityMax: snap.equityMax.toNumber(),
          cashMax: snap.cashMax.toNumber(),
          pdtDaytradeCount: snap.pdtDaytradeCount,
          sessionStart: snap.sessionStart
            ? snap.sessionStart.toISOString()
            : null,
          sessionEnd: snap.sessionEnd ? snap.sessionEnd.toISOString() : null,
        }
        : null,
      lastTradeAt: lastTradeAt ? lastTradeAt.toISOString() : null,
    };
  });

  return { overall, agents: items };
}

export type AgentDetailPayload = {
  agent: {
    id: string;
    name: string;
    status: string;
    symbol: string;
    alpacaAccountType: string;
    createdAt: string;
    updatedAt: string;
    lastErrorAt: string | null;
    lastErrorCode: string | null;
  };
  latestSnapshot: {
    date: string;
    equity: number;
    cash: number;
    equityMax: number;
    cashMax: number;
    pdtDaytradeCount: number;
    sessionStart: string | null;
    sessionEnd: string | null;
  } | null;
  stats: {
    totalTrades: number;
    lastTradeAt: string | null;
  };
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getAgentDetail(
  agentId: string,
): Promise<AgentDetailPayload | null> {
  if (!UUID_REGEX.test(agentId)) {
    return null;
  }

  const agent = await prisma.tradingAgent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      name: true,
      status: true,
      symbol: true,
      alpacaAccountType: true,
      createdAt: true,
      updatedAt: true,
      lastErrorAt: true,
      lastErrorCode: true,
    },
  });

  if (!agent) return null;

  const latestSnapshot = await prisma.accountSnapshot.findFirst({
    where: { agentId },
    orderBy: { date: "desc" },
  });

  const tradeStats = await prisma.tradeHistory.aggregate({
    where: { agentId },
    _count: { _all: true },
    _max: { timestamp: true },
  });

  return {
    agent: {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      symbol: agent.symbol,
      alpacaAccountType: agent.alpacaAccountType,
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
      lastErrorAt: agent.lastErrorAt
        ? agent.lastErrorAt.toISOString()
        : null,
      lastErrorCode: agent.lastErrorCode ?? null,
    },
    latestSnapshot: latestSnapshot
      ? {
        date: latestSnapshot.date.toISOString().slice(0, 10),
        equity: latestSnapshot.equity.toNumber(),
        cash: latestSnapshot.cash.toNumber(),
        equityMax: latestSnapshot.equityMax.toNumber(),
        cashMax: latestSnapshot.cashMax.toNumber(),
        pdtDaytradeCount: latestSnapshot.pdtDaytradeCount,
        sessionStart: latestSnapshot.sessionStart
          ? latestSnapshot.sessionStart.toISOString()
          : null,
        sessionEnd: latestSnapshot.sessionEnd
          ? latestSnapshot.sessionEnd.toISOString()
          : null,
      }
      : null,
    stats: {
      totalTrades: tradeStats._count._all,
      lastTradeAt:
        tradeStats._max.timestamp != null
          ? tradeStats._max.timestamp.toISOString()
          : null,
    },
  };
}
