'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Settings, LogOut, ChevronDown, Plus, ShieldCheck } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function RightSidebar({ account, plan, metrics, trades = [], isLoading = false }) {
  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const formatCurrency = (n) => {
    if (n === null || n === undefined) return '—';
    return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
  };

  const formatPnl = (n) => {
    if (n === null || n === undefined) return '—';
    const prefix = n >= 0 ? '+' : '−';
    return `${prefix}₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut({ scope: 'local' }).catch(() => {}); } catch (e) {}
    try {
      Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch (e) {}
    setTimeout(() => window.location.replace('/'), 100);
  };

  if (isLoading || !account || !plan) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--brand)', animation: 'spin 1s linear infinite' }} />
            <span style={{ marginTop: '12px', color: 'var(--muted)', fontSize: 13 }}>Loading account…</span>
          </div>
        </div>
      </div>
    );
  }

  const cap = plan.capital || 1000000;
  const equity = account.equity || cap;
  const profit = equity - cap;
  const profitPct = ((equity - cap) / cap) * 100;

  // Calculate drawdown
  let peak = cap;
  let maxDD = 0;
  let runningEquity = cap;
  trades.forEach(t => {
    runningEquity += t.pnl;
    if (runningEquity > peak) peak = runningEquity;
    const dd = (peak - runningEquity) / peak * 100;
    if (dd > maxDD) maxDD = dd;
  });

  // Today's P&L
  const todayPnl = trades
    .filter(t => new Date(t.traded_at).toDateString() === new Date().toDateString())
    .reduce((s, t) => s + t.pnl, 0);
  const todayPnlPct = (todayPnl / cap) * 100;

  // Profitable trading days
  const profitableDays = trades
    .filter(t => t.pnl > (cap * 0.001))
    .map(t => new Date(t.traded_at).toDateString());
  const uniqueProfitableDays = [...new Set(profitableDays)].length;
  const requiredProfitableDays = 5;

  // Inactivity
  const lastTradeDate = trades.length > 0 ? new Date(trades[trades.length - 1].traded_at) : new Date(account.created_at);
  const daysSinceLastTrade = Math.floor((Date.now() - lastTradeDate.getTime()) / (1000 * 60 * 60 * 24));
  const inactivityLimit = 21;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Account Overview Card */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        style={{ padding: 0 }}
      >
        <div style={{ 
          padding: '16px 20px', 
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '12px', 
              background: 'var(--grad)',
              display: 'grid', 
              placeItems: 'center',
              fontFamily: 'Manrope, sans-serif',
              fontWeight: 800,
              fontSize: '14px',
              color: '#040806',
            }}>
              {(account.login_id || 'T')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                {account.login_id}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                {plan.name} • {account.phase?.toUpperCase() || 'PHASE 1'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`tag ${account.status === 'active' ? 'tag-green' : account.status === 'breached' ? 'tag-red' : 'tag-gold'}`} style={{ fontSize: 11 }}>
              {account.status.toUpperCase()}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
              {plan.plan_type}
            </span>
          </div>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
            gap: '16px' 
          }}>
            <PerformanceMetric
              label="Account Balance"
              value={formatCurrency(equity)}
              target="—"
              status="neutral"
              color="var(--text)"
            />
            <PerformanceMetric
              label="Today's P&L"
              value={formatPnl(todayPnl)}
              target="—"
              status={todayPnl >= 0 ? 'pass' : 'warning'}
              color={todayPnl >= 0 ? 'var(--green)' : 'var(--red)'}
            />
            <PerformanceMetric
              label="Equity"
              value={formatCurrency(equity)}
              target="—"
              status="neutral"
              color="var(--text)"
            />
            <PerformanceMetric
              label="Max DD Used"
              value={`${maxDD.toFixed(1)}%`}
              target={`${maxDD < 6 ? 'SAFE' : 'WARNING'}`}
              status={maxDD < 6 ? 'safe' : 'warning'}
              color={maxDD < 6 ? 'var(--green)' : 'var(--red)'}
            />
            <PerformanceMetric
              label="Profitable Days"
              value={`${uniqueProfitableDays}/${5}`}
              target="5 required"
              status={uniqueProfitableDays >= 5 ? 'pass' : 'progress'}
              color="var(--blue)"
            />
            <PerformanceMetric
              label="Inactivity"
              value={`${daysSinceLastTrade}d`}
              target={`${inactivityLimit}d limit`}
              status={daysSinceLastTrade < inactivityLimit ? 'safe' : 'warning'}
              color={daysSinceLastTrade < inactivityLimit ? 'var(--green)' : 'var(--red)'}
            />
          </div>

          {/* Account Details */}
          <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
            <h4 style={{ marginBottom: '16px', fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>Account Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <DetailRow label="Account ID" value={account.login_id} />
              <DetailRow label="Plan" value={plan.name} />
              <DetailRow label="Account Size" value={formatCurrency(cap)} />
              <DetailRow label="Phase" value={account.phase?.toUpperCase() || 'PHASE 1'} />
              <DetailRow label="Status" value={<span className={`tag ${account.status === 'active' ? 'tag-green' : account.status === 'breached' ? 'tag-red' : 'tag-gold'}`}>{account.status.toUpperCase()}</span>} />
              <DetailRow label="Created" value={new Date(account.created_at).toLocaleDateString('en-IN')} />
              <DetailRow label="Trades" value={metrics?.totalTrades?.toString() || '0'} />
              <DetailRow label="Days Traded" value={new Set(trades.map(t => new Date(t.traded_at).toDateString())).size.toString()} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Notifications Card */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        style={{ padding: 0 }}
      >
        <div style={{ 
          padding: '16px 20px', 
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Notifications</h3>
          <button onClick={() => setNotificationOpen(!notificationOpen)} style={{
            width: 32, height: 32, borderRadius: 8,
            display: 'grid', placeItems: 'center',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--line)',
            color: 'var(--text)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}>
            <Bell size={18} />
          </button>
        </div>

        <AnimatePresence>
          {notificationOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              style={{
                position: 'absolute', bottom: 'calc(100% + 8px)', right: 0,
                width: 360, maxHeight: 400, overflowY: 'auto',
                background: 'var(--card)', border: '1px solid var(--line)',
                borderRadius: 12, boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                zIndex: 100,
              }}
            >
              <div style={{ padding: '16px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
                  <button onClick={() => setNotifications(n => n.map(n => ({...n, read: true})))} 
                    style={{ fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>
                    Mark all read
                  </button>
                </div>
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
                    No notifications
                  </div>
                ) : (
                  notifications.map(n => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ 
                        padding: '14px 16px', borderBottom: '1px solid var(--line)',
                        opacity: n.read ? 0.6 : 1,
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{n.message}</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                        {new Date(n.timestamp).toLocaleTimeString()}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function PerformanceMetric({ label, value, target, status, color }) {
  const statusConfig = {
    pass: { label: 'GOOD', bg: 'rgba(34,197,139,0.1)', text: 'var(--green)' },
    progress: { label: 'PROGRESS', bg: 'rgba(59,130,246,0.1)', text: 'var(--blue)' },
    warning: { label: 'WARNING', bg: 'rgba(255,180,0,0.1)', text: 'var(--gold)' },
    neutral: { label: 'INFO', bg: 'rgba(59,130,246,0.1)', text: 'var(--blue)' },
  };
  
  const config = statusConfig[status] || statusConfig.neutral;

  return (
    <motion.div
      className="card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color, opacity: 0.8 }} />
      
      <motion.span
        className="eyebrow"
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {label}
      </motion.span>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        style={{ marginTop: '8px', marginBottom: '8px' }}
      >
        <span style={{ 
          fontFamily: "'Unbounded', 'Manrope', sans-serif", 
          fontWeight: 800, 
          fontSize: 'clamp(22px, 3vw, 28px)', 
          lineHeight: 1.1, 
          color: color,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.25 }}
        style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif" }}
      >
        Target: {target}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        style={{ 
          marginTop: 'auto', 
          paddingTop: '12px', 
          borderTop: '1px solid var(--border)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
        }}
      >
        <span style={{ 
          fontSize: '11px', 
          fontWeight: 600, 
          fontFamily: "'Manrope', sans-serif",
          letterSpacing: '.05em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
        }}>
          KPI
        </span>
        <div style={{ 
          width: '10px', 
          height: '10px', 
          borderRadius: '50%', 
          background: color,
          boxShadow: `0 0 8px ${color}80`,
        }} />
      </motion.div>
    </motion.div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="card" style={{ padding: '12px' }}>
      <span className="eyebrow">{label}</span>
      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', fontFamily: "'Manrope', sans-serif", marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}