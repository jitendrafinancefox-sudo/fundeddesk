'use client';
import { useLayout } from './LayoutContext';

const SPLITTER = 4;

const splitterStyle = (axis, isDragging) => ({
  flexShrink: 0,
  zIndex: 10,
  cursor: axis === 'ew' ? 'ew-resize' : 'ns-resize',
  background: isDragging ? '#2962ff' : '#e0e3eb',
  transition: isDragging ? 'none' : 'background 0.1s',
  ...(axis === 'ew'
    ? { width: SPLITTER, alignSelf: 'stretch' }
    : { height: SPLITTER, justifySelf: 'stretch' }),
});

export function Dock({ axis, dockKey, children }) {
  const { dragging, startDrag } = useLayout();
  const isDragging = dragging === axis;

  return (
    <>
      <div
        onMouseDown={(e) => startDrag(axis, e)}
        style={splitterStyle(axis, isDragging)}
      />
      {children}
    </>
  );
}

export function Panel({ dock, axis, dockKey, children, style }) {
  const layout = useLayout();
  const { watchlist, bottom, defaults } = layout;

  const isOpen = dock === 'left'
    ? true
    : dock === 'right'
    ? watchlist.open
    : dock === 'bottom'
    ? bottom.open
    : true;

  const size =
    dock === 'right' ? watchlist.width :
    dock === 'bottom' ? bottom.height :
    dock === 'left' ? defaults.toolbar.width :
    0;

  // Right dock stays mounted when closed (width 0) so the panel
  // slides in/out with a smooth width transition instead of popping.
  if (!isOpen && dock !== 'right') return null;

  // Dock semantics differ from the resize axis:
  //  - right watchlist: width = size, stretches full height
  //  - bottom panel:    height = size, spans full width (100%)
  //  - left toolbar:    width comes from the caller's style prop
  const dimStyle =
    dock === 'bottom' ? { height: size, width: '100%', flexShrink: 0, alignSelf: 'stretch' } :
    dock === 'right' ? { width: size, minWidth: 0, flexShrink: 0, alignSelf: 'stretch', transition: 'width 0.2s ease-out' } :
    {};

  const panelStyle = {
    ...dimStyle,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    background: '#ffffff',
    ...style,
  };

  return (
    <div style={panelStyle}>
      {children}
    </div>
  );
}

export function CollapsedTab({ dock, label, icon: Icon, onClick, style }) {
  const layout = useLayout();
  const { watchlist } = layout;

  if (dock === 'right' && watchlist.open) return null;

  return (
    <div
      onClick={onClick}
      title={label}
      style={{
        width: 24,
        flexShrink: 0,
        background: '#f8f9fa',
        borderLeft: '1px solid #e0e3eb',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 10,
        gap: 6,
        cursor: 'pointer',
        writingMode: 'vertical-rl',
        textOrientation: 'mixed',
        ...style,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f1f5'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#f8f9fa'; }}
    >
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        color: '#787b86',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        transform: 'rotate(180deg)',
      }}>{label}</span>
      {Icon && <Icon size={12} color="#787b86" style={{ transform: 'rotate(180deg)' }} />}
    </div>
  );
}
