'use client';

/* Honest empty / error card for market-intelligence pages. Batch 11.
   No fake rows, no stack traces. `onRetry` is only wired to a button when
   it is a real re-fetch. */

export default function DataUnavailable({
  title = 'Data unavailable',
  message,
  onRetry,
  retrying = false,
  icon = '📉',
}) {
  return (
    <div className="card" style={{ padding: '34px 22px', textAlign: 'center', maxWidth: 460, margin: '0 auto' }}>
      <div style={{ fontSize: 26, marginBottom: 10 }} aria-hidden="true">{icon}</div>
      <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>{title}</h2>
      {message && <p className="muted" style={{ fontSize: 12.5, margin: '0 0 16px', lineHeight: 1.6 }}>{message}</p>}
      {onRetry && (
        <button className="btn btn-line btn-sm" onClick={onRetry} disabled={retrying}>
          {retrying ? 'Retrying…' : 'Try again'}
        </button>
      )}
    </div>
  );
}
