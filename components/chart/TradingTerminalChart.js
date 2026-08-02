'use client';
// Standalone local TradingView Advanced Charts mount. Corrected version of the
// tradingview.com-script snippet:
//  - 'https://tradingview.com' is homepage HTML, not a library — the core is
//    loaded from the local flat folder (/public/charting_library/
//    charting_library.js) via a race-safe module-guarded injector.
//  - library_path + a real datafeed (TVRelayDatafeed → Angel One relay) are
//    required, otherwise the chart renders blank.
//  - widget.remove() teardown — script.remove() alone leaks the widget.
//  - KlineCharts fallback until the approved library files are present.
import { useEffect, useRef, useState } from 'react';
import KlineChartsChart from '@/components/chart/KlineChartsChart';
import { TVRelayDatafeed } from '@/services/tvDatafeed';

const TV_LIBRARY_PATH = '/charting_library/';
const TV_LOADER = `${TV_LIBRARY_PATH}charting_library.js`;
const INDEX_TOKENS = { 'NSE:NIFTY': '99926000', 'NSE:BANKNIFTY': '99926009', 'NSE:FINNIFTY': '99926037' };

// Clean strict symbols for the library's symbol resolution (no price/EXP junk).
function cleanSymbol(symbol) {
  const s = String(symbol || '').toUpperCase();
  if (s.includes('BANKNIFTY')) return 'NSE:BANKNIFTY';
  if (s.includes('FINNIFTY')) return 'NSE:FINNIFTY';
  return 'NSE:NIFTY';
}

// Module-level loader guard — inject the local core once per page.
let tvScriptInjected = false;
let tvScriptLoading = null;
function loadTVLoader() {
  if (typeof window !== 'undefined' && window.TradingView) return Promise.resolve(true);
  if (tvScriptInjected) return tvScriptLoading;
  tvScriptInjected = true;
  tvScriptLoading = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = TV_LOADER;
    script.async = true;
    script.onload = () => resolve(Boolean(window.TradingView && window.TradingView.widget));
    script.onerror = () => { tvScriptInjected = false; tvScriptLoading = null; resolve(false); };
    document.head.appendChild(script);
  });
  return tvScriptLoading;
}

export default function TradingTerminalChart({ symbol = 'NSE:NIFTY' }) {
  const containerRef = useRef(null);
  const [engine, setEngine] = useState('loading'); // 'loading' | 'tv' | 'fallback'
  const tvSymbol = cleanSymbol(symbol);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let disposed = false;
    let widget = null;
    loadTVLoader().then((ok) => {
      if (disposed || !el.isConnected) return;
      if (!ok) { setEngine('fallback'); return; }
      widget = new window.TradingView.widget({
        container_id: el.id,
        autosize: true,
        symbol: tvSymbol,
        interval: '5',
        timezone: 'Asia/Kolkata',
        theme: 'dark',
        style: '1',
        locale: 'en',
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        withdateranges: true,
        library_path: TV_LIBRARY_PATH,
        datafeed: new TVRelayDatafeed(),
        // Default indicators on load, matching the pasted studies list.
        studies: ['RSI@tv-basicstudies', 'MASimple@tv-basicstudies'],
        disabled_features: [],
        enabled_features: [
          'header_widget', 'header_symbol_search', 'header_chart_type', 'header_resolutions',
          'timeframes_toolbar', 'header_indicators', 'header_settings', 'header_undo_redo',
          'header_screenshot', 'header_fullscreen_button', 'show_interval_dialog_button',
          'side_toolbar_in_fullscreen_mode',
        ],
        drawings_access: { type: 'white', tools: [] },
      });
      setEngine('tv');
    });
    return () => {
      disposed = true;
      widget?.remove?.();
      if (el) el.innerHTML = '';
    };
  }, [tvSymbol]);

  if (engine === 'fallback') {
    return <KlineChartsChart symbol={tvSymbol.replace('NSE:', '')} exchange="NSE" token={INDEX_TOKENS[tvSymbol]} timeframe="5m" trading={false} />;
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', minHeight: 0, paddingLeft: 50, boxSizing: 'border-box' }}>
      <div id="tv_chart_container" ref={containerRef} style={{ width: '100%', height: '100%', background: '#131722' }} />
      {engine === 'loading' && (
        <div style={{
          position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 1,
          background: '#131722', color: '#5E6780', fontSize: 12, fontFamily: 'Manrope, sans-serif',
        }}>Loading chart…</div>
      )}
    </div>
  );
}
