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

export default function LiveQuoteFeed({ live, baselineFor }) {
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

  useEffect(() => {
    if (!live) return undefined;
    const id = setInterval(() => {
      PAIRS.forEach((p) => {
        const cur = PriceBus.get(p.token)?.ltp;
        const base = cur != null ? cur : baseline.current?.(p.key);
        if (base == null) return;
        push(p.token, base * (1 + (Math.random() - 0.48) * 0.003));
      });
    }, 1500);
    return () => clearInterval(id);
  }, [live]);

  return null;
}
