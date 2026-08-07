'use client';
import { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import ChartCanvas from '@/components/chart/ChartCanvas';
import DrawingManagerPanel from '@/components/chart/ui/DrawingManagerPanel';
import { ListTree, Plus, X } from 'lucide-react';
import { useActivePane, usePaneActions } from './PaneManager';
import { TIMEFRAME_LABELS } from './constants';
import { fmtNum as fmt } from './tradingUI';
import { terminalStatus } from '@/stores/TerminalStatus';

const fmtVol = (v) => {
  if (v == null) return '—';
  if (v >= 1e7) return (v / 1e7).toFixed(2) + 'Cr';
  if (v >= 1e5) return (v / 1e5).toFixed(2) + 'L';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return String(v);
};

export default memo(function ChartPane({ pane, onOrder, onDropSymbol, onDropPane }) {
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [managerOpen, setManagerOpen] = useState(false);
  const managerRef = useRef(null);
  const [candle, setCandle] = useState(null);
  const [hoverCandle, setHoverCandle] = useState(null);
  const [legend, setLegend] = useState([]);
  const [replaying, setReplaying] = useState(false);
  const activeRef = useRef(false);

  const { activePaneId, activatePane } = useActivePane();
  const { setPanePrice, activateTab, closeTab, openTab } = usePaneActions();
  const isActive = activePaneId === pane.id;
  const paneId = pane.id;

  // Live active-flag for the chart's keyboard manager: only the active pane
  // may answer Delete / Ctrl+C / Ctrl+V / Ctrl+Z / Escape.
  useEffect(() => { activeRef.current = isActive; }, [isActive]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Listen for objects toggle from header
  useEffect(() => {
    const handler = () => {
      if (isActive) setManagerOpen((v) => !v);
    };
    window.addEventListener('fd:objects:toggle', handler);
    return () => window.removeEventListener('fd:objects:toggle', handler);
  }, [isActive]);

  // Listen for replay toggle from header — plays the session back by walking
  // the crosshair through the candles. Uses only public engine APIs.
  useEffect(() => {
    const handler = () => {
      if (isActive) setReplaying((v) => !v);
    };
    window.addEventListener('fd:replay:toggle', handler);
    return () => window.removeEventListener('fd:replay:toggle', handler);
  }, [isActive]);

  // Switching tabs swaps the chart (new chartKey remounts the canvas) — the
  // OHLCV readout must not linger from the previous tab.
  useEffect(() => {
    setCandle(null);
    setHoverCandle(null);
    setLegend([]);
  }, [pane.activeTab]);

  useEffect(() => {
    if (!replaying) return;
    let timer = 0;
    let index = 0;
    const step = () => {
      const manager = managerRef.current;
      const engine = manager?.getEngine?.();
      if (!engine || !engine.scene?.candles?.length) { setReplaying(false); return; }
      const candles = engine.scene.candles;
      if (index >= candles.length) {
        engine.setCrosshair(null);
        setReplaying(false);
        return;
      }
      const c = candles[index];
      const px = engine.transform().anchorToPixel({ time: c.time, price: c.close });
      engine.setCrosshair({ x: px.x, y: px.y });
      setHoverCandle({ open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume, time: c.time });
      index += 1;
      timer = setTimeout(step, 300);
    };
    step();
    return () => {
      clearTimeout(timer);
      const engine = managerRef.current?.getEngine?.();
      engine?.setCrosshair(null);
    };
  }, [replaying]);

  const handleClick = useCallback(() => {
    activatePane(paneId);
  }, [paneId, activatePane]);

  const handlePrice = useCallback((price) => {
    setPanePrice(paneId, price);
  }, [paneId, setPanePrice]);

  const handleCandle = useCallback((c) => {
    setCandle(c);
  }, []);

  const handleCrosshair = useCallback((c) => {
    setHoverCandle(c && c.close != null ? { open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume, time: c.time } : null);
    // Feed the status bar (mouse price / mouse time) — no React in the chart path.
    terminalStatus.set({ cursor: c && c.close != null ? { price: c.close, time: c.time } : null });
  }, []);

  const handleIndicators = useCallback((summary) => {
    setLegend(summary);
  }, []);

  // Drawings are keyed per tab, so each tab keeps its own object tree.
  const chartKey = `pane-${pane.id}-tab-${pane.activeTab}`;

  // Drag & drop: accept a symbol from the watchlist (set this pane's chart)
  // or another pane's tab strip (swap the two panes).
  const handleDragOver = useCallback((e) => {
    const types = e.dataTransfer.types || [];
    if (types.includes('application/x-fd-symbol') || types.includes('application/x-fd-pane')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = types.includes('application/x-fd-pane') ? 'move' : 'copy';
    }
  }, []);

  const handleDrop = useCallback((e) => {
    const types = e.dataTransfer.types || [];
    if (types.includes('application/x-fd-symbol')) {
      e.preventDefault();
      try {
        const item = JSON.parse(e.dataTransfer.getData('application/x-fd-symbol'));
        onDropSymbol(pane.id, item);
      } catch {}
      return;
    }
    if (types.includes('application/x-fd-pane')) {
      e.preventDefault();
      const src = e.dataTransfer.getData('application/x-fd-pane');
      if (src !== String(pane.id)) onDropPane(src, pane.id);
    }
  }, [pane.id, onDropSymbol, onDropPane]);

  const tfLabel = pane.timeframe?.[0] || TIMEFRAME_LABELS[pane.timeframe?.[1]] || '—';
  const display = hoverCandle || candle;
  const change = display && candle ? display.close - candle.prevClose : null;
  const changePct = display && candle?.prevClose ? ((display.close - candle.prevClose) / candle.prevClose) * 100 : null;
  const isUp = change != null ? change >= 0 : true;

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        borderRight: '1px solid #e0e3eb',
        borderBottom: '1px solid #e0e3eb',
        outline: isActive ? '2px solid #2962ff' : 'none',
        outlineOffset: -2,
        cursor: 'default',
      }}
    >
      {/* Tab strip — one tab per symbol chart in this pane. Click to switch,
          × to close, + to open a blank tab, drag a tab onto another pane to
          swap the two panes. */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        padding: '2px 4px',
        borderBottom: '1px solid #e0e3eb',
        background: isActive ? 'rgba(41,98,255,0.05)' : '#fafbfc',
        flexShrink: 0,
        overflow: 'hidden',
        height: 26,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, overflowX: 'auto', scrollbarWidth: 'none', minWidth: 0 }}>
          {pane.tabs.map((tab) => {
            const on = tab.id === pane.activeTab;
            return (
              <div
                key={tab.id}
                draggable
                title={on ? 'Drag onto another pane to swap' : tab.symbol}
                onClick={() => activateTab(pane.id, tab.id)}
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/x-fd-pane', String(pane.id));
                  e.dataTransfer.effectAllowed = 'move';
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: on ? '#2962ff' : 'transparent',
                  color: on ? '#ffffff' : '#565760',
                  fontSize: 11,
                  fontWeight: on ? 600 : 500,
                  fontFamily: 'Inter, sans-serif',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  maxWidth: 140,
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.symbol}</span>
                {pane.tabs.length > 1 && (
                  <span
                    title="Close tab"
                    onClick={(e) => { e.stopPropagation(); closeTab(pane.id, tab.id); }}
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 3,
                      color: on ? 'rgba(255,255,255,0.8)' : '#b2b5be',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={10} />
                  </span>
                )}
              </div>
            );
          })}
          <button
            title="New tab"
            onClick={(e) => { e.stopPropagation(); openTab(pane.id, {}); }}
            style={{
              display: 'grid',
              placeItems: 'center',
              width: 20,
              height: 20,
              borderRadius: 4,
              border: 'none',
              background: 'transparent',
              color: '#787b86',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Plus size={12} />
          </button>
        </div>
        <div style={{ flex: 1 }} />
      </div>

      {/* OHLCV Info Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '3px 12px',
        borderBottom: '1px solid #e0e3eb',
        background: isActive ? 'rgba(41,98,255,0.04)' : '#ffffff',
        fontSize: 12,
        flexShrink: 0,
        fontFamily: 'Inter, sans-serif',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-0.01em',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        height: 28,
      }}>
        <span style={{ fontWeight: 600, fontSize: 12, color: isActive ? '#2962ff' : '#222222', letterSpacing: '-0.01em' }}>
          {pane.symbol || '—'}
        </span>
        <span style={{ color: '#26a69a', fontWeight: 500, fontSize: 11, padding: '1px 4px', borderRadius: 3, background: 'rgba(38,166,154,0.08)' }}>
          {tfLabel}
        </span>
        {display && (
          <>
            <span style={{ color: '#787b86', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: '#787b86', fontWeight: 500 }}>O</span>{' '}
              <span style={{ color: '#222222', fontWeight: 500 }}>{fmt(display.open)}</span>
            </span>
            <span style={{ color: '#787b86', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: '#787b86', fontWeight: 500 }}>H</span>{' '}
              <span style={{ color: '#222222', fontWeight: 500 }}>{fmt(display.high)}</span>
            </span>
            <span style={{ color: '#787b86', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: '#787b86', fontWeight: 500 }}>L</span>{' '}
              <span style={{ color: '#222222', fontWeight: 500 }}>{fmt(display.low)}</span>
            </span>
            <span style={{ color: '#787b86', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: '#787b86', fontWeight: 500 }}>C</span>{' '}
              <span style={{ color: '#222222', fontWeight: 600 }}>{fmt(display.close)}</span>
            </span>
            {change != null && (
              <span style={{
                color: isUp ? '#26a69a' : '#ef5350',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 3,
                background: isUp ? 'rgba(38,166,154,0.1)' : 'rgba(239,83,80,0.1)',
              }}>
                {isUp ? '+' : ''}{fmt(change)} ({isUp ? '+' : ''}{fmt(changePct)}%)
              </span>
            )}
            {display.volume != null && (
              <span style={{ color: '#b2b5be', fontSize: 11, fontWeight: 400 }}>
                Vol {fmtVol(display.volume)}
              </span>
            )}
            {legend.map((s) => (
              <span key={s.id + s.label + s.color} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: s.color, fontSize: 11, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ color: '#787b86', fontWeight: 500 }}>{s.label}</span>
                {fmt(s.value)}
              </span>
            ))}
          </>
        )}
        <div style={{ flex: 1 }} />
        <button
          title="Drawing object tree"
          onClick={(e) => { e.stopPropagation(); setManagerOpen((v) => !v); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 6px',
            borderRadius: 3,
            border: 'none',
            fontSize: 10,
            color: managerOpen ? '#2962ff' : '#787b86',
            background: managerOpen ? 'rgba(41,98,255,0.08)' : 'transparent',
            cursor: 'pointer',
          }}
        >
          <ListTree size={11} />
          Objects
        </button>
      </div>

      {/* Chart Canvas */}
      <div style={{
        flex: 1,
        minHeight: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {dimensions.width > 0 && dimensions.height > 0 && (
          <ChartCanvas
            key={chartKey}
            managerRef={managerRef}
            activeRef={activeRef}
            exchange={pane.exchange}
            token={pane.token}
            symbol={pane.symbol}
            interval={pane.timeframe?.[1]}
            timeframe={tfLabel}
            onPrice={handlePrice}
            onCandle={handleCandle}
            onCrosshair={handleCrosshair}
            onIndicators={handleIndicators}
            tool={pane.tool}
            snap={pane.snap}
            drawingsVisible={pane.drawingsVisible}
            chartKey={chartKey}
            clearRevision={pane.clearRevision}
            activeIndicators={pane.activeIndicators}
            height={dimensions.height}
          />
        )}
        {managerOpen && managerRef.current && (
          <DrawingManagerPanel apiRef={managerRef} onClose={() => setManagerOpen(false)} />
        )}
      </div>
    </div>
  );
});
