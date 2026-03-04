import {
  compressJson,
  decompressGzip,
  decodeDbBytea,
  isGzipBuffer,
} from "@/backtest/storage/compressionUtils";
import { isEarlierDay, isLaterDay } from "@/backtest/storage/dateUtils";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { DayBlob, SplitInfo, SymbolRange } from "@/backtest/types";

function toDbDate(day: string): Date {
  // Store as a DATE in Cockroach; force UTC midnight to avoid timezone drift.
  return new Date(`${day}T00:00:00.000Z`);
}

function fromDbDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function toDbDateOrNull(day: string | null | undefined): Date | null {
  if (!day) return null;
  return toDbDate(day);
}

function mapSymbolRange(row: {
  symbol: string;
  haveFrom: Date | null;
  haveTo: Date | null;
  firstAvailableDay: Date | null;
  splits: unknown;
  lastSplitCheck: Date | null;
  updatedAt: Date;
}): SymbolRange {
  return {
    symbol: row.symbol,
    have_from: fromDbDate(row.haveFrom),
    have_to: fromDbDate(row.haveTo),
    first_available_day: fromDbDate(row.firstAvailableDay),
    updated_at: row.updatedAt.toISOString(),
    splits: (row.splits as SplitInfo[]) ?? [],
    last_split_check: fromDbDate(row.lastSplitCheck),
  };
}

function asJson(value: unknown): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

export async function readSymbolRange(symbol: string): Promise<SymbolRange | null> {
  const row = await prisma.symbolRange.findUnique({ where: { symbol } });
  if (!row) return null;
  return mapSymbolRange(row);
}

export async function upsertSymbolRange(
  symbol: string,
  haveFrom: string | null,
  haveTo: string | null,
  existingRange?: SymbolRange | null,
  firstAvailableDay?: string | null
): Promise<SymbolRange | null> {
  const existingSplits = existingRange?.splits ?? [];
  const existingLastSplitCheck = existingRange?.last_split_check ?? null;
  const existingFirstAvailableDay =
    firstAvailableDay !== undefined
      ? firstAvailableDay
      : existingRange?.first_available_day ?? null;

  const row = await prisma.symbolRange.upsert({
    where: { symbol },
    create: {
      symbol,
      haveFrom: toDbDateOrNull(haveFrom),
      haveTo: toDbDateOrNull(haveTo),
      firstAvailableDay: toDbDateOrNull(existingFirstAvailableDay),
      splits: asJson(existingSplits),
      lastSplitCheck: toDbDateOrNull(existingLastSplitCheck),
    },
    update: {
      haveFrom: toDbDateOrNull(haveFrom),
      haveTo: toDbDateOrNull(haveTo),
      firstAvailableDay: toDbDateOrNull(existingFirstAvailableDay),
      splits: asJson(existingSplits),
      lastSplitCheck: toDbDateOrNull(existingLastSplitCheck),
    },
  });

  return mapSymbolRange(row);
}

export async function flushBucket(
  symbol: string,
  bucket: DayBlob[],
  currentRange: SymbolRange | null
): Promise<SymbolRange | null> {
  if (!bucket.length) return currentRange;

  const sortedBucket = [...bucket].sort((a, b) => (a.day < b.day ? -1 : 1));

  const rows = await Promise.all(
    sortedBucket.map(async (blob) => ({
      symbol: blob.symbol,
      day: toDbDate(blob.day),
      data: new Uint8Array(await compressJson(blob.compact)),
      records: blob.records,
      startTs: BigInt(blob.start_ts),
      endTs: BigInt(blob.end_ts),
    }))
  );

  await Promise.all(
    rows.map((row) =>
      prisma.barsDaily.upsert({
        where: { symbol_day: { symbol: row.symbol, day: row.day } },
        create: row,
        update: {
          data: row.data,
          records: row.records,
          startTs: row.startTs,
          endTs: row.endTs,
        },
      })
    )
  );

  const earliestDay = sortedBucket[0].day;
  const latestDay = sortedBucket[sortedBucket.length - 1].day;

  const haveFrom = currentRange?.have_from
    ? isEarlierDay(earliestDay, currentRange.have_from)
      ? earliestDay
      : currentRange.have_from
    : earliestDay;
  const haveTo = currentRange?.have_to
    ? isLaterDay(latestDay, currentRange.have_to)
      ? latestDay
      : currentRange.have_to
    : latestDay;

  return upsertSymbolRange(symbol, haveFrom, haveTo, currentRange);
}

export async function loadPersistedDays(
  symbol: string,
  reqFrom: string,
  reqTo: string
): Promise<DayBlob[]> {
  const rows = await prisma.barsDaily.findMany({
    where: {
      symbol,
      day: {
        gte: toDbDate(reqFrom),
        lte: toDbDate(reqTo),
      },
    },
    select: {
      symbol: true,
      day: true,
      data: true,
      records: true,
      startTs: true,
      endTs: true,
    },
    orderBy: [{ day: "asc" }],
  });

  const result: DayBlob[] = [];
  for (const row of rows) {
    if (!row.data) continue;

    const buffer = decodeDbBytea(row.data);
    if (!isGzipBuffer(buffer)) {
      throw new Error(
        `Row data for ${row.symbol} ${row.day.toISOString()} is not gzipped`
      );
    }

    const decompressed = await decompressGzip(buffer);
    const compact = JSON.parse(decompressed) as Array<[number, number]>;

    result.push({
      symbol: row.symbol,
      day: row.day.toISOString().slice(0, 10),
      compact,
      records: Number(row.records),
      start_ts: Number(row.startTs),
      end_ts: Number(row.endTs),
    });
  }

  return result;
}

export async function deleteCachedBarsForSymbol(symbol: string): Promise<void> {
  await prisma.barsDaily.deleteMany({ where: { symbol } });
}

export async function deleteBarsOutsideRange(
  symbol: string,
  from: string,
  to: string
): Promise<void> {
  await prisma.barsDaily.deleteMany({
    where: { symbol, day: { lt: toDbDate(from) } },
  });
  await prisma.barsDaily.deleteMany({
    where: { symbol, day: { gt: toDbDate(to) } },
  });
}

export async function updateSplitsInDatabase(
  symbol: string,
  splits: SplitInfo[],
  lastSplitCheck: string
): Promise<void> {
  await prisma.symbolRange.update({
    where: { symbol },
    data: {
      splits: asJson(splits),
      lastSplitCheck: toDbDate(new Date(lastSplitCheck).toISOString().slice(0, 10)),
    },
  });
}

export async function resetSymbolRangeAfterSplitChange(
  symbol: string,
  splits: SplitInfo[],
  lastSplitCheck: string,
  firstAvailableDay?: string | null
): Promise<void> {
  await prisma.symbolRange.update({
    where: { symbol },
    data: {
      haveFrom: null,
      haveTo: null,
      splits: asJson(splits),
      lastSplitCheck: toDbDate(new Date(lastSplitCheck).toISOString().slice(0, 10)),
      ...(firstAvailableDay !== undefined
        ? { firstAvailableDay: toDbDateOrNull(firstAvailableDay) }
        : {}),
    },
  });
}

export async function updateFirstAvailableDay(
  symbol: string,
  firstAvailableDay: string
): Promise<void> {
  await prisma.symbolRange.update({
    where: { symbol },
    data: { firstAvailableDay: toDbDate(firstAvailableDay) },
  });
}

export async function listAllSymbolRanges(): Promise<SymbolRange[]> {
  const rows = await prisma.symbolRange.findMany({
    orderBy: [{ symbol: "asc" }],
  });
  return rows.map(mapSymbolRange);
}

export async function deleteSymbolRange(symbol: string): Promise<void> {
  await prisma.symbolRange.delete({ where: { symbol } });
}

export async function deleteSymbolCompletely(symbol: string): Promise<void> {
  await deleteCachedBarsForSymbol(symbol);
  await deleteSymbolRange(symbol);
}

export async function updateSymbolRangeDates(
  symbol: string,
  haveFrom: string | null,
  haveTo: string | null
): Promise<SymbolRange | null> {
  const row = await prisma.symbolRange.update({
    where: { symbol },
    data: {
      haveFrom: toDbDateOrNull(haveFrom),
      haveTo: toDbDateOrNull(haveTo),
    },
  });
  return mapSymbolRange(row);
}

export async function checkDaysExist(
  symbol: string,
  days: string[]
): Promise<Record<string, boolean>> {
  if (days.length === 0) return {};
  const dayDates = days.map(toDbDate);

  const rows = await prisma.barsDaily.findMany({
    where: { symbol, day: { in: dayDates } },
    select: { day: true },
  });

  const existing = new Set(rows.map((r) => r.day.toISOString().slice(0, 10)));
  return Object.fromEntries(days.map((d) => [d, existing.has(d)]));
}
