'use client';
import { useEffect, useRef } from 'react';
import { marketData } from '@/services/marketData';
import { PriceBus } from '@/stores/PriceBus';

const PAIRS = [
  { token: '99926000', key: 'nifty' },
  { token: '99926009', key: 'banknifty' },
];

function push(token, ltp) {
  if (ltp == null || !Number.isFinite(Number(ltp))) return;
  const p = Number(ltp);
  // NIFTY/BANKNIFTY spot are calculated INDEX values — they have no real
  // bid/ask/depth at all (you cannot place an order directly on an index),
  // so bid/ask are left null rather than fabricated. This used to synthesize
  // bid: ltp-0.05 / ask: ltp+0.05 and hand it to consumers under the exact
  // same field names a genuine market-depth feed would use — indistinguishable
  // from real data to anything downstream (Phase 20 fix). Consumers (e.g.
  // BuySellOverlay) already fall back to ltp when bid/ask are null.
  PriceBus.set(token, { ltp: p, bid: null, ask: null, change: null, prevClose: null });
}

// Real relay spot feed: polls /api/health (the relay's actual index values,
// every 2s — the relay's own update cadence) and pushes into the PriceBus.
// This is the SAME source BuySellOverlay and InstrumentCard display, and the
// same bus /tv-chart's candle tick wiring consumes. No fabricated movement,
// and no fabricated bid/ask (see push(), above).
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
