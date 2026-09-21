/**
 * lib/execution/PaperExecutionProvider.js — Phase 8
 *
 * The existing TradingStore (stores/TradingStore.js) IS the paper execution
 * provider — it already has exactly one call site per action, already
 * account-scopes itself, already runs every Phase 6 risk check and every
 * Phase 7 lifecycle-correctness fix. This file does not reimplement or
 * wrap that logic; it is a thin adapter that exposes it under the
 * ExecutionProvider shape (lib/execution/ExecutionProvider.js) for any
 * FUTURE caller that wants the canonical/provider-agnostic contract.
 *
 * The live terminal (TVTerminal.js, PositionManager.js, OrderManager.js,
 * TradeHistory.js, AccountManager.js) is intentionally left calling
 * TradingStore directly, exactly as it does today — rerouting every
 * existing call site through this adapter would touch a large, already
 * regression-tested surface for no behavioral gain, which Phase 8
 * explicitly warns against. This file makes the boundary available, not
 * mandatory.
 */
import { TradingStore } from '@/stores/TradingStore';
import { toCanonicalOrders, toCanonicalPositions } from './normalize';

export const PaperExecutionProvider = {
  id: 'paper',
  label: 'Practice Simulator',
  configured: true, // always usable — it's a browser-only simulator

  /** @param {import('./ExecutionProvider').OrderIntent} intent */
  placeOrder(intent) {
    const { instrument, side, lots, lotSize, orderType, limitPrice, stopLoss, takeProfit } = intent;
    const order = TradingStore.placeOrder({
      exchange: instrument.exchange,
      token: instrument.token,
      symbol: instrument.symbol,
      underlying: instrument.underlying,
      kind: instrument.kind,
      side, lots, lotSize, orderType, limitPrice,
      sl: stopLoss, tp: takeProfit,
    });
    if (order) {
      return {
        status: 'pending', orderId: order.id, brokerOrderId: null,
        filledQuantity: 0, averageFillPrice: null, rejectionReason: null,
      };
    }
    // TradingStore.placeOrder() pushes a real notification on every
    // rejection path (margin, rules, invalid price, index-not-tradable) —
    // reused here rather than re-deriving or guessing a reason.
    const notifications = TradingStore.getSnapshot('notifications') || [];
    const reason = notifications[notifications.length - 1]?.text || 'Order rejected';
    return {
      status: 'rejected', orderId: null, brokerOrderId: null,
      filledQuantity: 0, averageFillPrice: null, rejectionReason: reason,
    };
  },

  cancelOrder(id) { TradingStore.cancelOrder(id); },
  modifyOrder(id, patch) {
    TradingStore.modifyOrder(id, { qty: patch?.quantity, limitPrice: patch?.limitPrice });
  },

  getOrders() { return toCanonicalOrders(TradingStore.getSnapshot('orders'), TradingStore.getAccountScope); },
  getPositions() { return toCanonicalPositions(TradingStore.getSnapshot('positions'), TradingStore.getAccountScope); },
  getTrades() { return TradingStore.getSnapshot('trades'); },

  // Position-lifecycle actions beyond the base ExecutionProvider interface
  // (Step 16: paper provider must still support these) — same pass-through
  // pattern, not re-specified in the interface doc since they're specific
  // to a position-based paper simulator, not universal to every provider.
  closePosition(id, priceOverride) { TradingStore.closePosition(id, priceOverride); },
  partialExit(id, lots) { TradingStore.partialExit(id, lots); },
  reversePosition(id) { TradingStore.reversePosition(id); },
  addQty(id, lots) { TradingStore.addQty(id, lots); },
};
