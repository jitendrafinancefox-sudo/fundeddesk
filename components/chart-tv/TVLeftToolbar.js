'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MousePointer2, Crosshair, Slash, Square, TrendingUp, Type, Ruler, Brush,
  ArrowRight, MoveDiagonal, Minus, ArrowUpDown, AlignCenterVertical, TrendingDown, Scale,
} from 'lucide-react';

// Colors flow through the app's CSS variables (globals.css) so the rail
// follows the same dark theme as the rest of the terminal; the blue accent
// is the app's standard selection tint (same as .tf-btn.on / .pill).
const ACTIVE_BG = 'rgba(77,124,254,.14)';
const ACTIVE_COLOR = '#4D7CFE';
const HOVER_BG = 'rgba(255,255,255,.06)';
const HOVER_ON = 'rgba(77,124,254,.06)';

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
        background: 'var(--surface)',
        border: '1px solid var(--border)',
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
                  background: active ? ACTIVE_BG : 'transparent',
                  color: active ? ACTIVE_COLOR : 'var(--muted)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.1s',
                  position: 'relative',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = HOVER_BG; }}
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
                    borderBottom: `3px solid ${active ? ACTIVE_COLOR : 'var(--dim)'}`,
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
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              boxShadow: '0 6px 20px rgba(0,0,0,0.25), 0 2px 6px rgba(0,0,0,0.12)',
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
              color: 'var(--dim)',
              borderBottom: '1px solid var(--line2)',
              flexShrink: 0,
            }}>
              {group.label}
            </div>
            <div className="td-toolbar" style={{ maxHeight: 300, overflowY: 'auto', overflowX: 'hidden', padding: '4px 0' }}>
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
                      color: on ? '#ffffff' : 'var(--text)',
                      background: on ? ACTIVE_COLOR : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.08s',
                    }}
                    onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = HOVER_ON; }}
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
