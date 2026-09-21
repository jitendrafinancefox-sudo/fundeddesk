'use client';

/* ============================================================
   /portal/analytics/heatmap  —  Indian index constituent heatmap

   Source: the SAME market-data relay the Web Terminal uses
   (services/marketData.js -> ${NEXT_PUBLIC_RELAY_URL}/api/heatmap).
   No second integration. Rows are normalised via lib/providers/heatmap.

   Honesty rules honoured here:
   - a missing change/price shows "—", never 0 / 0.00
   - the pill never says "Live"; it says "Connected · Updated HH:MM:SS IST"
     because the relay gives a snapshot, not a stream
   - if the relay is unreachable -> DataUnavailable (real retry), no mock rows
   - polling is 30s and pauses while the tab is hidden; requests never overlap
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { marketData } from '@/services/marketData';
import { normalizeHeatmap, sortHeatmap, breadth } from '@/lib/providers/heatmap';
import { istClock, IS_MARKET_OPEN } from '@/lib/marketTime';
import MarketDataStatus from '@/components/market/MarketDataStatus';
import DataUnavailable from '@/components/market/DataUnavailable';
import RefreshButton from '@/components/market/RefreshButton';

const INDICES = ['NIFTY', 'BANKNIFTY'];
const POLL_MS = 30000;

function tileStyle(changePct) {
  if (changePct == null) {
    return { background: 'var(--bg2, #0A0C15)', borderColor: 'var(--line2)' };
  }
  const mag = Math.min(0.45, 0.1 + Math.abs(changePct) / 18);
  if (changePct > 0) return { background: `rgba(34,197,139,${mag})`, borderColor: 'rgba(34,197,139,.35)' };
  if (changePct < 0) return { background: `rgba(240,82,95,${mag})`, borderColor: 'rgba(240,82,95,.3)' };
  return { background: 'var(--bg2, #0A0C15)', borderColor: 'var(--line2)' };
}
function pct(n) {
  return n == null ? '—' : `${n > 0 ? '+' : ''}${n.toFixed(2)}%`;
}

export default function HeatmapPage() {
  const [index, setIndex] = useState('NIFTY');
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading'); // loading | connected | offline
  const [updatedAt, setUpdatedAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const inFlight = useRef(null);
  const mounted = useRef(true);

  const fetchNow = useCallback(async (opts = {}) => {
    if (inFlight.current) return; // never overlap
    const ctrl = new AbortController();
    inFlight.current = ctrl;
    if (opts.manual) setRefreshing(true);
    try {
      const raw = await marketData.heatmap(index, ctrl.signal);
      if (!mounted.current) return;
      setRows(sortHeatmap(normalizeHeatmap(raw)));
      setState('connected');
      setUpdatedAt(Date.now());
    } catch (e) {
      if (e?.name === 'AbortError' || !mounted.current) return;
      setState('offline');
    } finally {
      inFlight.current = null;
      if (mounted.current && opts.manual) setRefreshing(false);
    }
  }, [index]);

  useEffect(() => {
    mounted.current = true;
    setState('loading');
    setRows([]);
    fetchNow();
    const id = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return; // pause when tab hidden
      fetchNow();
    }, POLL_MS);
    return () => {
      mounted.current = false;
      clearInterval(id);
      inFlight.current?.abort?.();
      inFlight.current = null;
    };
  }, [fetchNow]);

  const b = breadth(rows);
  const marketOpen = (() => { try { return !!IS_MARKET_OPEN(); } catch (e) { return false; } })();

  return (
    <div className="portal-dashboard">
      <Header>
        <MarketDataStatus
          state={state === 'loading' ? 'loading' : state}
          updatedLabel={state === 'connected' && updatedAt ? `Updated ${istClock(updatedAt, true)}` : undefined}
          note="Snapshot from the market-data relay, refreshed every 30s while the tab is open — not tick-by-tick."
        />
      </Header>

      {/* index tabs + refresh */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div role="group" aria-label="Index" style={{ display: 'flex', gap: 6 }}>
          {INDICES.map((ix) => {
            const on = index === ix;
            return (
              <button
                key={ix}
                onClick={() => setIndex(ix)}
                aria-pressed={on}
                className="btn btn-sm"
                style={on
                  ? { background: 'var(--grad)', color: '#fff', fontWeight: 800 }
                  : { border: '1px solid var(--line2)', color: 'var(--muted)' }}
              >
                {ix}
              </button>
            );
          })}
        </div>
        <RefreshButton onRefresh={() => fetchNow({ manual: true })} busy={refreshing || state === 'loading'} />
      </div>

      {state === 'offline' ? (
        <DataUnavailable
          icon="🛰️"
          title="Market data unavailable"
          message="The market-data relay could not be reached. The heatmap needs a running relay (NEXT_PUBLIC_RELAY_URL); no placeholder values are shown."
          onRetry={() => fetchNow({ manual: true })}
          retrying={refreshing}
        />
      ) : state === 'loading' && rows.length === 0 ? (
        <SkeletonGrid />
      ) : rows.length === 0 ? (
        <DataUnavailable icon="📊" title="No constituents returned" message={`The relay returned no rows for ${index}.`} onRetry={() => fetchNow({ manual: true })} />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'var(--muted)', marginBottom: 12, flexWrap: 'wrap' }}>
            <span><span style={{ color: 'var(--green)' }}>▲ {b.up}</span> advancing</span>
            <span><span style={{ color: 'var(--red)' }}>▼ {b.down}</span> declining</span>
            {b.flat > 0 && <span>• {b.flat} unchanged</span>}
            {b.unknown > 0 && <span className="dim">{b.unknown} no data</span>}
            <span className="dim">{b.total} {index} constituents{!marketOpen ? ' · market closed' : ''}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 8 }}>
            {rows.map((r) => {
              const ts = tileStyle(r.changePct);
              const label = `${r.symbol}${r.changePct == null ? ', change unavailable' : `, ${pct(r.changePct)}`}`;
              return (
                <div
                  key={r.symbol}
                  aria-label={label}
                  title={r.name || r.symbol}
                  style={{
                    border: `1px solid ${ts.borderColor}`, background: ts.background, borderRadius: 8,
                    padding: '10px 10px', minHeight: 56, display: 'flex', flexDirection: 'column',
                    justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 3,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', whiteSpace: 'nowrap' }}>
                    {r.symbol}
                  </span>
                  <span style={{
                    fontSize: 11.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums',
                    color: r.changePct == null ? 'var(--muted)' : r.changePct >= 0 ? 'var(--green)' : 'var(--red)',
                  }}>
                    {r.changePct == null ? '—' : `${r.changePct >= 0 ? '▲' : '▼'} ${pct(r.changePct)}`}
                  </span>
                  {r.price != null && (
                    <span className="dim" style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums' }}>
                      ₹{r.price.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function Header({ children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
      <div>
        <Link href="/portal/analytics" style={{ fontSize: 12, color: 'var(--muted)' }}>← Analytics</Link>
        <h1 style={{ fontSize: 20, margin: '4px 0 0', fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}>Market Heatmap</h1>
      </div>
      {children}
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 8 }}>
      {Array.from({ length: 24 }).map((_, i) => (
        <div key={i} style={{ height: 56, borderRadius: 8, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  );
}
