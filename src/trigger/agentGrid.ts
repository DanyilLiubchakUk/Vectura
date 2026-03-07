/**
 * Grid run for one agent. Fetches Alpaca state, reconciles open orders
 * by client_order_id prefix, places market orders with deterministic client_order_id.
 * Used by runOneAgent only; uses Alpaca instance (no global).
 */
import { GRID_TRADE_DEFAULT_CONFIG } from "@/utils/trading/algorithms/constants";
import type { Igrid } from "@/utils/trading/algorithms/constants";
import type Alpaca from "@alpacahq/alpaca-trade-api";

const CLIENT_ORDER_ID_PREFIX = "vectura";

export type PlacedOrder = {
  clientOrderId: string;
  side: "buy" | "sell";
  symbol: string;
  qty: number;
  price: number;
  alpacaOrderId: string;
};

export function parseStrategyParams(raw: unknown): Igrid {
  const o = (raw ?? {}) as Record<string, unknown>;
  return {
    capitalPct: Number(o.capitalPct ?? GRID_TRADE_DEFAULT_CONFIG.capitalPct),
    buyBelowPct: Number(o.buyBelowPct ?? GRID_TRADE_DEFAULT_CONFIG.buyBelowPct),
    sellAbovePct: Number(o.sellAbovePct ?? GRID_TRADE_DEFAULT_CONFIG.sellAbovePct),
    buyAfterSellPct: Number(o.buyAfterSellPct ?? GRID_TRADE_DEFAULT_CONFIG.buyAfterSellPct),
    cashFloor: Number(o.cashFloor ?? GRID_TRADE_DEFAULT_CONFIG.cashFloor),
    orderGapPct: Number(o.orderGapPct ?? GRID_TRADE_DEFAULT_CONFIG.orderGapPct),
  };
}

function minuteSlotNorm(iso: string): string {
  return iso.replace(/[:.]/g, "-").slice(0, 23);
}

function roundDown(num: number, digits = 6): number {
  const base = 10 ** digits;
  return Math.floor(num * base) / base;
}

export async function runAgentGrid(
  alpaca: Alpaca,
  agentId: string,
  symbol: string,
  minuteSlotIso: string,
  params: Igrid,
  cash: number,
): Promise<{ ordersPlaced: number; placed: PlacedOrder[] }> {
  const prefix = `${CLIENT_ORDER_ID_PREFIX}-${agentId}-`;
  const slot = minuteSlotNorm(minuteSlotIso);
  const placed: PlacedOrder[] = [];

  const [positions, openOrders, snapshot] = await Promise.all([
    alpaca.getPositions(),
    alpaca.getOrders({
      status: "open",
      direction: "desc",
      limit: undefined,
      after: undefined,
      nested: undefined,
      symbols: undefined,
      until: undefined,
    }),
    alpaca.getSnapshot(symbol),
  ]);

  const ourOpenOrders = (openOrders ?? []).filter(
    (o: { client_order_id?: string }) => (o.client_order_id ?? "").startsWith(prefix),
  );
  const hasOpenBuy = ourOpenOrders.some((o: { side?: string }) => o.side === "buy");
  const openSellQties = new Set(
    ourOpenOrders
      .filter((o: { side?: string }) => o.side === "sell")
      .map((o: { qty?: string }) => Number(o.qty ?? 0)),
  );

  const currentPrice =
    (snapshot as { LatestTrade?: { Price?: number } } | undefined)?.LatestTrade?.Price ?? 0;
  if (currentPrice <= 0) return { ordersPlaced: 0, placed };

  const buyPrice = currentPrice * (1 - params.buyBelowPct / 100);
  const useCash = roundDown(cash * (params.capitalPct / 100), 2);
  const canBuy =
    !hasOpenBuy &&
    cash - useCash >= params.cashFloor &&
    useCash >= currentPrice;

  if (canBuy && currentPrice <= buyPrice) {
    const qty = Math.floor(useCash / currentPrice);
    if (qty > 0) {
      const clientOrderId = `${prefix}${slot}-buy-0`;
      try {
        const order = await alpaca.createOrder({
          symbol,
          qty: String(qty),
          side: "buy",
          type: "market",
          time_in_force: "day",
          client_order_id: clientOrderId,
        });
        const id = (order as { id?: string }).id;
        if (id) {
          placed.push({
            clientOrderId,
            side: "buy",
            symbol,
            qty,
            price: currentPrice,
            alpacaOrderId: id,
          });
        }
      } catch {
        // place failed; skip
      }
    }
  }

  const symbolPositions = (positions ?? []).filter(
    (p: { symbol?: string }) => (p.symbol ?? "").toUpperCase() === symbol.toUpperCase(),
  );

  await Promise.all(
    symbolPositions.map((pos: { qty?: string; avg_entry_price?: string }, idx: number) => {
      const qty = Number(pos.qty ?? 0);
      const avgEntry = Number(pos.avg_entry_price ?? 0);
      if (qty <= 0 || avgEntry <= 0) return Promise.resolve();
      if (openSellQties.has(qty)) return Promise.resolve();
      const sellPrice = avgEntry * (1 + params.sellAbovePct / 100);
      if (currentPrice < sellPrice) return Promise.resolve();
      const clientOrderId = `${prefix}${slot}-sell-${idx}`;
      return alpaca
        .createOrder({
          symbol,
          qty: String(qty),
          side: "sell",
          type: "market",
          time_in_force: "day",
          client_order_id: clientOrderId,
        })
        .then((order: unknown) => {
          const id = (order as { id?: string }).id;
          if (id)
            placed.push({
              clientOrderId,
              side: "sell",
              symbol,
              qty,
              price: currentPrice,
              alpacaOrderId: id,
            });
        })
        .catch(() => { });
    }),
  );

  return { ordersPlaced: placed.length, placed };
}
