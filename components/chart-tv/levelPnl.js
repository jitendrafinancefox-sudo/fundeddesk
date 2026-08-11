'use client';
import { PriceBus } from '@/stores/PriceBus';
import { fmtINR } from '@/stores/TradingStore';

// Shared trading P&L math — the ONE place the (level - avgPrice) * dir * qty
// formula lives. Both applyLevelLines (price-line labels) and EntryBar
// (control bar + drag previews) consume it so the two can never diverge.

export function dir(side) {
  return side === 'BUY' ? 1 : -1;
}

export function pnlAt(price, position) {
  return (price - position.avgPrice) * dir(position.side) * position.qty;
}

export function signedINR(value) {
  return (value >= 0 ? '+' : '') + fmtINR(value);
}

export function livePrice(position) {
  return PriceBus.get(String(position.token))?.ltp ?? position.currentPrice ?? position.avgPrice;
}