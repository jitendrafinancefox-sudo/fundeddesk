'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X, Star, ChevronRight } from 'lucide-react';
import { allStockSymbols } from '@/services/marketData';
import { INDEX_TOKEN } from './constants';
import { T } from './theme';

const HARDCODED_UNIVERSE = [
  { token: INDEX_TOKEN.NIFTY, exchange: 'NSE', symbol_label: 'NIFTY 50', symbol: 'NIFTY', kind: 'index' },
  { token: INDEX_TOKEN.BANKNIFTY, exchange: 'NSE', symbol_label: 'BANKNIFTY', symbol: 'BANKNIFTY', kind: 'index' },
];

const fmtQty = (v) => {
  if (v == null || !isFinite(v)) return '—';
  if (v >= 1e7) return (v / 1e7).toFixed(2) + 'Cr';
  if (v >= 1e5) return (v / 1e5).toFixed(2) + 'L';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return String(v);
};

const loadPins = () => { try { return new Set(JSON.parse(localStorage.getItem('fd-watchlist-pins') || '[]')); } catch { return new Set(); } };
const loadRecent = () => { try { return JSON.parse(localStorage.getItem('fd-watchlist-recent') || '[]'); } catch { return []; } };
const savePins = (pins) => localStorage.setItem('fd-watchlist-pins', JSON.stringify([...pins]));
const saveRecent = (recent) => localStorage.setItem('fd-watchlist-recent', JSON.stringify(recent.slice(0, 8)));

const th = (label, align = 'left') => ({
  textAlign: align,
  padding: align === 'left' ? '6px 8px' : '6px 4px',
  fontWeight: 600,
  fontSize: 10,
  color: T.colors.muted,
  borderBottom: `1px solid ${T.colors.border}`,
  whiteSpace: 'nowrap',
});

export default function Watchlist({ items, prices, stockQuotes, onSelect, onAdd, onRemove, optionChainRows, activeToken, onClose, onOpenNewPane, onDuplicateChart }) {
  const [query, setQuery] = useState('');
  const [universe, setUniverse] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pins, setPins] = useState(loadPins);
  const [recent, setRecent] = useState(loadRecent);
  const prevLtpRef = useRef({});
  const [flash, setFlash] = useState({}); // token -> 'up' | 'down'

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const controller = new AbortController();
    allStockSymbols(controller.signal).then((stocks) => {
      setUniverse([
        ...HARDCODED_UNIVERSE,
        ...stocks.map((s) => ({ token: s.token, exchange: s.exch, symbol_label: s.symbol, symbol: s.symbol, kind: 'stock' })),
      ]);
    });
    return () => controller.abort();
  }, []);

  const displayed = useMemo(() => {
    const list = items || [];
    const rows = list.map((item) => {
      const chainPrice = prices?.[item.token];
      const quote = stockQuotes?.[item.token];
      const row = (optionChainRows || []).find((r) => r.ceToken === item.token || r.peToken === item.token);
      if (row) {
        const isCE = item.token === row.ceToken;
        const last = isCE ? +row.ce : +row.pe;
        const bid = isCE ? row.ceBid : row.peBid;
        const ask = isCE ? row.ceAsk : row.peAsk;
        const prev = isCE ? row.prevCe : row.prevPe;
        const chg = last != null && prev != null ? ((last - prev) / prev) * 100 : null;
        return {
          ...item, ltp: last, bid, ask, change: chg,
          volume: isCE ? row.ceVol : row.peVol,
          oi: isCE ? row.ceOi : row.peOi,
        };
      }
      if (item.kind === 'index' || item.kind === 'stock') {
        const ltp = chainPrice ?? quote?.ltp ?? null;
        const bid = quote?.bid ?? ltp;
        const ask = quote?.ask ?? ltp;
        const change = quote?.change ?? (quote?.prevClose && ltp ? ((ltp - quote.prevClose) / quote.prevClose) * 100 : null);
        return { ...item, ltp, bid, ask, change, volume: null, oi: null };
      }
      return { ...item, ltp: chainPrice ?? null, bid: null, ask: null, change: null, volume: null, oi: null };
    });
    // Pinned favorites float to the top.
    return rows.sort((a, b) => Number(pins.has(b.token)) - Number(pins.has(a.token)));
  }, [items, prices, stockQuotes, optionChainRows, pins]);

  // Colour flash on tick: when a displayed LTP changes, paint the cell
  // green/red for 350ms.
  useEffect(() => {
    const next = {};
    let changed = false;
    displayed.forEach((item) => {
      if (item.ltp == null) return;
      const prev = prevLtpRef.current[item.token];
      if (prev != null && prev !== item.ltp) {
        next[item.token] = item.ltp > prev ? 'up' : 'down';
        changed = true;
      }
      prevLtpRef.current[item.token] = item.ltp;
    });
    if (!changed) return;
    setFlash((f) => ({ ...f, ...next }));
    const t = setTimeout(() => setFlash((f) => {
      const copy = { ...f };
      Object.keys(next).forEach((k) => { delete copy[k]; });
      return copy;
    }), 350);
    return () => clearTimeout(t);
  }, [displayed]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const results = [];
    const seen = new Set();
    universe.forEach((u) => {
      if (seen.has(u.token + 'univ') || !(u.symbol?.toLowerCase().includes(q) || u.symbol_label?.toLowerCase().includes(q))) return;
      seen.add(u.token + 'univ');
      results.push({ ...u, source: 'universe' });
    });
    if (optionChainRows) {
      optionChainRows.forEach((row) => {
        const underlying = row.underlying || '';
        const strikeStr = String(row.strike || '');
        const matchUnd = underlying.toLowerCase().includes(q);
        const matchStrike = strikeStr.toLowerCase().includes(q);
        if (!matchUnd && !matchStrike) return;
        if (row.ceToken && !seen.has(row.ceToken)) { seen.add(row.ceToken); results.push({ token: row.ceToken, exchange: 'NFO', symbol_label: `${underlying} ${row.strike} CE`, symbol: `${underlying} ${row.strike} CE`, kind: 'option', source: 'option', ce: true }); }
        if (row.peToken && !seen.has(row.peToken)) { seen.add(row.peToken); results.push({ token: row.peToken, exchange: 'NFO', symbol_label: `${underlying} ${row.strike} PE`, symbol: `${underlying} ${row.strike} PE`, kind: 'option', source: 'option', ce: false }); }
      });
    }
    return results;
  }, [query, universe, optionChainRows]);

  const handleAdd = (item) => {
    const toAdd = item.source === 'option'
      ? { token: item.token, exchange: item.exchange, symbol_label: item.symbol_label, kind: 'option' }
      : { token: item.token, exchange: item.exchange, symbol_label: item.symbol_label, kind: item.kind };
    onAdd?.(toAdd);
    setRecent((prev) => {
      const next = [toAdd, ...prev.filter((r) => r.token !== toAdd.token)];
      saveRecent(next);
      return next.slice(0, 8);
    });
    setQuery('');
    setShowDropdown(false);
  };

  const togglePin = (token, e) => {
    e?.stopPropagation();
    setPins((prev) => {
      const next = new Set(prev);
      next.has(token) ? next.delete(token) : next.add(token);
      savePins(next);
      return next;
    });
  };

  const handleRemove = (token) => {
    onRemove?.(token);
  };

  const cellFlash = (token) => ({
    background: flash[token] === 'up' ? T.colors.upBg : flash[token] === 'down' ? T.colors.downBg : 'transparent',
    transition: 'background 0.35s ease-out',
  });

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: T.colors.bg,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '8px 12px',
        borderBottom: `1px solid ${T.colors.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          fontFamily: T.font.family,
          color: T.colors.text,
          letterSpacing: '-0.01em',
        }}>
          Watchlist
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            fontSize: 10,
            color: T.colors.dim,
            fontFamily: T.font.family,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {displayed.length}
          </span>
          <button
            title="Close watchlist"
            onClick={() => onClose?.()}
            style={{
              width: 22, height: 22, borderRadius: T.radius.md, flexShrink: 0,
              display: 'grid', placeItems: 'center',
              background: 'transparent', border: 'none',
              color: T.colors.muted, cursor: 'pointer',
              transition: `background ${T.motion.fast}`,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.colors.bgHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <ChevronRight size={13} style={{ transform: 'rotate(180deg)' }} />
          </button>
        </span>
      </div>

      {/* Search */}
      <div style={{
        padding: '6px 12px',
        borderBottom: `1px solid ${T.colors.border}`,
        position: 'relative',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 8px',
          background: T.colors.bgAlt,
          borderRadius: T.radius.md,
          border: `1px solid ${T.colors.border}`,
        }}>
          <Search size={13} color={T.colors.muted} />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowDropdown(Boolean(e.target.value.trim())); }}
            onFocus={() => setShowDropdown(Boolean(query.trim()))}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder="Search..."
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              color: T.colors.text,
              fontSize: 11,
              fontFamily: T.font.family,
              outline: 'none',
              padding: 0,
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setShowDropdown(false); }}
              style={{
                background: 'transparent',
                border: 'none',
                color: T.colors.muted,
                cursor: 'pointer',
                padding: 0,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Search dropdown — results first, then Recently viewed */}
        {showDropdown && (
          <div style={{
            position: 'absolute',
            left: 12,
            right: 12,
            top: '100%',
            maxHeight: 240,
            overflowY: 'auto',
            overflowX: 'hidden',
            background: T.colors.bg,
            border: `1px solid ${T.colors.border}`,
            borderRadius: T.radius.lg,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 100,
            padding: '4px 0',
          }}>
            {filtered.length === 0 && query.trim() && (
              <div style={{ padding: 12, fontSize: 12, color: T.colors.muted, textAlign: 'center' }}>No results</div>
            )}
            {filtered.slice(0, 12).map((result) => (
              <button
                key={result.token + (result.ce !== undefined ? (result.ce ? 'CE' : 'PE') : '')}
                onClick={() => handleAdd(result)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  textAlign: 'left',
                  border: 'none',
                  background: 'transparent',
                  color: T.colors.text,
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontFamily: T.font.family,
                  transition: `background ${T.motion.fast}`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.colors.blueBg; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Star size={12} color={pins.has(result.token) ? T.colors.amber : T.colors.dim} fill={pins.has(result.token) ? T.colors.amber : 'none'} />
                <div>
                  <div style={{ fontWeight: 600 }}>{result.symbol_label}</div>
                  <div style={{ fontSize: 10, color: T.colors.muted }}>{result.exchange} · {result.kind}</div>
                </div>
              </button>
            ))}
            {!query.trim() && recent.length > 0 && (
              <>
                <div style={{ padding: '6px 12px 2px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: T.colors.dim, fontFamily: T.font.family }}>
                  RECENTLY VIEWED
                </div>
                {recent.map((r) => (
                  <button
                    key={'recent' + r.token}
                    onClick={() => handleAdd({ ...r, source: 'recent' })}
                    style={{
                      width: '100%',
                      padding: '6px 12px',
                      textAlign: 'left',
                      border: 'none',
                      background: 'transparent',
                      color: T.colors.text,
                      fontSize: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      fontFamily: T.font.family,
                      transition: `background ${T.motion.fast}`,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = T.colors.blueBg; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Star size={12} color={T.colors.dim} />
                    <span style={{ fontWeight: 500 }}>{r.symbol_label}</span>
                    <span style={{ fontSize: 10, color: T.colors.dim, marginLeft: 'auto' }}>{r.exchange}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="terminal-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 11,
          minWidth: 420,
        }}>
          <thead>
            <tr style={{
              position: 'sticky',
              top: 0,
              background: T.colors.bgAlt,
              zIndex: 10,
            }}>
              <th style={th('Symbol')}>Symbol</th>
              <th style={th('LTP', 'right')}>LTP</th>
              <th style={th('Chg%', 'right')}>Chg%</th>
              <th style={th('Volume', 'right')}>Vol</th>
              <th style={th('OI', 'right')}>OI</th>
              <th style={th('Bid', 'right')}>Bid</th>
              <th style={th('Ask', 'right')}>Ask</th>
              <th style={th('', 'center')}>⭐</th>
              <th style={{ ...th('', 'right'), paddingRight: 6 }}>×</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((item) => (
              <tr
                key={item.token}
                draggable
                title="Click: open in active pane · Middle-click: new pane · Ctrl+click: duplicate chart · Drag: drop on a chart to swap its symbol"
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) { onDuplicateChart?.(item); return; }
                  onSelect?.(item);
                }}
                onAuxClick={(e) => {
                  if (e.button === 1) { e.preventDefault(); onOpenNewPane?.(item); }
                }}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-fd-symbol', JSON.stringify({
                    exchange: item.exchange,
                    token: item.token,
                    symbol_label: item.symbol_label,
                    kind: item.kind,
                  }));
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                style={{
                  cursor: 'pointer',
                  transition: `background ${T.motion.fast}`,
                  background: item.token === activeToken ? T.colors.blueBg : 'transparent',
                  boxShadow: item.token === activeToken ? 'inset 2px 0 0 #2962ff' : 'none',
                }}
                onMouseEnter={(e) => { if (item.token !== activeToken) e.currentTarget.style.background = T.colors.bgHover; }}
                onMouseLeave={(e) => { if (item.token !== activeToken) e.currentTarget.style.background = 'transparent'; }}
              >
                <td style={{
                  padding: '6px 8px',
                  borderBottom: `1px solid ${T.colors.border}`,
                  fontWeight: 500,
                  fontSize: 11,
                  color: T.colors.text,
                  fontFamily: T.font.family,
                  letterSpacing: '-0.01em',
                  maxWidth: 90,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.symbol_label}
                </td>
                <td style={{
                  padding: '6px 4px',
                  textAlign: 'right',
                  fontWeight: 500,
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 11,
                  color: item.change != null ? (item.change >= 0 ? T.colors.up : T.colors.down) : T.colors.text,
                  borderBottom: `1px solid ${T.colors.border}`,
                  ...cellFlash(item.token),
                }}>
                  {mounted && item.ltp != null ? item.ltp.toFixed(2) : '—'}
                </td>
                <td style={{
                  padding: '6px 4px',
                  textAlign: 'right',
                  color: item.change == null ? T.colors.muted : (item.change >= 0 ? T.colors.up : T.colors.down),
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 11,
                  borderBottom: `1px solid ${T.colors.border}`,
                  ...cellFlash(item.token),
                }}>
                  {mounted && item.change != null ? (item.change >= 0 ? '+' : '') + item.change.toFixed(2) + '%' : '—'}
                </td>
                <td style={{
                  padding: '6px 4px',
                  textAlign: 'right',
                  color: T.colors.muted,
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 11,
                  borderBottom: `1px solid ${T.colors.border}`,
                }}>
                  {mounted ? fmtQty(item.volume) : '—'}
                </td>
                <td style={{
                  padding: '6px 4px',
                  textAlign: 'right',
                  color: T.colors.muted,
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 11,
                  borderBottom: `1px solid ${T.colors.border}`,
                }}>
                  {mounted ? fmtQty(item.oi) : '—'}
                </td>
                <td style={{
                  padding: '6px 4px',
                  textAlign: 'right',
                  color: T.colors.muted,
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 11,
                  borderBottom: `1px solid ${T.colors.border}`,
                }}>
                  {mounted ? (item.bid?.toFixed(2) ?? '—') : '—'}
                </td>
                <td style={{
                  padding: '6px 4px',
                  textAlign: 'right',
                  color: T.colors.muted,
                  fontVariantNumeric: 'tabular-nums',
                  fontSize: 11,
                  borderBottom: `1px solid ${T.colors.border}`,
                }}>
                  {mounted ? (item.ask?.toFixed(2) ?? '—') : '—'}
                </td>
                <td style={{
                  padding: '6px 4px',
                  textAlign: 'center',
                  borderBottom: `1px solid ${T.colors.border}`,
                }}>
                  <button
                    onClick={(e) => togglePin(item.token, e)}
                    title={pins.has(item.token) ? 'Unpin favorite' : 'Pin as favorite'}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                      color: pins.has(item.token) ? T.colors.amber : T.colors.dim,
                      transition: `color ${T.motion.fast}, transform ${T.motion.fast}`,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = T.colors.amber; e.currentTarget.style.transform = 'scale(1.15)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = pins.has(item.token) ? T.colors.amber : T.colors.dim; e.currentTarget.style.transform = 'scale(1)'; }}
                  >
                    <Star size={12} fill={pins.has(item.token) ? T.colors.amber : 'none'} />
                  </button>
                </td>
                <td style={{
                  padding: '6px 6px',
                  textAlign: 'right',
                  borderBottom: `1px solid ${T.colors.border}`,
                }}>
                  {!item.position && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(item.token); }}
                      title="Remove from watchlist"
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: T.radius.md,
                        border: 'none',
                        background: 'transparent',
                        color: T.colors.muted,
                        cursor: 'pointer',
                        fontSize: 12,
                        display: 'grid',
                        placeItems: 'center',
                        transition: `background ${T.motion.fast}, color ${T.motion.fast}`,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = T.colors.downBg; e.currentTarget.style.color = T.colors.down; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.colors.muted; }}
                    >
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!displayed.length && (
              <tr>
                <td
                  colSpan="9"
                  style={{
                    padding: 24,
                    textAlign: 'center',
                    color: T.colors.muted,
                    fontSize: 12,
                  }}
                >
                  No symbols in watchlist
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
