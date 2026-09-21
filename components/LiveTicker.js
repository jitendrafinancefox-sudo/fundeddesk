'use client';

import { useEffect, useState, useRef } from 'react';
import { marketData } from '@/services/marketData';

const TICKER_SYMBOLS = [
  'NIFTY 50', 'BANKNIFTY',
  'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
  'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'AXISBANK', 'KOTAKBANK'
];

export default function LiveTicker() {
  // Helper functions defined inside component to avoid module-level conflicts
  function normalizeSymbol(s) {
    return s.replace(/\s+/g, '').toUpperCase();
  }

  function formatPrice(price) {
    if (price === null || price === undefined) return '—';
    return price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatChange(change) {
    if (change === null || change === undefined) return '—';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }

  function changeColor(change) {
    if (change === null || change === undefined) return 'var(--muted)';
    return change >= 0 ? 'var(--green)' : 'var(--red)';
  }

  const TICKER_SYMBOLS = [
    'NIFTY 50', 'BANKNIFTY',
    'RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK',
    'SBIN', 'BHARTIARTL', 'ITC', 'LT', 'AXISBANK', 'KOTAKBANK'
  ];

  const [tickerItems, setTickerItems] = useState([]);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    async function fetchData() {
      try {
        const [niftyData, bankData] = await Promise.all([
          marketData.heatmap('NIFTY'),
          marketData.heatmap('BANKNIFTY'),
        ]);
        if (cancelled || !mountedRef.current) return;

        const merged = [...(niftyData || []), ...(bankData || [])];
        const seen = new Set();
        const filtered = merged
          .filter(row => row?.symbol && !seen.has(normalizeSymbol(row.symbol)) && seen.add(normalizeSymbol(row.symbol)))
          .filter(row => TICKER_SYMBOLS.some(s => normalizeSymbol(s) === normalizeSymbol(row.symbol)))
          .map(row => ({
            symbol: row.symbol,
            ltp: row.ltp,
            change: row.dayChangePercent,
          }))

        if (filtered.length > 0) {
          setTickerItems(filtered);
          setError(null);
        } else {
          // Relay reachable but returned no usable rows - truthfully reflect "no data".
          setTickerItems([]);
          setError('No live price data available.');
        }
      } catch (e) {
        if (e?.name !== 'AbortError' && mountedRef.current) {
          console.warn('LiveTicker: market data relay unavailable', e?.message);
          setTickerItems([]);
          setError('Live prices unavailable.');
        }
      }
    }

    fetchData();
    const interval = setInterval(fetchData, 15000);

    return () => {
      cancelled = true;
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, []);

  // No items yet: distinguish a truthful "unavailable" state from the initial load.
  if (!tickerItems.length) {
    return (
      <div style={{
        height: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(34,197,139,.05)', borderBottom: '1px solid rgba(34,197,139,.15)',
        color: 'var(--muted)', fontSize: 13, fontFamily: 'Manrope,sans-serif'
      }}>
        {error || 'Loading live prices…'}
      </div>
    );
  }

  const itemStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '0 28px',
    whiteSpace: 'nowrap',
    fontFamily: 'Manrope, sans-serif',
    fontSize: 13.5,
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  };

  return (
    <div style={{
      width: '100%',
      overflow: 'hidden',
      background: 'var(--card)',
      borderBottom: '1px solid var(--line)',
    }}>
      <div className="ticker-track" style={{
        display: 'flex',
        animation: 'tickerScroll 30s linear infinite',
        willChange: 'transform',
      }}>
        {tickerItems.map((item, i) => (
          <span key={item.symbol} style={itemStyle}>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{item.symbol}</span>
            <span style={{ color: 'var(--text)' }}>₹{formatPrice(item.ltp)}</span>
            <span style={{ color: changeColor(item.change) }}>
              {formatChange(item.change)}
            </span>
            {i < tickerItems.length - 1 && (
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--line)', margin: '0 10px'
              }} />
            )}
          </span>
        ))}
        {tickerItems.map((item, i) => (
          <span key={`${item.symbol}-clone`} style={itemStyle}>
            <span style={{ color: 'var(--text)', fontWeight: 500 }}>{item.symbol}</span>
            <span style={{ color: 'var(--text)' }}>₹{formatPrice(item.ltp)}</span>
            <span style={{ color: changeColor(item.change) }}>
              {formatChange(item.change)}
            </span>
            {i < tickerItems.length - 1 && (
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--line)', margin: '0 10px'
              }} />
            )}
          </span>
        ))}
      </div>
      <style jsx>{`
        @keyframes tickerScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .ticker-track:hover { animation-play-state: paused; }
      `}</style>
    </div>
  );

  // Helper functions defined inside component to avoid module-level conflicts
  function normalizeSymbol(s) {
    return s.replace(/\s+/g, '').toUpperCase();
  }

  function formatPrice(price) {
    if (price === null || price === undefined) return '—';
    return price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatChange(change) {
    if (change === null || change === undefined) return '—';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  }

  function changeColor(change) {
    if (change === null || change === undefined) return 'var(--muted)';
    return change >= 0 ? 'var(--green)' : 'var(--red)';
  }
}