'use client';
import { useState } from 'react';
import { X, Search, RefreshCw, LineChart } from 'lucide-react';
import { T } from '@/components/terminal/theme';

// Dark-themed token set for the tv-chart terminal (FundedDesk near-black
// brand), parallel to terminal/theme.js's light T.colors — this drawer is
// only used inside /tv-chart, never by the light-themed /portal/terminal.
const D = {
  blue: 'var(--blue)',
  up: 'var(--green)',
  down: 'var(--red)',
  amber: 'var(--gold)',
  text: 'var(--text)',
  muted: 'var(--muted)',
  border: 'var(--border)',
  bg: 'var(--surface)',
  bgAlt: 'var(--bg2)',
  bgHover: 'var(--bg2)',
  blueBg: 'rgba(77,124,254,.14)',
  upBg: 'rgba(34,197,139,.035)',
  downBg: 'rgba(239,68,68,.035)',
  borderThin: '1px solid var(--border)',
  borderSoft: '1px solid var(--border)',
};

// Only underlyings the relay's /api/chain endpoint actually serves —
// FINNIFTY/SENSEX are rejected by the relay ("u must be NIFTY or BANKNIFTY"),
// so they are intentionally not offered here.
const SUPPORTED_UNDERLYINGS = [
  { id: 'NIFTY', label: 'NIFTY 50' },
  { id: 'BANKNIFTY', label: 'BANKNIFTY' },
];

const fmtN = (v) => (v == null || isNaN(v) ? '—' : Number(v).toFixed(v >= 1000 ? 0 : v >= 10 ? 2 : 4));
const fmtStrike = (v) => (v == null ? '—' : Number(v).toLocaleString('en-IN'));
const fmtQty = (v) => {
  if (v == null || isNaN(v)) return '—';
  if (v >= 1e7) return (v / 1e7).toFixed(2) + 'Cr';
  if (v >= 1e5) return (v / 1e5).toFixed(2) + 'L';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return String(v);
};
// Relay returns expiries like "22SEP2026" — this only reformats the real
// string for readability, it never invents a date.
const fmtExpiry = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const m = /^(\d{1,2})([A-Z]{3})(\d{4})$/.exec(raw);
  if (!m) return raw;
  const [, d, mon, y] = m;
  const MONTHS = { JAN: 'Jan', FEB: 'Feb', MAR: 'Mar', APR: 'Apr', MAY: 'May', JUN: 'Jun', JUL: 'Jul', AUG: 'Aug', SEP: 'Sep', OCT: 'Oct', NOV: 'Nov', DEC: 'Dec' };
  return `${d} ${MONTHS[mon] || mon} ${y}`;
};

const groupHead = (label, color) => ({
  textAlign: 'center',
  padding: '4px 4px',
  fontWeight: 700,
  fontSize: 9,
  letterSpacing: '0.06em',
  color,
  borderBottom: '1px solid ' + D.border,
  background: D.bgAlt,
  whiteSpace: 'nowrap',
});
const col = (color = D.text, tint) => ({
  textAlign: 'center',
  padding: '6px 4px',
  cursor: 'pointer',
  color,
  background: tint,
  borderBottom: '1px solid ' + D.border,
  fontWeight: 400,
  fontSize: 11,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
});
const headCol = {
  textAlign: 'center',
  padding: '5px 3px',
  fontWeight: 600,
  fontSize: 10,
  color: D.muted,
  borderBottom: '1px solid ' + D.border,
  whiteSpace: 'nowrap',
};

function SkeletonRows() {
  const pulse = { background: 'linear-gradient(90deg, var(--bg2) 25%, var(--border) 37%, var(--bg2) 63%)', backgroundSize: '400% 100%', animation: 'fd-oc-pulse 1.4s ease infinite', borderRadius: 3, height: 10 };
  return (
    <>
      <style>{'@keyframes fd-oc-pulse{0%{background-position:100% 50%}100%{background-position:0 50%}}'}</style>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: 7 }).map((__, j) => (
            <td key={j} style={{ padding: '7px 6px', borderBottom: '1px solid ' + D.border }}>
              <div style={{ ...pulse, width: j === 3 ? '60%' : '70%', margin: '0 auto' }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// Contextual [B] [S] [Chart] actions revealed on strike-row hover (Phase
// 21C, Section 4) — B/S open the real BUY/SELL order-ticket flow for that
// exact strike (via onBuy/onSell, wired by TVTerminal to the same
// switchInstrument + openOrderPanel + TradingStore.placeOrder path every
// other trade action in this terminal already uses), Chart switches the
// active chart to that instrument (the existing onSelect behavior,
// unchanged). No new execution engine, no fabricated identifiers — the
// exchange/token/strike/type all come straight from the real chain row.
function RowActions({ row, type, onSelect, onBuy, onSell }) {
  const btn = (bg, color) => ({
    flex: 1, height: 20, borderRadius: 3, border: 'none', cursor: 'pointer',
    fontSize: 9.5, fontWeight: 700, fontFamily: T.font.family,
    background: bg, color, display: 'grid', placeItems: 'center',
  });
  return (
    <div style={{ display: 'flex', gap: 3 }} onClick={(e) => e.stopPropagation()}>
      <button title={`Buy ${type}`} style={btn('var(--green)', '#052018')} onClick={() => onBuy?.(row, type)}>B</button>
      <button title={`Sell ${type}`} style={btn('var(--red)', '#fff')} onClick={() => onSell?.(row, type)}>S</button>
      <button title="Show on chart" style={btn(D.bgAlt, D.text)} onClick={() => onSelect?.(row, type)}>
        <LineChart size={11} />
      </button>
    </div>
  );
}

export default function TVOptionChainDrawer({ open, chain, status, onRetry, underlying, onUnderlyingChange, selection, onSelect, onBuy, onSell, onClose }) {
  const [search, setSearch] = useState('');
  const [expiryMenuOpen, setExpiryMenuOpen] = useState(false);
  // Phase 21C, Section 4: which row is currently hovered, so the row can
  // swap its LTP number for [B][S][Chart] contextual actions rather than
  // cluttering every row permanently. Keyed by strike since that's unique
  // within one expiry's rendered rows.
  const [hoverStrike, setHoverStrike] = useState(null);

  if (!open) return null;

  const loading = status === 'checking' && !chain;
  const failed = status === 'offline' && !chain;
  const expiryLabel = fmtExpiry(chain?.expiry);

  const filteredRows = (chain?.rows || []).filter((row) => {
    if (!search) return true;
    return String(row.strike).includes(search.trim());
  });

  return (
    <div
      role="dialog"
      aria-label="Option chain"
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 640, maxWidth: '94vw',
        background: D.bg, borderLeft: D.borderThin, boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        zIndex: 120, display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: T.font.family,
      }}
    >
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: D.borderThin,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: D.bgAlt,
      }}>
        <h3 style={{ fontSize: 13, margin: 0, fontWeight: 700, color: D.text, letterSpacing: '-0.01em' }}>Option Chain</h3>
        <button
          onClick={onClose}
          title="Close option chain"
          aria-label="Close option chain"
          style={{
            width: 24,
            height: 24,
            borderRadius: 6,
            display: 'grid',
            placeItems: 'center',
            background: 'transparent',
            border: D.borderSoft,
            color: D.muted,
            cursor: 'pointer',
            transition: `background ${T.motion.fast}, color ${T.motion.fast}`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = D.bgHover; e.currentTarget.style.color = D.text; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = D.muted; }}
        >
          <X size={12} />
        </button>
      </div>

      {/* Underlying + expiry + spot */}
      <div style={{
        padding: '8px 14px',
        borderBottom: D.borderThin,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 4, background: D.bgAlt, border: D.borderSoft, borderRadius: 6, padding: 2 }}>
          {SUPPORTED_UNDERLYINGS.map((u) => (
            <button
              key={u.id}
              onClick={() => onUnderlyingChange?.(u.id)}
              style={{
                padding: '4px 10px',
                borderRadius: 4,
                border: 'none',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: T.font.family,
                background: underlying === u.id ? D.blue : 'transparent',
                color: underlying === u.id ? '#ffffff' : D.muted,
                transition: `all ${T.motion.fast}`,
              }}
            >
              {u.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setExpiryMenuOpen((v) => !v)}
            title="Expiry"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 6, border: D.borderSoft, background: D.bgAlt,
              color: expiryLabel ? D.text : D.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              fontFamily: T.font.family,
            }}
          >
            {expiryLabel || 'Expiry unavailable'}
            <span style={{ fontSize: 9, color: D.muted }}>▾</span>
          </button>
          {expiryMenuOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: 4, minWidth: 140, zIndex: 10,
              background: D.bg, border: D.borderThin, borderRadius: 6, boxShadow: '0 6px 16px rgba(0,0,0,.2)', overflow: 'hidden',
            }}>
              {expiryLabel ? (
                <div style={{ padding: '7px 10px', fontSize: 11, color: D.text, background: D.blueBg }}>{expiryLabel} · current</div>
              ) : (
                <div style={{ padding: '7px 10px', fontSize: 11, color: D.muted }}>No expiry data</div>
              )}
            </div>
          )}
        </div>

        {chain?.spot != null && (
          <span style={{ fontSize: 11, color: D.muted }}>
            Spot <b style={{ color: D.text, fontVariantNumeric: 'tabular-nums' }}>{fmtN(chain.spot)}</b>
          </span>
        )}
        {chain?.lot != null && (
          <span style={{ fontSize: 11, color: D.muted }}>Lot <b style={{ color: D.text }}>{chain.lot}</b></span>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto',
          padding: '5px 10px', background: D.bgAlt, borderRadius: 6, border: D.borderSoft, flex: '0 1 180px',
        }}>
          <Search size={12} color={D.muted} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Strike…"
            style={{ flex: 1, border: 'none', background: 'transparent', color: D.text, fontSize: 12, padding: 0, fontFamily: T.font.family, minWidth: 0 }}
          />
        </div>
      </div>

      {/* Body */}
      {failed ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: D.muted }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: D.text }}>Option chain unavailable</div>
          <div style={{ fontSize: 11 }}>The market data feed could not be reached.</div>
          <button
            onClick={onRetry}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
              padding: '6px 12px', borderRadius: 6, border: D.borderSoft, background: D.bgAlt,
              color: D.text, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: T.font.family,
            }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      ) : (
        <div className="terminal-scroll" style={{ overflowY: 'auto', overflowX: 'auto', flex: 1, minHeight: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 560 }}>
            <thead>
              <tr>
                <th colSpan="3" style={groupHead('CALLS', D.up)}>Calls</th>
                <th style={{ ...headCol, width: 90, background: D.bgAlt, color: D.text, fontWeight: 700 }}>STRIKE</th>
                <th colSpan="3" style={groupHead('PUTS', D.down)}>Puts</th>
              </tr>
              <tr style={{ background: D.bgAlt }}>
                <th style={headCol}>OI</th>
                <th style={headCol}>LTP</th>
                <th style={headCol}>Δ</th>
                <th style={headCol} />
                <th style={headCol}>Δ</th>
                <th style={headCol}>LTP</th>
                <th style={headCol}>OI</th>
              </tr>
            </thead>
            <tbody>
              {loading && <SkeletonRows />}
              {!loading && filteredRows.map((row) => {
                const isATM = row.strike === chain?.atm;
                const isCESelected = selection?.token === row.ceToken;
                const isPESelected = selection?.token === row.peToken;
                const hovered = hoverStrike === row.strike;
                return (
                  <tr
                    key={row.strike}
                    onMouseEnter={() => setHoverStrike(row.strike)}
                    onMouseLeave={() => setHoverStrike((s) => (s === row.strike ? null : s))}
                  >
                    <td onClick={() => onSelect(row, 'CE')} style={col(isCESelected ? D.blue : D.muted, D.upBg)}>{fmtQty(row.ceOi)}</td>
                    <td style={{ ...col(isCESelected ? D.blue : D.up, D.upBg), fontWeight: 600, padding: hovered ? '3px 4px' : undefined }}>
                      {hovered
                        ? <RowActions row={row} type="CE" onSelect={onSelect} onBuy={onBuy} onSell={onSell} />
                        : <span onClick={() => onSelect(row, 'CE')} style={{ display: 'block', cursor: 'pointer' }}>{fmtN(row.ce)}</span>}
                    </td>
                    <td onClick={() => onSelect(row, 'CE')} style={col(isCESelected ? D.blue : D.muted, D.upBg)}>{fmtN(row.ceDelta)}</td>
                    <td style={{
                      ...col(isATM ? D.amber : D.text),
                      fontWeight: 700,
                      borderLeft: D.borderThin,
                      borderRight: D.borderThin,
                      background: isATM ? D.blueBg : D.bgAlt,
                      cursor: 'default',
                    }}>
                      {fmtStrike(row.strike)}
                      {isATM && <div style={{ fontSize: 8, fontWeight: 700, color: D.amber, letterSpacing: '0.05em' }}>ATM</div>}
                    </td>
                    <td onClick={() => onSelect(row, 'PE')} style={col(isPESelected ? D.blue : D.muted, D.downBg)}>{fmtN(row.peDelta)}</td>
                    <td style={{ ...col(isPESelected ? D.blue : D.down, D.downBg), fontWeight: 600, padding: hovered ? '3px 4px' : undefined }}>
                      {hovered
                        ? <RowActions row={row} type="PE" onSelect={onSelect} onBuy={onBuy} onSell={onSell} />
                        : <span onClick={() => onSelect(row, 'PE')} style={{ display: 'block', cursor: 'pointer' }}>{fmtN(row.pe)}</span>}
                    </td>
                    <td onClick={() => onSelect(row, 'PE')} style={col(isPESelected ? D.blue : D.muted, D.downBg)}>{fmtQty(row.peOi)}</td>
                  </tr>
                );
              })}
              {!loading && !filteredRows.length && (
                <tr>
                  <td colSpan="7" style={{ padding: 24, textAlign: 'center', color: D.muted }}>
                    {search ? 'No matching strikes' : 'Chain not available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
