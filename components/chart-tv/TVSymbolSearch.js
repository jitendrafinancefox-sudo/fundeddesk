'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { allStockSymbols } from '@/services/marketData';
import { INDEX_TOKEN } from '@/components/terminal/constants';

// Compact header symbol selector (Phase 21B, Section 2A) — replaces the
// static symbol/exchange label with a real search over the SAME instrument
// universe Watchlist.js already searches (indices + relay stock symbols via
// allStockSymbols(), which is itself cached — SYMBOL_CACHE in
// services/marketData.js — so this never issues a second network fetch once
// Watchlist has warmed it, and vice versa) plus the live option-chain rows
// already fetched by TVTerminal (no new market-data subscription). Matching
// reuses the same word-prefix algorithm Watchlist.js uses, kept as an
// isolated copy here rather than a shared refactor of a stable module.
//
// SENSEX is intentionally NOT offered: no token/history mapping for it
// exists anywhere in this codebase (confirmed against INDEX_TOKEN and the
// relay's own option-chain rejection of anything but NIFTY/BANKNIFTY), and
// this search must never fabricate an instrument that isn't real.
const HARDCODED_UNIVERSE = [
  { token: INDEX_TOKEN.NIFTY, exchange: 'NSE', symbol_label: 'NIFTY 50', symbol: 'NIFTY', kind: 'index' },
  { token: INDEX_TOKEN.BANKNIFTY, exchange: 'NSE', symbol_label: 'BANKNIFTY', symbol: 'BANKNIFTY', kind: 'index' },
];

export default function TVSymbolSearch({ activeSymbol, optionChainRows, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [universe, setUniverse] = useState(HARDCODED_UNIVERSE);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

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

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const away = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setQuery(''); } };
    const esc = (e) => { if (e.key === 'Escape') { setOpen(false); setQuery(''); } };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const results = useMemo(() => {
    const qTokens = query.trim().toUpperCase().split(/\s+/).filter(Boolean);
    if (!qTokens.length) return [];
    const wordsOf = (s) => String(s || '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
    const matches = (words) => qTokens.every((qt) => words.some((w) => w.startsWith(qt)));

    const out = [];
    const seen = new Set();
    universe.forEach((u) => {
      const words = [...wordsOf(u.symbol), ...wordsOf(u.symbol_label)];
      if (!matches(words)) return;
      seen.add(u.token);
      out.push(u);
    });
    (optionChainRows || []).forEach((row) => {
      const underlying = row.underlying || '';
      const baseWords = [...wordsOf(underlying), ...wordsOf(String(row.strike || ''))];
      if (row.ceToken && !seen.has(row.ceToken) && matches([...baseWords, 'CE'])) {
        seen.add(row.ceToken);
        out.push({ token: row.ceToken, exchange: 'NFO', symbol_label: `${underlying} ${row.strike} CE`, kind: 'option' });
      }
      if (row.peToken && !seen.has(row.peToken) && matches([...baseWords, 'PE'])) {
        seen.add(row.peToken);
        out.push({ token: row.peToken, exchange: 'NFO', symbol_label: `${underlying} ${row.strike} PE`, kind: 'option' });
      }
    });
    return out.slice(0, 10);
  }, [query, universe, optionChainRows]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Search symbol"
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          height: 28, padding: '0 8px', minWidth: 120,
          border: '1px solid var(--line2)', borderRadius: 5,
          background: 'var(--bg2)', color: 'var(--text)', cursor: 'pointer',
          fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 700,
        }}
      >
        <Search size={12} color="var(--muted)" />
        <span style={{ letterSpacing: '-0.01em' }}>{activeSymbol}</span>
      </button>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        height: 28, padding: '0 8px', width: 'min(200px, 60vw)',
        border: '1px solid var(--blue)', borderRadius: 5,
        background: 'var(--bg2)',
      }}>
        <Search size={12} color="var(--muted)" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search symbol…"
          aria-label="Search symbol"
          style={{
            flex: 1, minWidth: 0, border: 'none', background: 'transparent',
            color: 'var(--text)', fontSize: 12, fontFamily: 'Inter, sans-serif', padding: 0,
          }}
        />
        <button
          onClick={() => { setOpen(false); setQuery(''); }}
          title="Close search"
          aria-label="Close search"
          style={{ display: 'grid', placeItems: 'center', background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0 }}
        >
          <X size={12} />
        </button>
      </div>
      {query.trim() && (
        <div
          role="listbox"
          style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 200,
            width: 240, maxWidth: 'calc(100vw - 24px)', maxHeight: 260, overflowY: 'auto',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 6, boxShadow: '0 8px 24px rgba(0,0,0,.3)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {results.length === 0 && (
            <div style={{ padding: 12, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>No results</div>
          )}
          {results.map((item) => (
            <button
              key={item.token + (item.kind || '')}
              role="option"
              onClick={() => { onSelect(item); setOpen(false); setQuery(''); }}
              style={{
                display: 'flex', flexDirection: 'column', width: '100%', textAlign: 'left',
                padding: '7px 12px', border: 'none', background: 'transparent', cursor: 'pointer',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{item.symbol_label}</span>
              <span style={{ fontSize: 10, color: 'var(--muted)' }}>{item.exchange} · {item.kind}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
