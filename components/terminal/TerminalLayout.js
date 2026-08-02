'use client';
// Terminal widget shell (TradingView-style), embedded in the portal's main
// white space next to the left sidebar navigation — NOT full-screen.
// Sizing: a flex item filling width:100% at height:calc(100vh - 120px).
// Columns: top toolbar / main row (chart + 250px watchlist) at 75% /
// full-width tab panel at 25% across the bottom.
export default function TerminalLayout({ top, left, center, right, bottom }) {
  return (
    <div style={{ width: '100%', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column', background: '#131722', color: '#D1D4DC', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px 0' }}>{top}</div>
      <div style={{ flex: 3, minHeight: 0, display: 'flex', gap: 10, padding: '10px 12px' }}>
        {left}
        <section style={{ flex: 1, minWidth: 0, minHeight: 0, position: 'relative' }}>{center}</section>
        {right && <aside style={{ width: 250, flexShrink: 0, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>{right}</aside>}
      </div>
      <div style={{ flex: 1, minHeight: 0, padding: '0 12px 12px' }}>{bottom}</div>
    </div>
  );
}
