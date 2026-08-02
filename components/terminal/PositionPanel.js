'use client';
const inr = (amount) => '₹' + Math.abs(amount || 0).toLocaleString('en-IN');
const dash = '—';
export default function PositionPanel({ positions, prices, onClose }) {
  const pnl = (p) => {
    const price = prices[p.token];
    if (price == null) return null;
    const multiplier = p.lotSize || 1;
    return (p.type === 'BUY' ? price - p.entryPrice : p.entryPrice - price) * p.lots * multiplier;
  };
  const symbolOf = (p) => p.symbol || `${p.underlying} ${p.strike} ${p.optionType}`.trim();
  const timeOf = (p) => {
    const at = p.openedAt || p.timestamp;
    return at ? new Date(at).toLocaleTimeString('en-IN', { hour12: false }) : dash;
  };
  return (
    <div className="card" style={{ padding: 0, overflow: 'auto' }}>
      <table className="tbl num">
        <thead>
          <tr>
            <th style={{ paddingLeft: 16 }}>Symbol</th>
            <th>Ticket</th>
            <th>Time</th>
            <th>Type</th>
            <th>Volume</th>
            <th>Price</th>
            <th>S/L</th>
            <th>T/P</th>
            <th>Price (current)</th>
            <th>Swap</th>
            <th>Profit</th>
            <th style={{ paddingRight: 16 }}>Comment</th>
          </tr>
        </thead>
        <tbody>
          {positions.length ? positions.map((p) => {
            const value = pnl(p);
            const ltp = prices[p.token];
            return (
              <tr key={p.id}>
                <td style={{ paddingLeft: 16 }}><b>{symbolOf(p)}</b></td>
                <td title={p.id}>{p.id ? p.id.slice(0, 8) : dash}</td>
                <td className="muted">{timeOf(p)}</td>
                <td><span className={'tag ' + (p.type === 'BUY' ? 'tag-green' : 'tag-red')}>{p.type}</span></td>
                <td>{p.lots ?? p.quantity ?? dash}</td>
                <td>{p.entryPrice?.toFixed?.(2) ?? dash}</td>
                <td>{p.stopLoss?.toFixed?.(2) ?? dash}</td>
                <td>{p.takeProfit?.toFixed?.(2) ?? dash}</td>
                <td>{ltp?.toFixed?.(2) ?? dash}</td>
                <td className="muted">{dash}</td>
                <td style={{ color: value == null ? undefined : (value >= 0 ? 'var(--green)' : 'var(--red)') }}>
                  {value == null ? dash : (value >= 0 ? '+' : '−') + inr(value)}
                </td>
                <td style={{ paddingRight: 16 }} className="muted">{dash}</td>
              </tr>
            );
          }) : <tr><td colSpan="12" className="muted" style={{ padding: 32, textAlign: 'center' }}>You don&apos;t have any positions</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
