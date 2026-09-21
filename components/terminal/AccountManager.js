'use client';
import { User, Building2, Wallet, KeyRound, ScrollText, Settings, LogOut, ChevronRight, LayoutGrid, Briefcase, ListChecks } from 'lucide-react';
import { useTradeState, fmtINR } from '@/stores/TradingStore';
import { fmtNum } from './tradingUI';

// Account Manager — live margin/P&L summary plus the Lemon-style section list.
// Every number is a direct projection of the trading store, so it updates in
// real time whenever a fill, close or price tick changes the account slice
// (only this widget re-renders — the store topics are scoped).
const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User, desc: 'Name, email, contact details' },
  { id: 'broker', label: 'Broker', icon: Building2, desc: 'Broker link — not available (practice simulator)' },
  { id: 'funds', label: 'Funds', icon: Wallet, desc: 'Available margin, balance, withdrawals' },
  { id: 'api', label: 'API', icon: KeyRound, desc: 'API keys, rate limits, permissions' },
  { id: 'logs', label: 'Logs', icon: ScrollText, desc: 'Login history, activity audit' },
  { id: 'settings', label: 'Settings', icon: Settings, desc: 'Preferences, notifications, theme' },
];

const thStyle = {
  textAlign: 'left',
  padding: '8px 12px',
  fontWeight: 600,
  fontSize: 11,
  color: 'var(--muted)',
  borderBottom: '1px solid var(--border)',
  background: 'var(--bg2)',
  fontFamily: 'Inter, sans-serif',
};

function Metric({ label, value, accent, sub }) {
  return (
    <div style={{
      flex: '1 1 140px',
      minWidth: 120,
      padding: '10px 14px',
      borderRadius: 8,
      background: 'var(--bg2)',
      border: '1px solid var(--border)',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{
        fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em',
        fontVariantNumeric: 'tabular-nums',
        color: accent || 'var(--text)',
        whiteSpace: 'nowrap',
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export function AccountSummary() {
  const account = useTradeState('account');
  const upColor = 'var(--green)';
  const downColor = 'var(--red)';
  const pnlColor = (v) => (v == null || v >= 0 ? upColor : downColor);

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, padding: '12px 14px', fontFamily: 'Inter, sans-serif' }}>
      <Metric label="Available Margin" value={fmtINR(account.available)} accent={account.available >= 0 ? 'var(--text)' : downColor} />
      <Metric label="Used Margin" value={fmtINR(account.usedMargin)} />
      <Metric label="Free Margin" value={fmtINR(account.free)} accent={account.free >= 0 ? 'var(--text)' : downColor} />
      <Metric label="Wallet Balance" value={fmtINR(account.cash)} />
      <Metric label="Equity" value={fmtINR(account.equity)} />
      <Metric label="Unrealized PnL" value={fmtINR(account.unrealized)} accent={pnlColor(account.unrealized)} />
      <Metric label="Realized PnL" value={fmtINR(account.realized)} accent={pnlColor(account.realized)} />
      <Metric label="Daily PnL" value={fmtINR(account.dailyPnl)} accent={pnlColor(account.dailyPnl)} sub={account.dayLabel} />
      <Metric label="Open Positions" value={account.openPositions} />
      <Metric label="Open Orders" value={account.openOrders} />
    </div>
  );
}

export default function AccountManager({ onLogout, onOpenSection }) {
  const account = useTradeState('account');
  const upColor = 'var(--green)';
  const downColor = 'var(--red)';
  const pnlColor = (v) => (v == null || v >= 0 ? upColor : downColor);

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface)',
      fontFamily: 'Inter, sans-serif',
      minHeight: 0,
    }}>
      {/* Live funds strip */}
      <div style={{ flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
        <AccountSummary />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '4px 14px 10px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
            <Briefcase size={12} color="var(--blue)" />
            {account.openPositions} open position{account.openPositions === 1 ? '' : 's'}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
            <ListChecks size={12} color="var(--gold)" />
            {account.openOrders} pending order{account.openOrders === 1 ? '' : 's'}
          </span>
          <span style={{ flex: 1 }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
            <LayoutGrid size={12} color="var(--dim)" />
            Margin utilization {account.cash ? fmtNum((account.usedMargin / Math.max(account.equity, 1)) * 100, 1) : 0}%
          </span>
        </div>
      </div>

      {/* Section list */}
      <div className="terminal-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <th style={thStyle}>Account Manager</th>
              <th style={{ ...thStyle, textAlign: 'right' }}></th>
            </tr>
          </thead>
          <tbody>
            {SECTIONS.map(({ id, label, icon: Icon, desc }) => (
              <tr
                key={id}
                onClick={() => onOpenSection?.(id)}
                style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)', fontWeight: 500, color: 'var(--text)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: 4, flexShrink: 0,
                      display: 'grid', placeItems: 'center',
                      background: 'rgba(41,98,255,0.08)', color: 'var(--blue)',
                    }}>
                      <Icon size={13} strokeWidth={1.8} />
                    </span>
                    {label}
                  </span>
                </td>
                <td style={{
                  padding: '6px 12px',
                  borderBottom: '1px solid var(--border)',
                  textAlign: 'right',
                  color: 'var(--muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                    <span style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</span>
                    <ChevronRight size={13} color="var(--dim)" style={{ flexShrink: 0 }} />
                  </span>
                </td>
              </tr>
            ))}

            {/* Logout */}
            <tr
              onClick={onLogout}
              style={{ cursor: 'pointer', transition: 'background 0.1s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,83,80,0.06)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)', fontWeight: 500, color: 'var(--red)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    width: 24, height: 24, borderRadius: 4, flexShrink: 0,
                    display: 'grid', placeItems: 'center',
                    background: 'rgba(239,83,80,0.1)', color: 'var(--red)',
                  }}>
                    <LogOut size={13} strokeWidth={1.8} />
                  </span>
                  Logout
                </span>
              </td>
              <td style={{ padding: '6px 12px', borderBottom: '1px solid var(--border)', textAlign: 'right', color: 'var(--muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                  Sign out of trading terminal
                  <ChevronRight size={13} color="var(--red)" style={{ flexShrink: 0 }} />
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}