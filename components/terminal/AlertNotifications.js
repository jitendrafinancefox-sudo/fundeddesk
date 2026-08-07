'use client';
import { useEffect, useRef } from 'react';
import { BellRing, CheckCircle2, Info, XCircle, X } from 'lucide-react';
import { TradingStore, useTradeState } from '@/stores/TradingStore';

// Alert popups — top-right toast stack. Sound is played inside the store when
// an alert with the sound channel fires; here we only render the popup
// channel. Toasts auto-dismiss after 5s.
const ICONS = {
  alert: <BellRing size={13} color="#f2994a" />,
  ok: <CheckCircle2 size={13} color="#26a69a" />,
  info: <Info size={13} color="#2962ff" />,
  error: <XCircle size={13} color="#ef5350" />,
};

const BORDERS = { alert: '#f2994a', ok: '#26a69a', info: '#2962ff', error: '#ef5350' };

export default function AlertNotifications() {
  const notifications = useTradeState('notifications');
  const seen = useRef(new Map());

  useEffect(() => {
    for (const n of notifications) {
      if (seen.current.has(n.id)) continue;
      seen.current.set(n.id, true);
      const timer = setTimeout(() => {
        seen.current.delete(n.id);
        TradingStore.dismissNotification(n.id);
      }, 5000);
      seen.current.set(n.id, timer);
    }
  }, [notifications]);

  useEffect(() => () => {
    for (const timer of seen.current.values()) if (typeof timer === 'number') clearTimeout(timer);
  }, []);

  if (!notifications.length) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 56,
      right: 14,
      zIndex: 1400,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      pointerEvents: 'none',
      fontFamily: 'Inter, sans-serif',
      maxWidth: 340,
    }}>
      {notifications.map((n) => (
        <div key={n.id} style={{
          pointerEvents: 'auto',
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          padding: '9px 12px',
          background: '#ffffff',
          border: `1px solid ${BORDERS[n.kind] || '#e0e3eb'}`,
          borderLeft: `3px solid ${BORDERS[n.kind] || '#e0e3eb'}`,
          borderRadius: 8,
          boxShadow: '0 6px 22px rgba(30,40,90,0.12)',
          fontSize: 11.5,
          color: '#222222',
          animation: 'fdToastIn 0.18s ease-out',
          maxWidth: 340,
        }}>
          <span style={{ flexShrink: 0 }}>{ICONS[n.kind] || ICONS.info}</span>
          <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.text}</span>
          <button
            onClick={() => TradingStore.dismissNotification(n.id)}
            style={{ border: 'none', background: 'transparent', color: '#b2b5be', cursor: 'pointer', padding: 2, flexShrink: 0 }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}