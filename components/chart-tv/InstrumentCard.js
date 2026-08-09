'use client';
import { usePrice } from '@/stores/PriceBus';

const UP = '#16a34a';
const DOWN = '#f23645';

export default function InstrumentCard({ chart, getCandles }) {
  const quote = usePrice(chart.token);
  const candles = getCandles ? getCandles() : [];
  const last = candles.length ? candles[candles.length - 1] : null;
  const lastPrice = quote?.ltp ?? last?.close ?? null;
  const prevClose = candles.length ? candles[0].open : null;
  const low = candles.length ? Math.min(...candles.map((c) => c.low)) : null;
  const high = candles.length ? Math.max(...candles.map((c) => c.high)) : null;
  const change = lastPrice != null && prevClose != null ? lastPrice - prevClose : null;
  const changePct = change != null && prevClose != null ? (change / prevClose) * 100 : null;
  const pos = low != null && high != null && lastPrice != null && high > low ? Math.min(1, Math.max(0, (lastPrice - low) / (high - low))) : null;
  const tone = change == null || change === 0 ? '#6b7280' : change > 0 ? UP : DOWN;

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      padding: '10px 14px',
      background: '#ffffff',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      alignItems: 'center',
      gap: 22,
      flexWrap: 'wrap',
    }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{chart.symbol || chart.label} <span style={{ color: '#6b7280', fontWeight: 500 }}>· {chart.exchange || 'NSE'}</span></div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{lastPrice != null ? lastPrice.toFixed(2) : '—'}</div>
      </div>
      <div style={{ minWidth: 110 }}>
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Change</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: tone }}>
          {change != null ? `${change > 0 ? '+' : ''}${change.toFixed(2)}` : '—'}
          {changePct != null ? ` (${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%)` : ''}
        </div>
      </div>
      <div style={{ flex: 1, minWidth: 180 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6b7280', marginBottom: 4 }}>
          <span>{low != null ? `Low ${low.toFixed(2)}` : 'Low —'}</span>
          <span>{high != null ? `High ${high.toFixed(2)}` : 'High —'}</span>
        </div>
        <div style={{ position: 'relative', height: 6, borderRadius: 3, background: '#e5e7eb', overflow: 'visible' }}>
          {pos != null && (
            <div style={{
              position: 'absolute',
              top: -3,
              left: `calc(${(pos * 100).toFixed(2)}% - 4px)`,
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: tone,
              border: '2px solid #ffffff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
          )}
        </div>
      </div>
    </div>
  );
}
