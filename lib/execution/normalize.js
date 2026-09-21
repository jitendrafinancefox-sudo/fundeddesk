/**
 * lib/execution/normalize.js — Phase 8
 *
 * TradingStore's internal order/position shape has evolved organically
 * across Phases 4-7 (see stores/TradingStore.js). Rewriting it and every
 * consumer (TVOrderPanel, PositionManager, OrderManager, TradeHistory,
 * AccountManager, TVTerminal) to a new field-naming convention would touch
 * a huge, working surface for zero behavioral gain — explicitly out of
 * scope for this phase.
 *
 * Instead, this module is a READ-ONLY normalization boundary: pure
 * functions that project the existing internal shape into the canonical
 * shape a future execution provider (or a future UI that wants it) can
 * rely on, WITHOUT requiring any existing component to change. Nothing
 * here mutates TradingStore state or changes what TradingStore persists.
 *
 * Existing internal order fields (stores/TradingStore.js `placeOrder`):
 *   id, status, exchange, token, symbol, underlying, kind, side, lots, qty,
 *   orderType, limitPrice, signalPrice, sl, tp, margin, createdAt, time,
 *   rejectReason?, fillPrice?, filledAt?, filled?
 *
 * Existing internal position fields (`fillOrder`/`reversePosition`):
 *   id, orderId, exchange, token, symbol, underlying, kind, side, lots, qty,
 *   avgPrice, currentPrice, sl, tp, margin, openedAt, opened
 */

/** @returns {string|null} the account scope this order/position belongs to, for the canonical accountId field. */
function scopeAccountId(getAccountScope) {
  try { return getAccountScope ? getAccountScope() : null; } catch { return null; }
}

/**
 * @param {object} order  a TradingStore order record
 * @param {() => string|null} [getAccountScope]  e.g. TradingStore.getAccountScope
 * @returns canonical order shape (Step 4)
 */
export function toCanonicalOrder(order, getAccountScope) {
  if (!order) return null;
  const lotSize = order.lots ? order.qty / order.lots : null;
  return {
    id: order.id,
    accountId: scopeAccountId(getAccountScope),
    instrument: {
      exchange: order.exchange,
      token: order.token,
      symbol: order.symbol,
      underlying: order.underlying,
      kind: order.kind,
    },
    token: order.token,
    symbol: order.symbol,
    exchange: order.exchange,
    side: order.side,
    quantity: order.qty,
    lotSize,
    lots: order.lots,
    orderType: order.orderType || 'MARKET',
    price: order.orderType === 'LIMIT' ? order.limitPrice : order.signalPrice,
    stopLoss: order.sl ?? null,
    takeProfit: order.tp ?? null,
    status: order.status, // 'pending' | 'executed' | 'completed' | 'cancelled' | 'rejected'
    createdAt: order.createdAt,
    updatedAt: order.filledAt ?? order.createdAt,
    filledAt: order.filledAt ?? null,
    filledQuantity: order.status === 'executed' || order.status === 'completed' ? order.qty : 0,
    averageFillPrice: order.fillPrice ?? null,
    rejectionReason: order.rejectReason ?? null,
    // No broker exists yet — never fabricate an ID here. See
    // lib/execution/BrokerExecutionProvider.js.
    brokerOrderId: null,
  };
}

/**
 * @param {object} position  a TradingStore position record
 * @param {() => string|null} [getAccountScope]
 * @returns canonical position shape (Step 5)
 */
export function toCanonicalPosition(position, getAccountScope) {
  if (!position) return null;
  const lotSize = position.lots ? position.qty / position.lots : null;
  const cur = position.currentPrice ?? position.avgPrice;
  const dir = position.side === 'BUY' ? 1 : -1;
  const unrealizedPnl = Number.isFinite(cur) && Number.isFinite(position.avgPrice)
    ? Math.round((cur - position.avgPrice) * dir * position.qty * 100) / 100
    : null;
  return {
    positionId: position.id,
    accountId: scopeAccountId(getAccountScope),
    orderId: position.orderId ?? null,
    instrument: {
      exchange: position.exchange,
      token: position.token,
      symbol: position.symbol,
      underlying: position.underlying,
      kind: position.kind,
    },
    token: position.token,
    symbol: position.symbol,
    exchange: position.exchange,
    side: position.side,
    quantity: position.qty,
    lotSize,
    lots: position.lots,
    averageEntryPrice: position.avgPrice,
    currentPrice: position.currentPrice ?? null,
    unrealizedPnl,
    // Realized P&L is an ACCOUNT-level running total in this simulator
    // (state.account.realized), not tracked per open position — a position
    // only contributes to it once closed (see TradeHistory). 0 is accurate
    // for an open position, not a placeholder.
    realizedPnl: 0,
    usedMargin: position.margin ?? null,
    stopLoss: position.sl ?? null,
    takeProfit: position.tp ?? null,
    openedAt: position.openedAt,
  };
}

export function toCanonicalOrders(orders, getAccountScope) {
  return (orders || []).map((o) => toCanonicalOrder(o, getAccountScope));
}

export function toCanonicalPositions(positions, getAccountScope) {
  return (positions || []).map((p) => toCanonicalPosition(p, getAccountScope));
}
