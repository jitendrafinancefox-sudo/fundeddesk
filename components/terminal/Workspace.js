'use client';
import { useLayout } from './LayoutContext';
import { Panel, Dock, CollapsedTab } from './Panel';
import { Layers } from 'lucide-react';

// Terminal workspace:
//
//   ┌──────────┬───────────────┬────────────┐
//   │ Toolbar  │    Chart      │ Watchlist  │   <- flex row, fills remaining height
//   ├──────────┴───────────────┴────────────┤   <- draggable divider (ns)
//   ┌───────────────────────────────────────┐
//   │         Bottom panel body             │   <- height-animated, FULL WIDTH
//   ├───────────────────────────────────────┤
//   │ ▼ Account Manager | Trade | ...     │   <- 36px tab bar, FULL WIDTH
//   └───────────────────────────────────────┘
//
// The bottom workspace is a full-width block below the chart row: divider,
// panel body, then the always-visible tab bar at the very bottom (Lemon style).
// The chart row keeps flex:1 so it shrinks/grows automatically; the panel body
// never renders a horizontal scrollbar and its content stays mounted.
export default function Workspace({ left, chartArea, right, bottom, bottomBar, statusBar }) {
  const layout = useLayout();
  const { watchlist, bottom: bottomDock, toggleWatchlist } = layout;

  return (
    <div ref={layout.rootRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

      {/* Row: Left Toolbar | Chart | Watchlist — flex:1, auto-resizes */}
      <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex' }}>
        {/* Left Toolbar — fixed 48px strip, full chart height */}
        <Panel dock="left" axis="none" style={{ width: 48, flexShrink: 0, borderRight: '1px solid #e0e3eb', alignSelf: 'stretch' }}>
          {left}
        </Panel>

        {/* Chart fills all remaining center space (auto-resizes with watchlist) */}
        <div style={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {chartArea}
        </div>

        {/* Right: Watchlist — wrapper animates width; panel stays mounted
            (width 0 when closed) so it slides instead of popping. */}
        {right && (
          <div style={{
            width: watchlist.open ? watchlist.width + 4 : 0,
            flexShrink: 0,
            display: 'flex',
            overflow: 'hidden',
            transition: 'width 0.2s ease-out',
          }}>
            <Dock axis="ew" dockKey="right">
              <Panel dock="right" axis="ew" style={{ borderLeft: '1px solid #e0e3eb' }}>
                {right}
              </Panel>
            </Dock>
          </div>
        )}

        {/* Collapsed Watchlist Tab — ▶ expand */}
        {!watchlist.open && (
          <CollapsedTab
            dock="right"
            label="Watchlist"
            icon={Layers}
            onClick={toggleWatchlist}
          />
        )}
      </div>

      {/* Bottom workspace — FULL WIDTH block */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>

        {/* Divider + panel body. Height animates 0 <-> (body + divider).
            Panel content stays mounted; only clipped during the animation. */}
        <div style={{
          height: bottomDock.open ? bottomDock.height + 4 : 0,
          overflow: 'hidden',
          width: '100%',
          transition: 'height 0.2s ease-out',
        }}>
          {bottom && (
            <Dock axis="ns" dockKey="bottom">
              <Panel dock="bottom" axis="ew" style={{ width: '100%', borderTop: '1px solid #e0e3eb' }}>
                {bottom}
              </Panel>
            </Dock>
          )}
        </div>

        {/* Tab bar — always visible, all tabs span left -> right */}
        <div style={{
          height: 36,
          flexShrink: 0,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          background: '#f8f9fa',
          borderTop: '1px solid #e0e3eb',
          padding: '0 4px',
          fontFamily: 'Inter, sans-serif',
          fontSize: 11,
          userSelect: 'none',
        }}>
          {bottomBar}
        </div>

        {/* Status bar — timezone / market / connection / ping / fps / mouse */}
        {statusBar}
      </div>
    </div>
  );
}