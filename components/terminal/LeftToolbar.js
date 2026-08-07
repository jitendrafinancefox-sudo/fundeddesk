'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  MousePointer2, Slash, Minus, Square, Circle, Triangle, RotateCw, Box, Layers, Type,
  Eye, EyeOff, Trash2, ArrowUpDown, ArrowRight, MoveDiagonal, TrendingUp, Ruler,
  ArrowRightToLine, ArrowUp, ArrowDown, Info, Crosshair, PanelRight, AlignCenterVertical,
  Brush, Highlighter, Eraser, Pencil, PenLine, Spline, CircleDashed, TrendingDown, Scale,
  Gauge, BadgeDollarSign, SlidersHorizontal, StickyNote, MessageSquare, MessageSquareText,
  MessageCircle, Pin, Clock, Tag, Star, ChevronRight,
} from 'lucide-react';
import { loadManagerState, toggleFavorite } from '@/components/chart/drawing/DrawingManager';

const GROUPS = [
  { id: 'cursor', label: 'Cursor', icon: MousePointer2, tools: [['cursor', MousePointer2, 'Cursor']] },
  { id: 'lines', label: 'Trend Line', icon: Slash, tools: [
    ['trend', Slash, 'Trend Line'],
    ['ray', ArrowRight, 'Ray'],
    ['extended', MoveDiagonal, 'Extended Line'],
    ['crossline', Crosshair, 'Cross Line'],
    ['hline', Minus, 'Horizontal Line'],
    ['horizontalRay', ArrowRightToLine, 'Horizontal Ray'],
    ['vline', ArrowUpDown, 'Vertical Line'],
  ] },
  { id: 'shapes', label: 'Rectangle', icon: Square, tools: [
    ['rect', Square, 'Rectangle'],
    ['rotatedRect', RotateCw, 'Rotated Rectangle'],
    ['circle', Circle, 'Circle'],
    ['ellipse', Circle, 'Ellipse'],
    ['triangle', Triangle, 'Triangle'],
  ] },
  { id: 'zones', label: 'Supply Zone', icon: Box, tools: [
    ['supplyZone', Box, 'Supply Zone'],
    ['demandZone', Box, 'Demand Zone'],
    ['smcZone', Layers, 'SMC Zone'],
    ['premiumDiscountZone', Layers, 'Premium / Discount'],
  ] },
  { id: 'channels', label: 'Parallel Channel', icon: AlignCenterVertical, tools: [
    ['parallelChannel', AlignCenterVertical, 'Parallel Channel'],
    ['flatTopChannel', ArrowRightToLine, 'Flat Top Channel'],
    ['flatBottomChannel', ArrowRightToLine, 'Flat Bottom Channel'],
    ['disjointChannel', PanelRight, 'Disjoint Channel'],
    ['regressionChannel', TrendingUp, 'Regression Channel'],
    ['linearRegressionChannel', Crosshair, 'Linear Regression Channel'],
  ] },
  { id: 'brush', label: 'Brush', icon: Pencil, tools: [
    ['brush', Brush, 'Brush'],
    ['highlighter', Highlighter, 'Highlighter'],
    ['eraser', Eraser, 'Eraser'],
    ['path', Pencil, 'Path'],
    ['polyline', PenLine, 'Polyline'],
    ['curve', Spline, 'Curve (Bezier)'],
    ['arc', CircleDashed, 'Arc'],
  ] },
  { id: 'fib', label: 'Fib Retracement', icon: TrendingUp, tools: [
    ['fib', TrendingUp, 'Fib Retracement'],
    ['fibExtension', ArrowRightToLine, 'Fib Extension'],
    ['fibProjection', Crosshair, 'Fib Projection'],
    ['fibFan', MoveDiagonal, 'Fib Fan'],
    ['fibChannel', AlignCenterVertical, 'Fib Channel'],
    ['fibSpiral', RotateCw, 'Fib Spiral'],
    ['fibTimeZone', ArrowUpDown, 'Fib Time Zone'],
    ['trendFib', TrendingDown, 'Trend Fib'],
  ] },
  { id: 'measure', label: 'Measure', icon: Ruler, tools: [['measure', Ruler, 'Measure']] },
  { id: 'position', label: 'Long Position', icon: TrendingUp, tools: [
    ['longPosition', TrendingUp, 'Long Position'],
    ['shortPosition', TrendingDown, 'Short Position'],
    ['riskReward', Scale, 'Risk / Reward'],
    ['fixedRisk', Gauge, 'Fixed Risk'],
    ['fixedReward', BadgeDollarSign, 'Fixed Reward'],
    ['customPosition', SlidersHorizontal, 'Custom Position'],
  ] },
  { id: 'annotations', label: 'Text', icon: Type, tools: [
    ['text', Type, 'Text'],
    ['anchoredText', Pin, 'Anchored Text'],
    ['note', StickyNote, 'Note'],
    ['callout', MessageSquare, 'Callout'],
    ['arrowCallout', MessageSquareText, 'Arrow Callout'],
    ['balloon', MessageCircle, 'Balloon'],
    ['infoBox', Info, 'Info Box'],
    ['label', Tag, 'Label'],
    ['priceLabel', BadgeDollarSign, 'Price Label'],
    ['timeLabel', Clock, 'Time Label'],
  ] },
  { id: 'textarrow', label: 'Arrow', icon: ArrowRight, tools: [
    ['arrow', ArrowRight, 'Arrow'],
    ['arrowMarkUp', ArrowUp, 'Arrow Mark Up'],
    ['arrowMarkDown', ArrowDown, 'Arrow Mark Down'],
    ['doubleArrow', ArrowUpDown, 'Double Arrow'],
    ['infoLine', Info, 'Info Line'],
  ] },
];

const TOOL_INDEX = new Map(GROUPS.flatMap((group) => group.tools.map(([id, icon, label]) => [id, { icon, label }])));

export default function LeftToolbar({ tool, setTool, visible, setVisible, onClear }) {
  const [openGroup, setOpenGroup] = useState(null);
  const [favorites, setFavorites] = useState(() => loadManagerState().favorites);
  const barRef = useRef(null);
  const flyoutRef = useRef(null);
  const longPressTimer = useRef(null);
  const [flyoutPos, setFlyoutPos] = useState({ top: 0 });

  const closeFlyout = useCallback(() => {
    setOpenGroup(null);
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  useEffect(() => {
    if (!openGroup) return;
    const away = (e) => {
      if (barRef.current && !barRef.current.contains(e.target) && flyoutRef.current && !flyoutRef.current.contains(e.target)) {
        closeFlyout();
      }
    };
    const esc = (e) => { if (e.key === 'Escape') closeFlyout(); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [openGroup, closeFlyout]);

  const handleGroupClick = (group, buttonEl) => {
    const defaultId = group.tools[0][0];
    if (group.id === 'cursor' || group.tools.length === 1) {
      setTool(defaultId);
      return;
    }
    if (openGroup === group.id) {
      closeFlyout();
    } else {
      const rect = buttonEl.getBoundingClientRect();
      setFlyoutPos({ top: rect.top });
      setOpenGroup(group.id);
    }
  };

  const handleGroupDoubleClick = (group) => {
    if (group.id === 'cursor' || group.tools.length <= 1) return;
    const defaultId = group.tools[0][0];
    setTool(defaultId);
  };

  const handleToolSelect = (id) => {
    setTool(id);
    closeFlyout();
  };

  const groupActive = (group) => group.tools.some(([id]) => id === tool);
  const favoriteTools = favorites.map((id) => { const entry = TOOL_INDEX.get(id); return entry ? [id, entry.icon, entry.label] : null; }).filter(Boolean);
  const toggleStar = (id) => { setFavorites(toggleFavorite(id)); };
  const groups = favoriteTools.length
    ? [{ id: 'favorites', label: 'Favorites', icon: Star, tools: favoriteTools }, ...GROUPS]
    : GROUPS;

  return (
    <>
      <div ref={barRef} className="td-toolbar" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: '8px 4px',
        width: '100%',
        height: '100%',
      }}>
        {groups.map((group) => {
          const active = groupActive(group);
          const Icon = group.icon;
          const hasChildren = group.id !== 'cursor' && group.tools.length > 1;
          return (
            <div key={group.id} style={{ position: 'relative' }}>
              <button
                title={group.label}
                onClick={(e) => handleGroupClick(group, e.currentTarget)}
                onDoubleClick={() => handleGroupDoubleClick(group)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 4,
                  display: 'grid',
                  placeItems: 'center',
                  background: active ? 'rgba(41,98,255,0.12)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--muted)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                  position: 'relative',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = openGroup === group.id ? 'rgba(0,0,0,0.06)' : 'transparent'; }}
              >
                <Icon size={18} strokeWidth={1.8} />
                {hasChildren && (
                  <span style={{
                    position: 'absolute',
                    bottom: 3,
                    right: 3,
                    width: 0,
                    height: 0,
                    borderLeft: '3px solid transparent',
                    borderRight: '3px solid transparent',
                    borderBottom: `3px solid ${active ? 'var(--accent)' : 'var(--dim)'}`,
                  }} />
                )}
              </button>
            </div>
          );
        })}

        <div style={{ width: 24, height: 1, background: 'var(--border)', margin: '6px 0' }} />

        <button
          title={visible ? 'Hide drawings' : 'Show drawings'}
          onClick={() => setVisible(!visible)}
          style={{
            width: 40, height: 40, borderRadius: 4,
            display: 'grid', placeItems: 'center',
            color: visible ? 'var(--accent)' : 'var(--muted)',
            background: visible ? 'rgba(41,98,255,0.12)' : 'transparent',
            border: 'none', cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = visible ? 'rgba(41,98,255,0.12)' : 'transparent'; }}
        >
          {visible ? <Eye size={18} strokeWidth={1.8} /> : <EyeOff size={18} strokeWidth={1.8} />}
        </button>
        <button
          title="Remove all drawing tools"
          onClick={onClear}
          style={{
            width: 40, height: 40, borderRadius: 4,
            display: 'grid', placeItems: 'center',
            color: 'var(--muted)',
            background: 'transparent',
            border: 'none', cursor: 'pointer',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,83,80,0.08)'; e.currentTarget.style.color = 'var(--red)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; }}
        >
          <Trash2 size={18} strokeWidth={1.8} />
        </button>
      </div>

      {openGroup && (() => {
        const group = groups.find((g) => g.id === openGroup);
        if (!group) return null;
        return (
          <div
            ref={flyoutRef}
            style={{
              position: 'fixed',
              left: 58,
              top: flyoutPos.top,
              width: 200,
              zIndex: 200,
              background: '#ffffff',
              border: '1px solid #e0e3eb',
              borderRadius: 6,
              boxShadow: '0 6px 20px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.05)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{
              padding: '6px 12px 4px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#b2b5be',
              fontFamily: 'Inter, sans-serif',
              borderBottom: '1px solid #f0f1f5',
              flexShrink: 0,
            }}>
              {group.label}
            </div>
            <div className="terminal-scroll" style={{ maxHeight: 300, overflowY: 'auto', overflowX: 'hidden', padding: '4px 0' }}>
              {group.tools.map(([id, ToolIcon, label]) => {
                const on = id === tool;
                const starred = favorites.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => handleToolSelect(id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      textAlign: 'left',
                      padding: '7px 12px',
                      fontSize: 12,
                      fontFamily: 'Inter, sans-serif',
                      color: on ? '#ffffff' : '#222222',
                      background: on ? 'var(--accent)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.08s',
                    }}
                    onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = 'rgba(41,98,255,0.06)'; }}
                    onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ width: 16, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <ToolIcon size={14} strokeWidth={1.8} />
                    </span>
                    <span style={{ flex: 1 }}>{label}</span>
                    {group.id !== 'favorites' && (
                      <span
                        title="Add to favorites"
                        onClick={(e) => { e.stopPropagation(); toggleStar(id); }}
                        style={{
                          color: starred ? '#F5B93E' : '#b2b5be',
                          cursor: 'pointer',
                          display: 'grid',
                          placeItems: 'center',
                          padding: 2,
                        }}
                      >
                        <Star size={10} fill={starred ? 'currentColor' : 'none'} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}
    </>
  );
}
