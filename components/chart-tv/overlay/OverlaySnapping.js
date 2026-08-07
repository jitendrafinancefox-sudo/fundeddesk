'use client';
import { snapAnchor } from '@/components/chart/engine/SnappingEngine';

// Reuses the legacy snapping engine untouched (binary-search OHLC snapping).
export function createOverlaySnapping(initial = { magnet: true, mode: 'ohlc' }) {
  let config = { magnet: true, mode: 'ohlc', ...initial };
  return {
    configure(next) { config = { magnet: true, mode: 'ohlc', ...next }; },
    get() { return config; },
    snap(anchor, candles) { return snapAnchor(anchor, candles, config); },
  };
}
