'use client';
import { useEffect, useState } from 'react';

const RECENT_MS = [
  { label: 'now', max: 0 },
  { label: '1h', max: 60 * 60 * 1000 },
  { label: '2h', max: 2 * 60 * 60 * 1000 },
  { label: '6h', max: 6 * 60 * 60 * 1000 },
  { label: '12h', max: 12 * 60 * 60 * 1000 },
  { label: '1d', max: 24 * 60 * 60 * 1000 },
  { label: '2d', max: 2 * 24 * 60 * 60 * 1000 },
];

function relativeTime(pubDate) {
  const ms = Date.now() - new Date(pubDate).getTime();
  for (const r of RECENT_MS) {
    if (ms <= r.max) return r.label === 'now' ? 'just now' : `${r.label} ago`;
  }
  return 'older';
}

export default function Page() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch('/api/news')
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setErr(data.error);
        else setArticles(data);
        setLoading(false);
      })
      .catch((e) => { setErr(e.message); setLoading(false); });
  }, []);

  if (loading) return <div className="card" style={{ padding: 34, textAlign: 'center' }}><p className="muted">Loading market news…</p></div>;
  if (err) return <div className="card" style={{ padding: 34, textAlign: 'center' }}><p className="err">Could not load news: {err}</p></div>;

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Market News</h2>
      </div>
      <div style={{ padding: '12px 18px' }}>
        {articles.length === 0 && <p className="muted" style={{ fontSize: 13.5 }}>No headlines right now. Check back soon.</p>}
        {articles.map((a, i) => (
          <a
            key={`${a.source}-${a.link}-${i}`}
            href={a.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', padding: '10px 0', borderBottom: i < articles.length - 1 ? '1px solid var(--line)' : 'none',
              textDecoration: 'none', color: 'inherit',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline' }}>
              <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{a.title}</span>
              <span style={{ fontSize: 11, color: 'var(--dim)', whiteSpace: 'nowrap' }}>{relativeTime(a.pubDate)}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4 }}>{a.source}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
