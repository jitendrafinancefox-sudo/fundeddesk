'use client';
import { useEffect, useRef } from 'react';
import { marketData } from '@/services/marketData';
import { PriceBus } from '@/stores/PriceBus';

const PAIRS = [
  { token: '99926000', key: 'nifty' },
  { token: '99926009', key: 'banknifty' },
];
const TICK = 0.05;

function push(token, ltp) {
  if (ltp == null || !Number.isFinite(Number(ltp))) return;
  const p = Number(ltp);
  PriceBus.set(token, { ltp: p, bid: p - TICK, ask: p + TICK, change: null, prevClose: null });
}

// Real relay spot feed: polls /api/health (the relay's actual index values,
// every 2s — the relay's own update cadence) and pushes into the PriceBus.
// This is the SAME source BuySellOverlay and InstrumentCard display, and the
// same bus /tv-chart's candle tick wiring consumes. No fabricated movement.
export default function LiveQuoteFeed({ baselineFor }) {
  const baseline = useRef(baselineFor);
  baseline.current = baselineFor;

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const poll = async () => {
      try {
        const health = await marketData.health(controller.signal);
        if (!mounted) return;
        PAIRS.forEach((p) => {
          const v = health?.[p.key];
          push(p.token, v != null ? v : baseline.current?.(p.key));
        });
      } catch {}
    };
    poll();
    const id = setInterval(poll, 2000);
    return () => { mounted = false; clearInterval(id); controller.abort(); };
  }, []);

  return null;
}
