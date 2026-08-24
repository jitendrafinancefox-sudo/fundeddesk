'use client';
import { useEffect } from 'react';
import { X, Monitor, Zap } from 'lucide-react';

export default function TerminalSelectorModal({ open, onClose, onSelect }) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(6,7,12,0.55)',
          zIndex: 99,
          animation: 'fadeIn 0.15s ease-out',
        }}
      />
      <div
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 100,
          width: '100%',
          maxWidth: 420,
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: 14,
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          padding: '20px 22px 16px',
          animation: 'slideUp 0.18s ease-out',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            Select Terminal
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              display: 'grid',
              placeItems: 'center',
              background: 'transparent',
              border: '1px solid var(--line2)',
              color: 'var(--muted)',
              cursor: 'pointer',
              transition: 'background 0.1s, color 0.1s, border-color 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--line)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--line2)'; }}
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => { onSelect('/portal/terminal'); onClose(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '14px 16px',
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: 14,
              fontWeight: 500,
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.1s, border-color 0.1s, box-shadow 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(41,98,255,0.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <Monitor size={18} style={{ color: 'var(--blue)', flexShrink: 0 }} />
            <span>Web Terminal</span>
          </button>

          <button
            onClick={() => { onSelect('/tv-chart'); onClose(); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              padding: '14px 16px',
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: 14,
              fontWeight: 500,
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'background 0.1s, border-color 0.1s, box-shadow 0.1s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg2)'; e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(245,185,62,0.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <Zap size={18} style={{ color: 'var(--gold)', flexShrink: 0 }} />
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              Beta Web Terminal
              <span style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.04em',
                padding: '2px 7px',
                borderRadius: 99,
                background: 'rgba(245,185,62,0.15)',
                color: 'var(--gold)',
                border: '1px solid rgba(245,185,62,0.3)',
              }}>
                BETA
              </span>
            </span>
          </button>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translate(-50%, -48%) scale(0.98); }
            to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          }
        `}} />
      </div>
    </>
  );
}