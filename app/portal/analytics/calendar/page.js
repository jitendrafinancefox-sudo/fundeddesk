'use client';

/* ============================================================
   /portal/analytics/calendar  —  Market events

   Source: the `economic_events` Supabase table (public read), which is
   MAINTAINED BY THE FUNDEDDESK TEAM — it is NOT a live economic-calendar
   provider feed. Real columns only: title, event_date (DATE), category, notes.

   There is no importance / country / time / previous / forecast / actual
   in the schema, so none is shown or invented. Dates are formatted from the
   plain YYYY-MM-DD string (no ambiguous local Date parsing).
   ============================================================ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { calendarDateLabel, calendarMonthKey, monthLabel, istTodayYmd } from '@/lib/marketTime';
import MarketDataStatus from '@/components/market/MarketDataStatus';
import DataUnavailable from '@/components/market/DataUnavailable';
import RefreshButton from '@/components/market/RefreshButton';

const RANGE = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
];

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [state, setState] = useState('loading'); // loading | ok | error
  const [errMsg, setErrMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState('upcoming');
  const [cat, setCat] = useState('all');
  const [fetchedAt, setFetchedAt] = useState(null);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true); else setState('loading');
    const { data, error } = await supabase
      .from('economic_events')
      .select('id, title, event_date, category, notes, created_at')
      .order('event_date', { ascending: true });
    if (error) { setErrMsg(error.message); setState('error'); }
    else { setEvents(Array.isArray(data) ? data : []); setState('ok'); setFetchedAt(Date.now()); }
    if (manual) setRefreshing(false);
  }, []);

  useEffect(() => { load(false); }, [load]);

  const today = istTodayYmd();
  const categories = useMemo(() => {
    const s = new Set();
    for (const e of events) if (e.category) s.add(e.category);
    return [...s].sort();
  }, [events]);

  const filtered = events.filter((e) => {
    const d = typeof e.event_date === 'string' ? e.event_date.slice(0, 10) : '';
    if (range === 'upcoming' && d && d < today) return false;
    if (range === 'past' && (!d || d >= today)) return false;
    if (cat !== 'all' && e.category !== cat) return false;
    return true;
  });

  const groups = useMemo(() => {
    const map = new Map();
    for (const e of filtered) {
      const key = calendarMonthKey(e.event_date || '');
      if (!key) continue;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  }, [filtered]);

  return (
    <div className="portal-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <Link href="/portal/analytics" style={{ fontSize: 12, color: 'var(--muted)' }}>← Analytics</Link>
          <h1 style={{ fontSize: 20, margin: '4px 0 0', fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}>Market Events</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <MarketDataStatus
            state={state === 'ok' ? 'connected' : state === 'error' ? 'offline' : 'loading'}
            note="Curated by the FundedDesk team — not a live economic-calendar feed."
          />
          <RefreshButton onRefresh={() => load(true)} busy={refreshing || state === 'loading'} />
        </div>
      </div>

      <p className="muted" style={{ fontSize: 12, margin: '0 0 14px', lineHeight: 1.5, maxWidth: 620 }}>
        Dates below are calendar dates (IST). This list is maintained by the team; importance, forecast and actual
        figures are not tracked, so they are not shown.
      </p>

      {state === 'loading' && <SkeletonList />}

      {state === 'error' && (
        <DataUnavailable icon="🗓️" title="Events unavailable" message={`Could not load market events: ${errMsg}`} onRetry={() => load(true)} retrying={refreshing} />
      )}

      {state === 'ok' && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <div role="group" aria-label="Range" style={{ display: 'flex', gap: 6 }}>
              {RANGE.map((r) => {
                const on = range === r.key;
                return (
                  <button key={r.key} onClick={() => setRange(r.key)} aria-pressed={on} className="btn btn-sm"
                    style={on ? { background: 'var(--grad)', color: '#fff' } : { border: '1px solid var(--line2)', color: 'var(--muted)' }}>
                    {r.label}
                  </button>
                );
              })}
            </div>
            {categories.length > 0 && (
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                aria-label="Category"
                style={{ width: 'auto', padding: '6px 10px', fontSize: 12.5, background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 8, color: 'var(--text)' }}
              >
                <option value="all">All categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          {groups.length === 0 ? (
            <DataUnavailable icon="🗓️" title="No market events available" message={events.length === 0 ? 'No events have been published yet.' : 'No events match this filter.'} />
          ) : (
            <div className="card" style={{ padding: 0 }}>
              {groups.map(([key, list]) => (
                <div key={key}>
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--line)', background: 'rgba(34,197,139,0.03)', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                    {monthLabel(key)}
                  </div>
                  {list.map((e) => (
                    <div key={e.id} style={{ padding: '12px 16px', borderBottom: '1px solid rgba(34,197,139,0.06)', display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 92, fontSize: 12, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                        {calendarDateLabel(e.event_date)}
                      </div>
                      <div style={{ flex: 1, minWidth: 180 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{e.title}</div>
                        {e.notes && <p className="muted" style={{ fontSize: 12, margin: '4px 0 0', lineHeight: 1.5 }}>{e.notes}</p>}
                      </div>
                      {e.category && <span className="tag tag-muted" style={{ fontSize: 10 }}>{e.category}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="card" style={{ padding: 16 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ height: 44, borderRadius: 8, background: 'rgba(255,255,255,0.04)', marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  );
}
