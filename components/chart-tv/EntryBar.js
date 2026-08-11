'use client';
import { useEffect, useRef, useState } from 'react';
import { PriceBus } from '@/stores/PriceBus';
import { TradingStore } from '@/stores/TradingStore';
import { pnlAt, livePrice } from './levelPnl';

const TEAL = '#26a69a';
const RED = '#ef5350';
const DARK = 'rgba(9, 12, 18, 0.95)';
const PNL_UP = '#3ddc97';
const PNL_DN = '#ff6b6b';
const F = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// Compact broker-style position bar floating on the chart at an open
// position's entry price (chart.priceToCoordinate). Layout mirrors the
// reference terminal overlay: [TP] [SL] [QTY] [LIVE P&L] [×] in one thin
// aligned strip. TP/SL pills drag vertically — screen Y is converted back to
// a price via the Lightweight Charts price scale (coordinateToPrice),
// previewed with a dashed level line and committed through
// TradingStore.modifyPosition, which the page re-applies as labeled price
// lines. Only the pills are draggable; the bar is anchored beside the price
// axis and tracks the entry price on pan/zoom/resize. Sibling of the chart
// container — these pointer events never touch the drawing-tool overlay.
export default function EntryBar({ chart, position }) {
  const barRef = useRef(null);
  const [drag, setDrag] = useState(null); // { which: 'sl' | 'tp', startY, moved, price }

  useEffect(() => {
    if (!barRef.current || !chart) return undefined;
    if (drag) return undefined;
    const reposition = () => {
      const el = barRef.current;
      if (!el || !chart.getContainer) return;
      const y = chart.priceToCoordinate(position.avgPrice);
      if (y == null) { el.style.display = 'none'; return; }
      const cr = chart.getContainer().getBoundingClientRect();
      const pr = el.parentElement.getBoundingClientRect();
      const barW = Math.max(el.offsetWidth, 100);
      const barH = el.offsetHeight || 20;
      let axisW = 66;
      try { axisW = chart.priceScale?.('right')?.width?.() ?? 66; } catch {}
      el.style.display = '';
      el.style.left = `${Math.max(8, cr.width - axisW - barW - 8)}px`;
      el.style.top = `${cr.top - pr.top + Math.max(8, Math.min(y + 10, cr.height - barH - 8))}px`;
    };
    reposition();
    const iv = setInterval(reposition, 600);
    const off = PriceBus.onAll(reposition);
    let scaleOff;
    try {
      const ts = chart.timeScale?.();
      if (ts?.subscribeVisibleLogicalRangeChange) {
        ts.subscribeVisibleLogicalRangeChange(reposition);
        scaleOff = () => ts.unsubscribeVisibleLogicalRangeChange(reposition);
      }
    } catch {}
    return () => { clearInterval(iv); off(); scaleOff?.(); };
  }, [chart, position, drag]);

  useEffect(() => () => { chart?.clearLevelPreview?.(); }, [chart]);

  if (!chart) return null;

  const cur = livePrice(position);
  const pnl = pnlAt(cur, position);
  const pnlText = inrSigned(pnl);
  const dragPnl = drag ? pnlAt(drag.price, position) : null;

  const pillStyle = (which) => ({
    ...pBase,
    background: which === 'sl' ? RED : TEAL,
    cursor: drag ? 'grabbing' : 'grab',
  });

  const startDrag = (which) => (e) => {
    if (drag || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag({
      which,
      startY: e.clientY,
      moved: false,
      price: which === 'sl' ? (position.sl ?? position.avgPrice) : (position.tp ?? position.avgPrice),
    });
  };

  const onDragMove = (e) => {
    if (!drag || !chart?.getContainer) return;
    const cr = chart.getContainer().getBoundingClientRect();
    const price = chart.coordinateToPrice(e.clientY - cr.top);
    if (price == null) return;
    const next = { ...drag, price, moved: drag.moved || Math.abs(e.clientY - drag.startY) > 3 };
    setDrag(next);
    if (!next.moved) return;
    const color = next.which === 'sl' ? RED : TEAL;
    chart.setLevelPreview({
      price,
      title: `${next.which.toUpperCase()} ${price.toFixed(2)} ${inrSigned(pnlAt(price, position))}`,
      color,
      lineStyle: 2,
    });
  };

  const endDrag = () => {
    if (!drag) return;
    chart?.clearLevelPreview();
    if (drag.moved) {
      TradingStore.modifyPosition(position.id, {
        sl: drag.which === 'sl' ? drag.price : position.sl,
        tp: drag.which === 'tp' ? drag.price : position.tp,
      });
    } else if (
      (drag.which === 'sl' && position.sl == null) ||
      (drag.which === 'tp' && position.tp == null)
    ) {
      // Plain click on an unset pill: set the level at the current market
      // price. Clicking a set pill does nothing — drag to change it.
      TradingStore.modifyPosition(position.id, {
        sl: drag.which === 'sl' ? cur : position.sl,
        tp: drag.which === 'tp' ? cur : position.tp,
      });
    }
    setDrag(null);
  };

  const close = () => TradingStore.closePosition(position.id);

  return (
    <div
      ref={barRef}
      data-entry-bar
      style={{
        position: 'absolute',
        left: 6,
        top: 0,
        zIndex: 60,
        display: 'none',
        pointerEvents: 'none',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: DARK,
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 8,
        padding: '3px 4px',
        boxShadow: '0 3px 10px rgba(0, 0, 0, 0.45)',
        fontFamily: F,
        whiteSpace: 'nowrap',
      }}>
        <button
          data-tp-pill
          title={drag && drag.which === 'tp' ? `TP ${drag.price.toFixed(2)}` : 'TP'}
          style={pillStyle('tp')}
          onPointerDown={startDrag('tp')}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {drag && drag.which === 'tp' ? `TP ${drag.price.toFixed(2)}` : 'TP'}
        </button>
        <button
          data-sl-pill
          title={drag && drag.which === 'sl' ? `SL ${drag.price.toFixed(2)}` : 'SL'}
          style={pillStyle('sl')}
          onPointerDown={startDrag('sl')}
          onPointerMove={onDragMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          {drag && drag.which === 'sl' ? `SL ${drag.price.toFixed(2)}` : 'SL'}
        </button>
        <span
          data-qty-chip
          title={`Position quantity ${position.qty}`}
          style={{
            pointerEvents: 'auto',
            display: 'inline-block',
            fontSize: 13,
            lineHeight: 1,
            fontWeight: 600,
            padding: '5px 9px',
            borderRadius: 6,
            background: 'rgb(47, 95, 232)',
            color: '#ffffff',
            fontVariantNumeric: 'tabular-nums',
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.18), inset 0 -1px 0 rgba(0, 0, 0, 0.28)',
          }}
        >
          {position.qty.toLocaleString('en-IN')}
        </span>
        <span
          data-pnl-chip
          title="Live P&L"
          style={{
            pointerEvents: 'auto',
            display: 'inline-block',
            fontSize: 13,
            lineHeight: 1,
            fontWeight: 600,
            padding: '5px 6px',
            borderRadius: 6,
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.01em',
            color: (dragPnl ?? pnl) >= 0 ? PNL_UP : PNL_DN,
          }}
        >
          {dragPnl != null ? inrSigned(dragPnl) : pnlText}
        </span>
        <button
          data-close-btn
          title="Close position"
          onClick={close}
          style={{
            pointerEvents: 'auto',
            border: '1px solid rgba(120, 160, 255, 0.30)',
            borderRadius: 6,
            background: 'rgba(30, 50, 110, 0.9)',
            color: '#ffffff',
            width: 23,
            height: 23,
            fontSize: 13,
            lineHeight: 1,
            cursor: 'pointer',
            padding: 0,
            fontFamily: F,
            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.15), inset 0 -1px 0 rgba(0, 0, 0, 0.25)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = RED; e.currentTarget.style.borderColor = RED; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(30, 50, 110, 0.9)'; e.currentTarget.style.borderColor = 'rgba(120, 160, 255, 0.30)'; }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

const pBase = {
  pointerEvents: 'auto',
  border: 'none',
  borderRadius: 6,
  color: '#ffffff',
  fontFamily: F,
  fontWeight: 600,
  fontSize: 13,
  padding: '5px 9px',
  cursor: 'grab',
  touchAction: 'none',
  lineHeight: 1,
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  fontVariantNumeric: 'tabular-nums',
  userSelect: 'none',
  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.22), inset 0 -1px 0 rgba(0, 0, 0, 0.28)',
};

function inrSigned(v) {
  const n = Number(v) || 0;
  const abs = Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? '-' : '+'}${abs} INR`;
}