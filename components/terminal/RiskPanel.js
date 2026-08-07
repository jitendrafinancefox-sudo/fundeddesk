'use client';
import { useState, useMemo } from 'react';
import { ShieldAlert, Calculator } from 'lucide-react';
import { usePrice } from '@/stores/PriceBus';
import { marginFor, lotSizeFor, fmtINR } from '@/stores/TradingStore';
import { inputNum, fmtNum, fmtQty } from './tradingUI';

// Risk Panel — live risk calculator. Recomputes on every keystroke + every
// live price tick (entry auto-fills from the LTP); no button required.
export default function RiskPanel({ selection, underlying, token, kind }) {
  const quote = usePrice(token);
  const ltp = quote.ltp;
  const lotSize = lotSizeFor(underlying);
  const kindType = selection ? 'option' : kind || 'stock';

  const [lots, setLots] = useState('1');
  const [entry, setEntry] = useState('');
  const [sl, setSl] = useState('');
  const [target, setTarget] = useState('');

  const result = useMemo(() => {
    const entryPrice = entry === '' ? null : Number(entry);
    const safeEntry = entryPrice ?? ltp ?? null;
    const qty = (Number(lots) || 0) * lotSize;
    const slPrice = sl === '' ? null : Number(sl);
    const tpPrice = target === '' ? null : Number(target);

    if (!safeEntry || qty <= 0) {
      return { ready: false };
    }
    const riskPerUnit = slPrice != null ? Math.abs(safeEntry - slPrice) : null;
    const rewardPerUnit = tpPrice != null ? Math.abs(tpPrice - safeEntry) : null;
    const risk = riskPerUnit != null ? riskPerUnit * qty : null;
    const reward = rewardPerUnit != null ? rewardPerUnit * qty : null;
    const rr = risk && reward ? reward / risk : null;
    const margin = marginFor({ qty, price: safeEntry, kind: kindType });

    return {
      ready: true,
      risk, reward, rr, margin,
      lotSize, qty, notional: safeEntry * qty,
      riskPctOfNotional: risk && safeEntry * qty ? (risk / (safeEntry * qty)) * 100 : null,
    };
  }, [lots, entry, sl, target, lotSize, kindType]);

  if (!token) {
    return (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: '#787b86', fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
        Select an instrument to calculate risk
      </div>
    );
  }

  const stat = (label, value, accent, sub) => (
    <div style={{ flex: '1 1 120px', minWidth: 130, padding: '10px 12px', background: '#f8f9fa', border: '1px solid #e0e3eb', borderRadius: 8 }}>
      <div style={{ fontSize: 10, color: '#787b86', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: accent || '#222222', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#b2b5be', marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#ffffff', fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
      <div style={{ padding: '8px 14px', borderBottom: '1px solid #e0e3eb', display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#787b86', flexShrink: 0 }}>
        <ShieldAlert size={13} color="#2962ff" />
        Risk Calculator
        <span style={{ flex: 1 }} />
        <span style={{ color: '#787b86' }}>
          Lot size <b style={{ color: '#222222' }}>{fmtQty(lotSize)}</b>
          {ltp != null && <> · LTP <b style={{ color: '#222222' }}>{fmtNum(ltp)}</b></>}
        </span>
      </div>

      <div style={{ padding: '12px 14px', display: 'flex', gap: 20, flexWrap: 'wrap', flex: 1, alignItems: 'flex-start' }}>
        {/* Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 260, flexShrink: 0 }}>
          {[
            { label: 'Entry', value: entry, set: setEntry, ph: ltp != null ? fmtNum(ltp) : 'e.g. 24600' },
            { label: 'Stop Loss', value: sl, set: setSl, ph: 'e.g. 24550' },
            { label: 'Target / Reward', value: target, set: setTarget, ph: 'e.g. 24700' },
          ].map((f) => (
            <label key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#787b86' }}>
              <span style={{ width: 92 }}>{f.label}</span>
              <input
                type="number" step="0.05" placeholder={f.ph}
                value={f.value}
                onChange={(e) => f.set(e.target.value)}
                style={inputNum}
              />
            </label>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#787b86' }}>
            <span style={{ width: 92 }}>Quantity</span>
            <input
              type="number" min="1" step="1" placeholder="1"
              value={lots}
              onChange={(e) => setLots(e.target.value)}
              style={inputNum}
            />
            <span style={{ fontSize: 10, color: '#b2b5be' }}>
              = {fmtQty((Number(lots) || 0) * lotSize)} qty
            </span>
          </label>
          <button
            onClick={() => { setEntry(ltp != null ? String(ltp) : ''); }}
            style={{
              alignSelf: 'flex-start', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
              border: '1px solid #e0e3eb', background: '#ffffff', color: '#2962ff', cursor: 'pointer',
              fontFamily: 'Inter, sans-serif', display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            <Calculator size={11} /> Use LTP as entry
          </button>
        </div>

        {/* Outputs */}
        <div style={{ flex: 1, minWidth: 320, display: 'flex', flexWrap: 'wrap', gap: 10, alignContent: 'flex-start' }}>
          {stat(
            'Risk / Trade',
            result.ready ? fmtINR(result.risk) : '—',
            '#ef5350',
            result.ready && result.riskPctOfNotional != null ? `${result.riskPctOfNotional.toFixed(1)}% of notional` : null
          )}
          {stat(
            'Reward',
            result.ready ? fmtINR(result.reward) : '—',
            '#26a69a'
          )}
          <div style={{ width: '100%' }} />
          {stat(
            'Risk : Reward',
            result.ready && result.rr != null ? `1 : ${result.rr.toFixed(2)}` : '—',
            result.ready && result.rr != null && result.rr >= 1 ? '#26a69a' : '#f2994a',
            result.ready && result.rr != null ? (result.rr >= 1 ? 'Good risk profile' : 'Risky setup') : null
          )}
          {stat('Margin Required', result.ready ? fmtINR(result.margin) : '—', '#2962ff')}
          {stat('Max Loss', result.ready ? fmtINR(result.risk) : '—', '#ef5350')}
          {stat('Potential Profit', result.ready ? fmtINR(result.reward) : '—', '#26a69a')}
          {stat('Position Size', result.ready ? fmtQty(result.qty) + ' qty' : '—')}
          {result.ready && (
            <div style={{ width: '100%' }}>
              <div style={{ height: 8, borderRadius: 4, background: '#eef0f4', overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: `${(result.risk / Math.max(result.risk + result.reward, 1)) * 100}%`, background: '#ef5350' }} />
                <div style={{ flex: 1, background: '#26a69a' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#b2b5be', marginTop: 4 }}>
                <span>Risk {fmtINR(result.risk)}</span>
                <span>Reward {fmtINR(result.reward)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}