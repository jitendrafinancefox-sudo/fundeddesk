'use client';
import { useEffect, useState, useRef } from 'react';

// ============================================================
// SINGLE SOURCE OF TRUTH: Canonical default market items
// Each item contains all data needed by the ticker.
// basePrice is stored directly on each item - no external lookup needed.
// ============================================================
const DEFAULT_MARKET_ITEMS = [
  { symbol: 'NIFTY 50', basePrice: 24850, dailyChangePct: 0.42 },
  { symbol: 'BANKNIFTY', basePrice: 52130, dailyChangePct: -0.15 },
  { symbol: 'FINNIFTY', basePrice: 21050, dailyChangePct: 0.28 },
  { symbol: 'SENSEX', basePrice: 81450, dailyChangePct: 0.31 },
  { symbol: 'NIFTY IT', basePrice: 38750, dailyChangePct: 0.67 },
  { symbol: 'NIFTY PHARMA', basePrice: 18920, dailyChangePct: -0.23 },
  { symbol: 'NIFTY AUTO', basePrice: 21580, dailyChangePct: 0.54 },
  { symbol: 'NIFTY METAL', basePrice: 8240, dailyChangePct: -0.41 },
  { symbol: 'NIFTY FMCG', basePrice: 56890, dailyChangePct: 0.12 },
  { symbol: 'INDIA VIX', basePrice: 13.45, dailyChangePct: -2.1 },
];

// ============================================================
// Normalization: ensures every item has the exact shape needed
// by renderItem() and updatePrices(). This is the SINGLE
// normalization boundary - the component's "data contract".
// ============================================================
function normalizeMarketItems(input) {
  const source = Array.isArray(input) && input.length > 0 ? input : DEFAULT_MARKET_ITEMS;
  return source.map((item) => {
    const base = Number.isFinite(item?.basePrice) ? item.basePrice
              : Number.isFinite(item?.base) ? item.base
              : Number.isFinite(item?.price) ? item.price
              : 0;
    const price = Number.isFinite(item?.price) ? item.price : base;
    const change = Number.isFinite(item?.dailyChangePct) ? item.dailyChangePct
               : Number.isFinite(item?.change) ? item.change
               : 0;
    return {
      symbol: item?.symbol ?? 'MARKET',
      price: Number.isFinite(price) ? price : 0,
      basePrice: Number.isFinite(base) ? base : 0,
      dailyChangePct: Number.isFinite(change) ? change : 0,
      lastChange: 0,
    };
  });
}

export default function MarketTicker({ items: initialItems }) {
  // ============================================================
  // NORMALIZATION BOUNDARY: single point where props become
  // canonical internal data. This is the ONLY place that touches
  // the raw prop. All internal code uses `safeItems` only.
  // ============================================================
  const normalizedInitial = normalizeMarketItems(initialItems);

  // State initialized with guaranteed-valid array (lazy init)
  const [items, setItems] = useState(() => normalizeMarketItems(initialItems));
  const [loaded, setLoaded] = useState(false);
  const rafRef = useRef(0);
  const pricesRef = useRef({});

  // Initialize prices ref when items change - DEFENSIVE
  useEffect(() => {
    const currentItems = Array.isArray(items) ? items : [];
    pricesRef.current = Object.fromEntries(currentItems.map(s => [s.symbol, s.price]));
  }, [items]);

  // Simulate live price updates
  useEffect(() => {
    let lastUpdate = Date.now();
    
    function updatePrices() {
      const now = Date.now();
      const delta = (now - lastUpdate) / 1000; // seconds
      lastUpdate = now;
      
      setItems(prev => {
        const prevItems = Array.isArray(prev) ? prev : [];
        const updated = prevItems.map(item => {
          // Small random walk with slight mean reversion
          const volatility = item.symbol === 'INDIA VIX' ? 0.5 : 0.15;
          const drift = (item.dailyChangePct / 100) * 0.001 * delta;
          const shock = (Math.random() - 0.5) * volatility * Math.sqrt(delta / 60) * item.price;
          const reversion = (pricesRef.current[item.symbol] - item.price) * 0.001 * delta;
          
          let newPrice = item.price + drift * item.price + shock + reversion;
          newPrice = Math.max(newPrice, item.price * 0.95); // floor
          
          // Calculate change from basePrice (stored on item)
          const base = item.basePrice;
          const newChange = base > 0 ? ((newPrice - base) / base) * 100 : 0;
          const priceChange = newPrice - item.price;
          
          pricesRef.current[item.symbol] = newPrice;
          
          return {
            ...item,
            price: newPrice,
            dailyChangePct: newChange,
            lastChange: priceChange,
          };
        });
      });
    }

    // Update every 500ms for smooth animation
    const interval = setInterval(updatePrices, 500);
    return () => clearInterval(interval);
  }, []);

  // Mark loaded after first render to avoid SSR mismatch
  useEffect(() => {
    setLoaded(true);
  }, []);

  // ============================================================
  // SAFE ITEMS: guaranteed array, used by ALL rendering/calculations
  // ============================================================
  const safeItems = Array.isArray(items) && items.length > 0 ? items : [];

  // Safe renderItem - receives already-normalized item
  const renderItem = (item, i, isDup) => {
    const key = isDup ? `${item.symbol}-dup` : item.symbol;
    const price = Number.isFinite(item.price) ? item.price : 0;
    const change = Number.isFinite(item.dailyChangePct) ? item.dailyChangePct : 0;
    
    return (
      <div key={key} style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '16px',
        padding: '0 32px',
        whiteSpace: 'nowrap',
        fontFamily: 'Manrope, sans-serif',
        fontSize: '13.5px',
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
      }}>
        <span style={{ 
          color: 'var(--text)', 
          fontWeight: 500,
          minWidth: '100px',
        }}>{item.symbol}</span>
        
        <span style={{ 
          color: 'var(--text)', 
          fontVariantNumeric: 'tabular-nums',
          minWidth: '90px',
          textAlign: 'right',
        }}>
          {item.symbol === 'INDIA VIX' 
            ? price.toFixed(2) 
            : price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          }
        </span>
        
        <span style={{ 
          color: change >= 0 ? 'var(--brand)' : 'var(--red)',
          fontVariantNumeric: 'tabular-nums',
          minWidth: '70px',
          textAlign: 'right',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}>
          {change >= 0 ? '▲' : '▼'} {Math.abs(item.dailyChangePct).toFixed(2)}%
        </span>
        
        {i < safeItems.length - 1 && (
          <span style={{ 
            width: '8px', 
            height: '8px', 
            borderRadius: '50%', 
            background: 'var(--border)',
            margin: '0 8px',
            opacity: 0.5,
          }} />
        )}
      </div>
    );
  };

  // Don't render until loaded (prevents SSR mismatch)
  if (!loaded) return null;

  return (
    <div style={{ 
      width: '100%', 
      overflow: 'hidden',
      background: 'rgba(4,8,6,0.4)',
      borderTop: '1px solid var(--border)',
      borderBottom: '1px solid var(--border)',
    }}>
      <div className="ticker-track" style={{
        display: 'flex',
        animation: 'tickerScroll 40s linear infinite',
        willChange: 'transform',
      }}>
        {safeItems.map((item, i) => renderItem(item, i, false))}
        {safeItems.map((item, i) => renderItem(item, i, true))}
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
}