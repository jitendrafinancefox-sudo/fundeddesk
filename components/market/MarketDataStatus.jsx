'use client';

/* Truthful freshness pill for market-intelligence pages. Batch 11.
   `state` must reflect what is actually known — never pass "live" unless
   the source genuinely streams. These pages only ever pass:
     - "connected" + the client fetch time  (a snapshot succeeded)
     - "cached"    + the server fetch time  (served from server cache)
     - "offline"                            (the source is unreachable) */

const MAP = {
  connected: { label: 'Connected', dot: 'var(--green)' },
  cached: { label: 'Cached', dot: 'var(--gold)' },
  delayed: { label: 'Delayed', dot: 'var(--gold)' },
  offline: { label: 'Offline', dot: 'var(--red)' },
  loading: { label: 'Loading…', dot: 'var(--muted)' },
};

export default function MarketDataStatus({ state = 'loading', updatedLabel, note }) {
  const s = MAP[state] || MAP.loading;
  return (
    <span
      title={note || undefined}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 10px',
        borderRadius: 99, border: '1px solid var(--line2)', background: 'var(--card, #0E111C)',
        fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot }} />
      {s.label}
      {updatedLabel && <span className="dim" style={{ fontWeight: 500 }}>· {updatedLabel}</span>}
    </span>
  );
}
