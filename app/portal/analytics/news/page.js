'use client';

/* ============================================================
   /portal/analytics/news  —  Indian market news

   Source: /api/news -> real public RSS from Economic Times & Moneycontrol
   (server-side, normalised in lib/providers/news). No API key, no
   fabricated sources, no placeholder articles.

   - "Updated <fetchedAt> IST" from the API envelope (not "Live")
   - a degraded banner when one feed failed
   - category filter shown ONLY if the returned items carry categories
   - no search box (the feeds have no search), no infinite scroll
     (RSS returns a fixed set) — the full set is shown
   - images are lazy-loaded and hidden on error; no stock photos
   ============================================================ */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { istDateTime, relativeAge } from '@/lib/marketTime';
import MarketDataStatus from '@/components/market/MarketDataStatus';
import DataUnavailable from '@/components/market/DataUnavailable';
import RefreshButton from '@/components/market/RefreshButton';

export default function NewsPage() {
  const [data, setData] = useState(null); // { articles, fetchedAt, sources, degraded }
  const [state, setState] = useState('loading'); // loading | ok | error
  const [errMsg, setErrMsg] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [cat, setCat] = useState('all');

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    if (!manual) setState('loading');
    try {
      const res = await fetch('/api/news', { cache: 'no-store' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.error) {
        setErrMsg(body?.error || `News service returned ${res.status}.`);
        setState('error');
      } else {
        setData(body);
        setState('ok');
      }
    } catch (e) {
      setErrMsg('Could not reach the news service.');
      setState('error');
    } finally {
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(false); }, [load]);

  const articles = data?.articles || [];
  const categories = useMemo(() => {
    const set = new Set();
    for (const a of articles) if (a.category) set.add(a.category);
    return [...set].sort();
  }, [articles]);

  const shown = cat === 'all' ? articles : articles.filter((a) => a.category === cat);

  return (
    <div className="portal-dashboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <Link href="/portal/analytics" style={{ fontSize: 12, color: 'var(--muted)' }}>← Analytics</Link>
          <h1 style={{ fontSize: 20, margin: '4px 0 0', fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}>Market News</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <MarketDataStatus
            state={state === 'ok' ? 'connected' : state === 'error' ? 'offline' : 'loading'}
            updatedLabel={data?.fetchedAt ? `Updated ${relativeAge(data.fetchedAt)}` : undefined}
            note={data?.fetchedAt ? `Fetched ${istDateTime(data.fetchedAt)} from ${(data.sources || []).join(', ')}` : undefined}
          />
          <RefreshButton onRefresh={() => load(true)} busy={refreshing || state === 'loading'} />
        </div>
      </div>

      {state === 'loading' && <SkeletonList />}

      {state === 'error' && (
        <DataUnavailable
          icon="📰"
          title="Market news is unavailable"
          message={`${errMsg} No headlines are shown when the feeds can't be reached.`}
          onRetry={() => load(true)}
          retrying={refreshing}
        />
      )}

      {state === 'ok' && (
        <>
          {data?.degraded && (
            <div className="card" style={{ padding: '10px 14px', marginBottom: 12, borderColor: 'rgba(245,185,62,.3)', background: 'rgba(245,185,62,.06)' }}>
              <span className="muted" style={{ fontSize: 12 }}>Some sources are temporarily unavailable — showing headlines from {(data.sources || []).join(', ') || 'the reachable feeds'}.</span>
            </div>
          )}

          {categories.length > 1 && (
            <div role="group" aria-label="Category filter" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {['all', ...categories].map((c) => {
                const on = cat === c;
                return (
                  <button key={c} onClick={() => setCat(c)} aria-pressed={on} className="btn btn-sm"
                    style={on ? { background: 'var(--grad)', color: '#fff' } : { border: '1px solid var(--line2)', color: 'var(--muted)' }}>
                    {c === 'all' ? 'All' : c}
                  </button>
                );
              })}
            </div>
          )}

          {shown.length === 0 ? (
            <DataUnavailable icon="📰" title="No market news available" message="The feeds returned no headlines right now. Try refreshing shortly." onRetry={() => load(true)} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {shown.map((a) => <NewsCard key={a.id} a={a} />)}
            </div>
          )}

          <p className="dim" style={{ fontSize: 10.5, marginTop: 14 }}>
            Headlines link to the original publisher. FundedDesk is not affiliated with these sources and does not
            edit their content.
          </p>
        </>
      )}
    </div>
  );
}

function NewsCard({ a }) {
  const [imgOk, setImgOk] = useState(!!a.imageUrl);
  const body = (
    <div style={{ display: 'flex', gap: 12 }}>
      {imgOk && a.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={a.imageUrl}
          alt=""
          loading="lazy"
          onError={() => setImgOk(false)}
          style={{ width: 84, height: 60, objectFit: 'cover', borderRadius: 8, flexShrink: 0, background: 'var(--bg2)' }}
        />
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{a.title}</div>
        {a.summary && (
          <p className="muted" style={{ fontSize: 12, margin: '5px 0 0', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {a.summary}
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
          <span className="dim" style={{ fontSize: 11 }}>{a.source}</span>
          {a.publishedAt && <span className="dim" style={{ fontSize: 11 }}>· {relativeAge(a.publishedAt)}</span>}
          {a.category && <span className="tag tag-muted" style={{ fontSize: 9.5 }}>{a.category}</span>}
          {a.url && <span className="dim" style={{ fontSize: 11 }}>· opens {hostOf(a.url)} ↗</span>}
        </div>
      </div>
    </div>
  );

  if (!a.url) {
    return <div className="card" style={{ padding: 14 }}>{body}</div>;
  }
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card"
      style={{ padding: 14, display: 'block', textDecoration: 'none', color: 'inherit' }}
    >
      {body}
    </a>
  );
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return 'source'; }
}

function SkeletonList() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card" style={{ height: 78, animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  );
}
