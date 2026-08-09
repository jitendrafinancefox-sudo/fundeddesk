'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MousePointer2, Crosshair, Slash, Square, TrendingUp, Type, Ruler, Brush,
  ArrowRight, MoveDiagonal, Minus, ArrowUpDown, AlignCenterVertical, TrendingDown, Scale,
} from 'lucide-react';

const ACCENT = '#22ab94';
const MUTED = '#6b7280';

// TradingView-style left rail: one icon per group; multi-tool groups open a
// flyout to the right, single-tool groups select immediately.
const GROUPS = [
  { id: 'cursor', label: 'Cursor', icon: MousePointer2, tools: [['cursor', MousePointer2, 'Cursor']] },
  { id: 'crosshair', label: 'Crosshair', icon: Crosshair, tools: [['crossline', Crosshair, 'Crosshair']] },
  { id: 'lines', label: 'Lines', icon: Slash, tools: [
    ['trend', Slash, 'Trend'],
    ['ray', ArrowRight, 'Ray'],
    ['extended', MoveDiagonal, 'Extended'],
    ['hline', Minus, 'Horizontal'],
    ['vline', ArrowUpDown, 'Vertical'],
  ] },
  { id: 'shapes', label: 'Shapes', icon: Square, tools: [
    ['rect', Square, 'Rectangle'],
    ['parallelChannel', AlignCenterVertical, 'Channel'],
  ] },
  { id: 'fib', label: 'Fibonacci', icon: TrendingUp, tools: [['fib', TrendingUp, 'Fib']] },
  { id: 'textarrow', label: 'Text / Arrow', icon: Type, tools: [
    ['text', Type, 'Text'],
    ['arrow', ArrowRight, 'Arrow'],
  ] },
  { id: 'positions', label: 'Positions', icon: TrendingUp, tools: [
    ['longPosition', TrendingUp, 'Long'],
    ['shortPosition', TrendingDown, 'Short'],
    ['riskReward', Scale, 'Risk/Reward'],
  ] },
  { id: 'measure', label: 'Measure', icon: Ruler, tools: [['measure', Ruler, 'Measure']] },
  { id: 'brush', label: 'Brush', icon: Brush, tools: [['brush', Brush, 'Brush']] },
];

export default function TVLeftToolbar({ tool, setTool }) {
  const [openGroup, setOpenGroup] = useState(null);
  const [flyoutPos, setFlyoutPos] = useState({ left: 0, top: 0 });
  const barRef = useRef(null);
  const flyoutRef = useRef(null);

  const closeFlyout = useCallback(() => setOpenGroup(null), []);

  useEffect(() => {
    if (!openGroup) return undefined;
    const away = (e) => {
      if (barRef.current && !barRef.current.contains(e.target) && flyoutRef.current && !flyoutRef.current.contains(e.target)) closeFlyout();
    };
    const esc = (e) => { if (e.key === 'Escape') closeFlyout(); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [openGroup, closeFlyout]);

  const handleGroupClick = (group, buttonEl) => {
    const defaultId = group.tools[0][0];
    if (group.tools.length === 1) { setTool(defaultId); return; }
    if (openGroup === group.id) { closeFlyout(); return; }
    setTool(defaultId);
    const rect = buttonEl.getBoundingClientRect();
    setFlyoutPos({ left: rect.right + 10, top: rect.top });
    setOpenGroup(group.id);
  };

  const handleToolSelect = (id) => { setTool(id); closeFlyout(); };

  const groupActive = (group) => group.tools.some(([id]) => id === tool);

  return (
    <>
      <div ref={barRef} style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: '8px 4px',
        width: 44,
        flexShrink: 0,
        alignSelf: 'flex-start',
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        fontFamily: 'Inter, sans-serif',
      }}>
        {GROUPS.map((group) => {
          const active = groupActive(group);
          const Icon = group.icon;
          const hasChildren = group.tools.length > 1;
          return (
            <div key={group.id} style={{ position: 'relative' }}>
              <button
                title={group.label}
                onClick={(e) => handleGroupClick(group, e.currentTarget)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 4,
                  display: 'grid',
                  placeItems: 'center',
                  background: active ? 'rgba(34,171,148,0.12)' : 'transparent',
                  color: active ? ACCENT : MUTED,
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                  position: 'relative',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
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
                    borderBottom: `3px solid ${active ? ACCENT : '#b2b5be'}`,
                  }} />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {openGroup && (() => {
        const group = GROUPS.find((g) => g.id === openGroup);
        if (!group) return null;
        return (
          <div
            ref={flyoutRef}
            style={{
              position: 'fixed',
              left: flyoutPos.left,
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
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <div style={{
              padding: '6px 12px 4px',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: '#b2b5be',
              borderBottom: '1px solid #f0f1f5',
              flexShrink: 0,
            }}>
              {group.label}
            </div>
            <div style={{ maxHeight: 300, overflowY: 'auto', overflowX: 'hidden', padding: '4px 0' }}>
              {group.tools.map(([id, ToolIcon, label]) => {
                const on = id === tool;
                return (
                  <button
                    key={id}
                    title={label}
                    onClick={() => handleToolSelect(id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      textAlign: 'left',
                      padding: '7px 12px',
                      fontSize: 12,
                      color: on ? '#ffffff' : '#222222',
                      background: on ? ACCENT : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.08s',
                    }}
                    onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = on ? ACCENT : 'rgba(34,171,148,0.06)'; }}
                    onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ width: 16, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      <ToolIcon size={14} strokeWidth={1.8} />
                    </span>
                    <span style={{ flex: 1 }}>{label}</span>
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
