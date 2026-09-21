'use client';
import { usePrice, useQuoteStatus } from '@/stores/PriceBus';

const UP = 'var(--green)';
const DOWN = 'var(--red)';

// Compact TradingView-style chart header: symbol/exchange, live price,
// change, and the current bar's O/H/L/C. Replaces the old full-width card
// that used to sit below the chart — same real data source (PriceBus +
// the chart's own candles), just a single dense row inside the chart panel
// header instead of a separate block eating vertical space.
export default function InstrumentCard({ chart, getCandles, ready = true }) {
  const quote = usePrice(chart.token);
  // Per-token freshness (Phase 8) — never implies a price is live when the
  // last tick we actually have is old or missing. Relay-level connectivity
  // has its own existing indicator in StatusBar; this is deliberately not
  // a second copy of that, just "how old is THIS token's last tick."
  const quoteState = useQuoteStatus(chart.token);
  const candles = getCandles ? getCandles() : [];
  // `ready` reflects whether the CHART's installed candles actually belong
  // to `chart` (the current symbol identity) — see TVChart._candlesReady.
  // The symbol/exchange label above and the live price below both come
  // straight from PriceBus/props and stay instant on a switch; only the
  // O/H/L/C here can lag (candle data loads asynchronously), so only OHLC
  // is gated — showing "—" rather than the PREVIOUS symbol's bar under the
  // NEW symbol's header (Phase 21A round 2).
  const last = ready && candles.length ? candles[candles.length - 1] : null;
  const lastPrice = quote?.ltp ?? last?.close ?? null;
  const prevClose = candles.length && ready ? candles[0].open : null;
  const change = lastPrice != null && prevClose != null ? lastPrice - prevClose : null;
  const changePct = change != null && prevClose != null ? (change / prevClose) * 100 : null;
  const tone = change == null || change === 0 ? 'var(--muted)' : change > 0 ? UP : DOWN;
  const fmt = (v) => (v == null ? '—' : Number(v).toFixed(2));

  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap',
      fontFamily: 'Inter, sans-serif', minWidth: 0,
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>
        {chart.symbol || chart.label}
        <span style={{ color: 'var(--muted)', fontWeight: 500, marginLeft: 5 }}>
          · {chart.exchange || 'NSE'} · {chart.chartMode === 'strike' ? 'OPTION' : chart.chartMode === 'index' ? 'INDEX' : 'FUTURE'}
        </span>
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>{fmt(lastPrice)}</span>
      {quoteState !== 'LIVE' && (
        <span
          title={quoteState === 'STALE' ? 'No new price tick for this instrument in the last few seconds.' : 'No live price for this instrument yet.'}
          style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', padding: '1px 5px', borderRadius: 3,
            color: quoteState === 'STALE' ? 'var(--gold)' : 'var(--dim)',
            background: quoteState === 'STALE' ? 'rgba(245,185,62,0.12)' : 'rgba(120,123,134,0.12)',
            whiteSpace: 'nowrap',
          }}
        >
          {quoteState}
        </span>
      )}
      <span style={{ fontSize: 11, fontWeight: 700, color: tone, whiteSpace: 'nowrap' }}>
        {change != null ? `${change > 0 ? '+' : ''}${change.toFixed(2)}` : '—'}
        {changePct != null ? ` (${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%)` : ''}
      </span>
      <span style={{ display: 'flex', gap: 8, fontSize: 10.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
        <span>O <span style={{ color: 'var(--text)' }}>{fmt(last?.open)}</span></span>
        <span>H <span style={{ color: 'var(--text)' }}>{fmt(last?.high)}</span></span>
        <span>L <span style={{ color: 'var(--text)' }}>{fmt(last?.low)}</span></span>
        <span>C <span style={{ color: 'var(--text)' }}>{fmt(last?.close)}</span></span>
      </span>
    </div>
  );
}
