import { TRADE_SYMBOL, UPDATE_AFTER_NEW_SPLIT_BATCH_SIZE } from "@/auto-trade/constants";
import { GRID_TRADE_DEFAULT_CONFIG } from "@/utils/trading/algorithms/constants";
import { ensureLegacyAgent } from "@/utils/cockroach/legacyAgent";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type {
  SplitInfoRecord,
  ToBuyRecord,
  ToSellRecord,
  TradeHistoryRecord,
  OpenTradeRecord,
} from "@/auto-trade/types";
import type {
  IpdtDay,
  IorderAction,
} from "@/utils/zustand/autoTradeStore";

type LegacyState = {
  toBuy: ToBuyRecord[];
  toSell: ToSellRecord[];
};

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

function toIso(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

function utcDayFromIsoTimestamp(ts: string): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function toDbDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

function getLegacyStateFromRiskLimits(riskLimits: unknown): LegacyState {
  const obj = (riskLimits ?? {}) as Record<string, unknown>;
  const legacy = (obj.legacyState ?? {}) as Partial<LegacyState>;
  return {
    toBuy: Array.isArray(legacy.toBuy) ? (legacy.toBuy as ToBuyRecord[]) : [],
    toSell: Array.isArray(legacy.toSell) ? (legacy.toSell as ToSellRecord[]) : [],
  };
}

function withLegacyState(riskLimits: unknown, legacyState: LegacyState) {
  const current = (riskLimits ?? {}) as Record<string, unknown>;
  return { ...current, legacyState };
}

async function getLegacyAgentId(): Promise<string> {
  const { agentId } = await ensureLegacyAgent();
  return agentId;
}

async function getOrInitTodaySnapshot(agentId: string, isoTime: string) {
  const day = utcDayFromIsoTimestamp(isoTime);
  const date = toDbDate(day);

  const existing = await prisma.accountSnapshot.findUnique({
    where: { agentId_date: { agentId, date } },
  });
  if (existing) return existing;

  return prisma.accountSnapshot.create({
    data: {
      agentId,
      date,
      equity: new Prisma.Decimal(0),
      cash: new Prisma.Decimal(0),
      equityMax: new Prisma.Decimal(0),
      cashMax: new Prisma.Decimal(0),
      pdtDaytradeCount: 0,
      pdtDays: asJson([]),
      sessionStart: null,
      sessionEnd: null,
    },
  });
}

export async function getSplits(time: string): Promise<{
  lastSplitCheck: string;
  lastSplits: SplitInfoRecord[];
}> {
  const symbol = TRADE_SYMBOL;
  const day = utcDayFromIsoTimestamp(time);

  const row = await prisma.symbolRange.upsert({
    where: { symbol },
    create: {
      symbol,
      haveFrom: null,
      haveTo: null,
      firstAvailableDay: null,
      splits: asJson([]),
      lastSplitCheck: toDbDate(day),
    },
    update: {},
    select: { splits: true, lastSplitCheck: true },
  });

  return {
    lastSplitCheck:
      row.lastSplitCheck?.toISOString().slice(0, 10) ?? day,
    lastSplits: (row.splits as unknown as SplitInfoRecord[]) ?? [],
  };
}

export async function updateSplitsInDatabase(
  symbol: string,
  splits: SplitInfoRecord[],
  lastSplitCheck: string
): Promise<void> {
  const day = utcDayFromIsoTimestamp(lastSplitCheck);
  await prisma.symbolRange.upsert({
    where: { symbol },
    create: {
      symbol,
      haveFrom: null,
      haveTo: null,
      firstAvailableDay: null,
      splits: asJson(splits),
      lastSplitCheck: toDbDate(day),
    },
    update: { splits: asJson(splits), lastSplitCheck: toDbDate(day) },
  });
}

export async function getDBtradingData(time: string): Promise<{
  start: string;
  cashMax: number;
  equityMax: number;
  toBuy: IorderAction[];
  toSell: Array<{
    id: string;
    atPrice: number;
    belowOrHigher: "below" | "higher";
    shares: number;
    tradeId: string;
  }>;
  pdtDays: IpdtDay[];
}> {
  const agentId = await getLegacyAgentId();
  return getDBtradingDataForAgent(agentId, time);
}

export async function getDBtradingDataForAgent(
  agentId: string,
  time: string,
): Promise<{
  start: string;
  cashMax: number;
  equityMax: number;
  toBuy: IorderAction[];
  toSell: Array<{
    id: string;
    atPrice: number;
    belowOrHigher: "below" | "higher";
    shares: number;
    tradeId: string;
  }>;
  pdtDays: IpdtDay[];
}> {
  const snapshot = await getOrInitTodaySnapshot(agentId, time);

  const agent = await prisma.tradingAgent.findUnique({
    where: { id: agentId },
    select: { riskLimits: true },
  });

  const legacy = getLegacyStateFromRiskLimits(agent?.riskLimits);

  const start = snapshot.sessionStart ? snapshot.sessionStart.toISOString() : "";
  const cashMax = snapshot.cashMax.toNumber();
  const equityMax = snapshot.equityMax.toNumber();
  const pdtDays = (snapshot.pdtDays as unknown as IpdtDay[]) ?? [];

  const toBuy: IorderAction[] = legacy.toBuy.map((r) => ({
    id: r.id,
    atPrice: Number(r.at_price ?? 0),
    belowOrHigher: r.below_or_higher === "higher" ? "higher" : "below",
  }));

  const toSell = legacy.toSell.map((r) => {
    const belowOrHigher: "below" | "higher" =
      r.below_or_higher === "below" ? "below" : "higher";
    return {
      id: r.id,
      atPrice: Number(r.at_price ?? 0),
      belowOrHigher,
      shares: Number(r.shares ?? 0),
      tradeId: r.trade_id,
    };
  });

  return { start, cashMax, equityMax, toBuy, toSell, pdtDays };
}

export async function getAlgoConfigOrDefault(): Promise<{
  capitalPct: number;
  buyBelowPct: number;
  sellAbovePct: number;
  buyAfterSellPct: number;
  cashFloor: number;
  orderGapPct: number;
}> {
  const agentId = await getLegacyAgentId();
  return getAlgoConfigForAgentOrDefault(agentId);
}

export async function getAlgoConfigForAgentOrDefault(
  agentId: string,
): Promise<{
  capitalPct: number;
  buyBelowPct: number;
  sellAbovePct: number;
  buyAfterSellPct: number;
  cashFloor: number;
  orderGapPct: number;
}> {
  const row = await prisma.tradingAgent.findUnique({
    where: { id: agentId },
    select: { strategyParams: true },
  });

  const cfg = (row?.strategyParams ?? {}) as Partial<typeof GRID_TRADE_DEFAULT_CONFIG>;
  const merged = { ...GRID_TRADE_DEFAULT_CONFIG, ...cfg };

  // Ensure the DB has a sane config shape.
  await prisma.tradingAgent.update({
    where: { id: agentId },
    data: { strategyParams: merged },
  });

  return {
    capitalPct: Number(merged.capitalPct),
    buyBelowPct: Number(merged.buyBelowPct),
    sellAbovePct: Number(merged.sellAbovePct),
    buyAfterSellPct: Number(merged.buyAfterSellPct),
    cashFloor: Number(merged.cashFloor),
    orderGapPct: Number(merged.orderGapPct),
  };
}

export async function updatePdtDays(pdtDays: IpdtDay[], time: string): Promise<void> {
  const agentId = await getLegacyAgentId();
  const day = utcDayFromIsoTimestamp(time);
  await prisma.accountSnapshot.update({
    where: { agentId_date: { agentId, date: toDbDate(day) } },
    data: { pdtDays: asJson(pdtDays) },
  });
}

export async function updateSummaryMaxes(
  cashMax: number,
  equityMax: number,
  time: string
): Promise<void> {
  const agentId = await getLegacyAgentId();
  const day = utcDayFromIsoTimestamp(time);
  await prisma.accountSnapshot.update({
    where: { agentId_date: { agentId, date: toDbDate(day) } },
    data: {
      cashMax: new Prisma.Decimal(cashMax),
      equityMax: new Prisma.Decimal(equityMax),
    },
  });
}

export async function updateSummaryStartTime(startTime: string): Promise<void> {
  const agentId = await getLegacyAgentId();
  const day = utcDayFromIsoTimestamp(startTime);
  await prisma.accountSnapshot.updateMany({
    where: { agentId, date: toDbDate(day), sessionStart: null },
    data: { sessionStart: new Date(startTime) },
  });
}

export async function updateSummaryEndTime(endTime: string): Promise<void> {
  const agentId = await getLegacyAgentId();
  const day = utcDayFromIsoTimestamp(endTime);
  await prisma.accountSnapshot.update({
    where: { agentId_date: { agentId, date: toDbDate(day) } },
    data: { sessionEnd: new Date(endTime) },
  });
}

export async function saveTradeHistory(record: TradeHistoryRecord): Promise<void> {
  const agentId = await getLegacyAgentId();
  const timestamp = record.timestamp ? new Date(record.timestamp) : new Date();
  const side = record.trade_type === "sell" ? "sell" : "buy";
  const tradeId = record.id;

  await prisma.tradeHistory.upsert({
    where: { agentId_tradeId: { agentId, tradeId } },
    create: {
      agentId,
      tradeId,
      clientOrderId: tradeId,
      alpacaOrderId: null,
      timestamp,
      side,
      symbol: TRADE_SYMBOL,
      qty: new Prisma.Decimal(record.shares ?? 0),
      price: new Prisma.Decimal(record.price ?? 0),
      closeTradeId: record.close_trade_id,
    },
    update: {
      timestamp,
      side,
      qty: new Prisma.Decimal(record.shares ?? 0),
      price: new Prisma.Decimal(record.price ?? 0),
      closeTradeId: record.close_trade_id,
    },
  });
}

export async function saveToSellOrder(record: ToSellRecord): Promise<void> {
  const agentId = await getLegacyAgentId();
  const agent = await prisma.tradingAgent.findUnique({
    where: { id: agentId },
    select: { riskLimits: true },
  });
  const legacy = getLegacyStateFromRiskLimits(agent?.riskLimits);

  const idx = legacy.toSell.findIndex((r) => r.id === record.id);
  if (idx >= 0) legacy.toSell[idx] = record;
  else legacy.toSell.push(record);

  await prisma.tradingAgent.update({
    where: { id: agentId },
    data: { riskLimits: asJson(withLegacyState(agent?.riskLimits, legacy)) },
  });
}

export async function deleteToSellOrder(orderId: string): Promise<void> {
  const agentId = await getLegacyAgentId();
  const agent = await prisma.tradingAgent.findUnique({
    where: { id: agentId },
    select: { riskLimits: true },
  });
  const legacy = getLegacyStateFromRiskLimits(agent?.riskLimits);
  legacy.toSell = legacy.toSell.filter((r) => r.id !== orderId);
  await prisma.tradingAgent.update({
    where: { id: agentId },
    data: { riskLimits: asJson(withLegacyState(agent?.riskLimits, legacy)) },
  });
}

async function saveToBuyOrder(record: ToBuyRecord): Promise<void> {
  const agentId = await getLegacyAgentId();
  const agent = await prisma.tradingAgent.findUnique({
    where: { id: agentId },
    select: { riskLimits: true },
  });
  const legacy = getLegacyStateFromRiskLimits(agent?.riskLimits);
  const idx = legacy.toBuy.findIndex((r) => r.id === record.id);
  if (idx >= 0) legacy.toBuy[idx] = record;
  else legacy.toBuy.push(record);
  await prisma.tradingAgent.update({
    where: { id: agentId },
    data: { riskLimits: asJson(withLegacyState(agent?.riskLimits, legacy)) },
  });
}

async function deleteToBuyOrder(orderId: string): Promise<void> {
  const agentId = await getLegacyAgentId();
  const agent = await prisma.tradingAgent.findUnique({
    where: { id: agentId },
    select: { riskLimits: true },
  });
  const legacy = getLegacyStateFromRiskLimits(agent?.riskLimits);
  legacy.toBuy = legacy.toBuy.filter((r) => r.id !== orderId);
  await prisma.tradingAgent.update({
    where: { id: agentId },
    data: { riskLimits: asJson(withLegacyState(agent?.riskLimits, legacy)) },
  });
}

export async function syncToBuyOrders(
  newOrders: IorderAction[],
  existingOrderIds: string[]
): Promise<void> {
  const newOrderIds = new Set(newOrders.map((o) => o.id));
  const ordersToDelete = existingOrderIds.filter((id) => !newOrderIds.has(id));
  for (const id of ordersToDelete) {
    await deleteToBuyOrder(id);
  }
  for (const order of newOrders) {
    await saveToBuyOrder({
      id: order.id,
      at_price: order.atPrice,
      below_or_higher: order.belowOrHigher,
    });
  }
}

// --- Split-manager support (legacy path) ---

export async function getTradeHistoryCount(): Promise<number> {
  const agentId = await getLegacyAgentId();
  return prisma.tradeHistory.count({ where: { agentId } });
}

export async function fetchTradeHistoryBatch(offset: number): Promise<TradeHistoryRecord[]> {
  const agentId = await getLegacyAgentId();
  const rows = await prisma.tradeHistory.findMany({
    where: { agentId },
    orderBy: [{ timestamp: "asc" }, { tradeId: "asc" }],
    skip: offset,
    take: UPDATE_AFTER_NEW_SPLIT_BATCH_SIZE,
    select: {
      tradeId: true,
      timestamp: true,
      side: true,
      qty: true,
      price: true,
      closeTradeId: true,
    },
  });

  return rows.map((r) => ({
    id: r.tradeId,
    timestamp: toIso(r.timestamp),
    trade_type: r.side,
    shares: r.qty.toNumber(),
    price: r.price.toNumber(),
    close_trade_id: r.closeTradeId,
  }));
}

export async function updateTradeHistoryBatch(records: TradeHistoryRecord[]): Promise<void> {
  if (records.length === 0) return;
  await Promise.all(records.map((r) => saveTradeHistory(r)));
}

export async function getToBuyCount(): Promise<number> {
  const agentId = await getLegacyAgentId();
  const agent = await prisma.tradingAgent.findUnique({
    where: { id: agentId },
    select: { riskLimits: true },
  });
  return getLegacyStateFromRiskLimits(agent?.riskLimits).toBuy.length;
}

export async function fetchToBuyBatch(offset: number): Promise<ToBuyRecord[]> {
  const agentId = await getLegacyAgentId();
  const agent = await prisma.tradingAgent.findUnique({
    where: { id: agentId },
    select: { riskLimits: true },
  });
  const toBuy = getLegacyStateFromRiskLimits(agent?.riskLimits).toBuy;
  return toBuy.slice(offset, offset + UPDATE_AFTER_NEW_SPLIT_BATCH_SIZE);
}

export async function updateToBuyBatch(records: ToBuyRecord[]): Promise<void> {
  if (records.length === 0) return;
  const agentId = await getLegacyAgentId();
  const agent = await prisma.tradingAgent.findUnique({
    where: { id: agentId },
    select: { riskLimits: true },
  });
  const legacy = getLegacyStateFromRiskLimits(agent?.riskLimits);
  const byId = new Map(records.map((r) => [r.id, r]));
  legacy.toBuy = legacy.toBuy.map((r) => byId.get(r.id) ?? r);
  await prisma.tradingAgent.update({
    where: { id: agentId },
    data: { riskLimits: asJson(withLegacyState(agent?.riskLimits, legacy)) },
  });
}

export async function getToSellCount(): Promise<number> {
  const agentId = await getLegacyAgentId();
  const agent = await prisma.tradingAgent.findUnique({
    where: { id: agentId },
    select: { riskLimits: true },
  });
  return getLegacyStateFromRiskLimits(agent?.riskLimits).toSell.length;
}

export async function fetchToSellBatch(offset: number): Promise<ToSellRecord[]> {
  const agentId = await getLegacyAgentId();
  const agent = await prisma.tradingAgent.findUnique({
    where: { id: agentId },
    select: { riskLimits: true },
  });
  const toSell = getLegacyStateFromRiskLimits(agent?.riskLimits).toSell;
  return toSell.slice(offset, offset + UPDATE_AFTER_NEW_SPLIT_BATCH_SIZE);
}

export async function updateToSellBatch(records: ToSellRecord[]): Promise<void> {
  if (records.length === 0) return;
  const agentId = await getLegacyAgentId();
  const agent = await prisma.tradingAgent.findUnique({
    where: { id: agentId },
    select: { riskLimits: true },
  });
  const legacy = getLegacyStateFromRiskLimits(agent?.riskLimits);
  const byId = new Map(records.map((r) => [r.id, r]));
  legacy.toSell = legacy.toSell.map((r) => byId.get(r.id) ?? r);
  await prisma.tradingAgent.update({
    where: { id: agentId },
    data: { riskLimits: asJson(withLegacyState(agent?.riskLimits, legacy)) },
  });
}

// --- Support for PDT checks (legacy path) ---

export async function getTradeTimestampById(tradeId: string): Promise<string | null> {
  const agentId = await getLegacyAgentId();
  const row = await prisma.tradeHistory.findUnique({
    where: { agentId_tradeId: { agentId, tradeId } },
    select: { timestamp: true },
  });
  return row?.timestamp.toISOString() ?? null;
}

