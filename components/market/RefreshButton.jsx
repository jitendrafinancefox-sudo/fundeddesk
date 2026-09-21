'use client';

import { RefreshCw } from 'lucide-react';

/* Real refresh control. `onRefresh` must actually re-fetch; the button is
   disabled while `busy` so requests cannot overlap. Batch 11. */
export default function RefreshButton({ onRefresh, busy = false, label = 'Refresh' }) {
  return (
    <button
      type="button"
      className="btn btn-line btn-sm"
      onClick={onRefresh}
      disabled={busy}
      aria-label={label}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
    >
      <RefreshCw size={13} style={busy ? { animation: 'spin 1s linear infinite' } : undefined} />
      {busy ? 'Refreshing…' : label}
    </button>
  );
}
