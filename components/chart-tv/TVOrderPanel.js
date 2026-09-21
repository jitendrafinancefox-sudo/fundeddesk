'use client';
import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useTradeState } from '@/stores/TradingStore';

// Only these two are implemented by the simulator engine (TradingStore) —
// Stop / Stop-Limit are intentionally not offered since nothing fills them.
const ORDER_TYPES = ['Market', 'Limit'];

// Estimated per-order charges (NSE option segment, indicative):
//   brokerage ₹20 flat · STT 0.0625% of turnover · exchange txn 0.05% ·
//   GST 18% on brokerage + exchange txn.
const estimateCharges = (turnover) => {
  const brokerage = 20;
  const stt = turnover * 0.000625;
  const exchange = turnover * 0.0005;
  const gst = (brokerage + exchange) * 0.18;
  return { brokerage, stt, exchange, gst, total: brokerage + stt + exchange + gst };
};

export default function TVOrderPanel({ open, selection, chain, side: defaultSide, lots: defaultLots, setLots, sl, setSl, tp, setTp, orderType: defaultOrderType, setOrderType: pushOrderType, limitPrice: defaultLimitPrice, setLimitPrice: pushLimitPrice, submitting, onClose, onSubmit }) {
  const [side, setSide] = useState(defaultSide || 'BUY');
  const [orderType, setOrderType] = useState(defaultOrderType || 'Market');
  const [lots, setLotsLocal] = useState(defaultLots || '1');
  const [limitPrice, setLimitPrice] = useState(defaultLimitPrice || '');
  const [target, setTarget] = useState(tp || '');
  const [stoploss, setStoploss] = useState(sl || '');
  const account = useTradeState('account');
  const availableMargin = account?.available;

  useEffect(() => { setSide(defaultSide || 'BUY'); }, [defaultSide]);
  useEffect(() => { setLotsLocal(defaultLots || '1'); }, [defaultLots]);
  useEffect(() => { setTarget(tp || ''); }, [tp]);
  useEffect(() => { setStoploss(sl || ''); }, [sl]);
  useEffect(() => { if (open) { setSide(defaultSide || 'BUY'); setOrderType(defaultOrderType || 'Market'); setLimitPrice(defaultLimitPrice || ''); } }, [open, defaultSide]);

  if (!open || !selection) return null;

  const lotSize = chain?.lot || 1;
  const lastPrice = Number(selection.lastPrice) || 0;
  const inr = (v) => (Number.isFinite(v) ? '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '—');

  // --- Sanitized numerics: every derived value stays finite -----------------
  const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
  const lotsNum = num(lots);
  const lotsValid = lotsNum != null && Number.isInteger(lotsNum) && lotsNum >= 1;
  const quantity = lotsValid ? lotsNum * lotSize : 0;

  const limitNum = num(limitPrice);
  const targetNum = target === '' ? null : num(target);
  const stopNum = stoploss === '' ? null : num(stoploss);

  const needsLimit = orderType === 'Limit';
  const limitValid = !needsLimit || (limitNum != null && limitNum > 0);

  const execPrice = needsLimit ? (limitNum && limitNum > 0 ? limitNum : 0) : lastPrice;
  const estCost = quantity * (execPrice > 0 ? execPrice : lastPrice);
  const marginRequired = estCost * 0.2;

  // SL/TP must sit on the correct side of the reference price, or the
  // simulator's bracket check would fire the moment the position opens.
  const refPrice = needsLimit && limitNum > 0 ? limitNum : lastPrice;
  const slDirectionValid = stopNum == null || refPrice <= 0 || (side === 'BUY' ? stopNum < refPrice : stopNum > refPrice);
  const tpDirectionValid = targetNum == null || refPrice <= 0 || (side === 'BUY' ? targetNum > refPrice : targetNum < refPrice);

  const valid = lotsValid && limitValid && estCost > 0 && slDirectionValid && tpDirectionValid;

  // --- Risk preview (BUY: stop below entry; SELL: stop above entry) ---------
  let riskAmount = null; let rewardAmount = null; let rr = null;
  if (stopNum != null && targetNum != null && refPrice > 0) {
    const riskPerUnit = side === 'BUY' ? refPrice - stopNum : stopNum - refPrice;
    const rewardPerUnit = side === 'BUY' ? targetNum - refPrice : refPrice - targetNum;
    if (riskPerUnit > 0 && quantity > 0) {
      riskAmount = riskPerUnit * quantity;
      if (rewardPerUnit > 0) { rewardAmount = rewardPerUnit * quantity; rr = rewardPerUnit / riskPerUnit; }
    }
  }

  // Charges + net P&L (live): gross reward/risk minus estimated charges.
  const charges = estCost > 0 ? estimateCharges(estCost) : null;
  let netReward = null; let netRisk = null;
  if (riskAmount != null && charges) {
    netReward = rewardAmount != null ? rewardAmount - charges.total : null;
    netRisk = riskAmount + charges.total;
  }

  const errors = [];
  if (!lotsValid) errors.push('Enter a valid lot count (≥ 1).');
  if (!limitValid) errors.push('Enter a valid limit price.');
  if (!slDirectionValid) errors.push(side === 'BUY' ? 'Stop loss must be below the reference price.' : 'Stop loss must be above the reference price.');
  if (!tpDirectionValid) errors.push(side === 'BUY' ? 'Target must be above the reference price.' : 'Target must be below the reference price.');

  const handleSubmit = () => {
    if (!valid || submitting) return;
    setLots?.(String(lotsNum));
    setSl?.(stoploss);
    setTp?.(target);
    pushOrderType?.(orderType);
    pushLimitPrice?.(needsLimit ? String(limitNum) : '');
    onSubmit?.();
  };

  return (
    <div role="dialog" aria-label={`${side} order ticket`} style={{
      position: 'fixed', top: 0, right: 0, bottom: 0,
      width: 340, maxWidth: '90vw',
      background: 'var(--surface)',
      borderLeft: '1px solid var(--border)',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
      zIndex: 120,
      display: 'flex', flexDirection: 'column',
      animation: 'slideInRight 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
              {selection.underlying || 'NIFTY'} {selection.strike} {selection.type}
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              Exp {chain?.expiry || '—'} · Lot {lotSize}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 4,
            display: 'grid', placeItems: 'center',
            background: 'transparent', border: 'none',
            color: 'var(--muted)', cursor: 'pointer',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* BUY / SELL Toggle */}
        <div style={{ display: 'flex', gap: 0, padding: '12px 16px 0', flexShrink: 0 }}>
          {['BUY', 'SELL'].map((s) => (
            <button key={s} onClick={() => setSide(s)} style={{
              flex: 1, padding: '8px 0', fontSize: 12, fontWeight: 700,
              fontFamily: 'Inter, sans-serif', letterSpacing: '0.03em',
              border: 'none', cursor: 'pointer', transition: 'all 0.1s',
              background: side === s
                ? (s === 'BUY' ? 'var(--green)' : 'var(--red)')
                : (s === 'BUY' ? 'rgba(38,166,154,0.06)' : 'rgba(239,83,80,0.06)'),
              color: side === s ? '#ffffff' : (s === 'BUY' ? 'var(--green)' : 'var(--red)'),
              borderRadius: s === 'BUY' ? '4px 0 0 4px' : '0 4px 4px 0',
            }}>
              {s}
            </button>
          ))}
        </div>

        {/* Order Type */}
        <div style={{ padding: '12px 16px 0', flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            Order Type
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {ORDER_TYPES.map((t) => (
              <button key={t} onClick={() => setOrderType(t)} style={{
                flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 500,
                fontFamily: 'Inter, sans-serif',
                borderRadius: 3, border: '1px solid',
                borderColor: orderType === t ? 'var(--blue)' : 'var(--border)',
                background: orderType === t ? 'rgba(41,98,255,0.06)' : 'transparent',
                color: orderType === t ? 'var(--blue)' : 'var(--muted)',
                cursor: 'pointer', transition: 'all 0.1s',
              }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs */}
        <div className="terminal-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 16px' }}>
          {/* Lots */}
          <Field label="Lots">
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <button onClick={() => setLotsLocal(String(Math.max(1, (num(lots) || 1) - 1)))} style={{
                width: 32, height: 32, border: 'none', background: 'var(--bg2)',
                color: 'var(--muted)', fontSize: 14, cursor: 'pointer',
              }}>−</button>
              <input
                value={lots} type="number" min="1"
                onChange={(e) => setLotsLocal(e.target.value)}
                style={{
                  flex: 1, height: 32, border: 'none', textAlign: 'center',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
                  color: 'var(--text)', background: 'transparent',
                }}
              />
              <button onClick={() => setLotsLocal(String((num(lots) || 1) + 1))} style={{
                width: 32, height: 32, border: 'none', background: 'var(--bg2)',
                color: 'var(--muted)', fontSize: 14, cursor: 'pointer',
              }}>+</button>
            </div>
            <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 3, fontVariantNumeric: 'tabular-nums' }}>
              Qty: {lotsValid ? quantity.toLocaleString('en-IN') : '—'} ({lotsValid ? quantity / lotSize : '—'} × {lotSize})
            </div>
          </Field>

          {/* Limit Price — only for Limit orders */}
          {needsLimit && (
            <Field label="Price">
              <input
                value={limitPrice} type="number"
                placeholder={lastPrice ? String(lastPrice) : '0.00'}
                onChange={(e) => setLimitPrice(e.target.value)}
                onFocus={(e) => focusStyle(e, true)}
                onBlur={(e) => focusStyle(e, false)}
                style={inputStyle}
              />
            </Field>
          )}

          {/* Target */}
          <Field label="Target (optional)">
            <input
              value={target} type="number"
              placeholder="Target price"
              onChange={(e) => setTarget(e.target.value)}
              onFocus={(e) => focusStyle(e, true)}
              onBlur={(e) => focusStyle(e, false)}
              style={inputStyle}
            />
          </Field>

          {/* Stop Loss */}
          <Field label="Stop Loss (optional)">
            <input
              value={stoploss} type="number"
              placeholder="Stop loss price"
              onChange={(e) => setStoploss(e.target.value)}
              onFocus={(e) => focusStyle(e, true)}
              onBlur={(e) => focusStyle(e, false)}
              style={inputStyle}
            />
          </Field>

          {/* Order Summary */}
          <div style={{
            marginTop: 12, padding: '8px 10px', borderRadius: 4,
            background: 'var(--bg2)', border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Side</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: side === 'BUY' ? 'var(--green)' : 'var(--red)' }}>{side}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Order Type</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)' }}>{orderType}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Quantity</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{quantity.toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Est. Price</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                {execPrice > 0 ? execPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Est. Cost</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{inr(estCost)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Margin Required</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', fontVariantNumeric: 'tabular-nums' }}>{inr(marginRequired)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Available Margin</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{inr(availableMargin)}</span>
            </div>
          </div>

          {/* Risk Preview */}
          {riskAmount != null && (
            <div style={{
              marginTop: 8, padding: '8px 10px', borderRadius: 4,
              background: 'rgba(41,98,255,0.04)', border: '1px solid rgba(41,98,255,0.1)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Risk (SL)</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>{inr(riskAmount)}</span>
              </div>
              {rewardAmount != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>Reward (Target)</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>{inr(rewardAmount)}</span>
                </div>
              )}
              {rr != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>Reward : Risk</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', fontVariantNumeric: 'tabular-nums' }}>1 : {rr.toFixed(1)}</span>
                </div>
              )}
            </div>
          )}

          {/* Charges */}
          {charges && (
            <div style={{
              marginTop: 8, padding: '8px 10px', borderRadius: 4,
              background: 'var(--surface)', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Estimated Charges
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Brokerage</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{inr(charges.brokerage)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>STT</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{inr(charges.stt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>Exchange Txn</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{inr(charges.exchange)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>GST (18%)</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{inr(charges.gst)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>Total</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{inr(charges.total)}</span>
              </div>
            </div>
          )}

          {/* Estimated PNL (net of charges) */}
          {(netReward != null || netRisk != null) && (
            <div style={{
              marginTop: 8, padding: '8px 10px', borderRadius: 4,
              background: 'rgba(41,98,255,0.04)', border: '1px solid rgba(41,98,255,0.1)',
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Estimated P&L (net)
              </div>
              {netRisk != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>@ Stop Loss</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>−{inr(Math.abs(netRisk))}</span>
                </div>
              )}
              {netReward != null && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>@ Target</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: netReward >= 0 ? 'var(--green)' : 'var(--red)', fontVariantNumeric: 'tabular-nums' }}>
                    {netReward >= 0 ? '+' : ''}{inr(Math.abs(netReward))}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Validation */}
          {errors.length > 0 && (
            <div style={{
              marginTop: 8, padding: '6px 10px', borderRadius: 4,
              background: 'rgba(239,83,80,0.06)', border: '1px solid rgba(239,83,80,0.2)',
              display: 'flex', alignItems: 'flex-start', gap: 6,
            }}>
              <AlertCircle size={12} color="var(--red)" style={{ flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 10, color: 'var(--red)' }}>
                {errors.map((err) => <div key={err}>{err}</div>)}
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
          <button
            onClick={handleSubmit}
            disabled={!valid || submitting}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 4,
              fontSize: 13, fontWeight: 700, fontFamily: 'Inter, sans-serif',
              border: 'none', cursor: (valid && !submitting) ? 'pointer' : 'not-allowed', transition: 'all 0.1s',
              background: (!valid || submitting) ? 'var(--dim)' : (side === 'BUY' ? 'var(--green)' : 'var(--red)'),
              color: '#ffffff',
              boxShadow: valid && !submitting && (side === 'BUY'
                ? '0 2px 8px rgba(38,166,154,0.25)'
                : '0 2px 8px rgba(239,83,80,0.25)'),
            }}
            onMouseEnter={(e) => {
              if (!valid || submitting) return;
              e.currentTarget.style.background = side === 'BUY' ? '#1e8e84' : '#d32f2f';
            }}
            onMouseLeave={(e) => {
              if (!valid || submitting) return;
              e.currentTarget.style.background = side === 'BUY' ? 'var(--green)' : 'var(--red)';
            }}
          >
            {submitting
              ? 'Submitting order…'
              : `${side} ${lotsValid ? quantity.toLocaleString('en-IN') : '—'} ${[selection.underlying, selection.strike, selection.type].filter(Boolean).join(' ')}`.trim()}
          </button>
        </div>
      </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

// No outline:'none' (Phase 20 accessibility fix) — kept as the browser's
// native focus outline since this is a plain inline style object with no
// :focus-visible replacement available.
const inputStyle = {
  width: '100%', height: 32, padding: '0 10px',
  border: '1px solid var(--border)', borderRadius: 4,
  fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500,
  color: 'var(--text)', background: 'var(--bg2)',
  boxSizing: 'border-box',
  transition: 'border-color 0.1s, box-shadow 0.1s',
};

function focusStyle(e, on) {
  e.currentTarget.style.borderColor = on ? 'var(--blue)' : 'var(--border)';
  e.currentTarget.style.boxShadow = on ? '0 0 0 2px rgba(41,98,255,0.12)' : 'none';
}
