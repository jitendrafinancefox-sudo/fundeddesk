'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, ChevronUp } from 'lucide-react';

export default function AccountSelector({ 
  accounts = [], 
  selectedAccountId, 
  onAccountChange,
  onNewChallenge,
  loading = false 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  const handleSelect = (accountId) => {
    onAccountChange?.(accountId);
    setIsOpen(false);
  };

  const formatCurrency = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

  return (
    <div className="acct-selector" style={{ position: 'relative', zIndex: 50, minWidth: 0 }}>
      <button
        ref={dropdownRef}
        className="acct-selector-btn"
        onClick={() => !loading && setIsOpen(!isOpen)}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 16px 8px 12px',
          borderRadius: '99px',
          border: '1px solid var(--line2)',
          background: 'var(--card, #0E111C)',
          color: 'var(--text)',
          fontSize: '13.5px',
          fontWeight: 500,
          fontFamily: "'Manrope', sans-serif",
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
          minWidth: '220px',
          maxWidth: '320px',
          width: '100%',
          opacity: loading ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.background = 'var(--bg-card-hover, #16191D)';
            e.currentTarget.style.borderColor = 'var(--border-strong, #33373E)';
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.background = 'var(--card, #0E111C)';
            e.currentTarget.style.borderColor = 'var(--line2)';
          }
        }}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Select account"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--grad)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 800,
            fontSize: '13px',
            color: '#040806',
            flexShrink: 0,
          }}>
            {(selectedAccount?.login_id || 'T')[0].toUpperCase()}
          </div>
          <div style={{ 
            flex: 1, 
            minWidth: 0, 
            textAlign: 'left',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedAccount?.login_id || 'Select Account'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {selectedAccount?.plans?.name || 'Select Account'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: selectedAccount?.status === 'active' ? 'var(--green)' : 'var(--muted)',
            }} />
            <span style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              {selectedAccount?.status?.toUpperCase() || 'NONE'}
            </span>
          </div>
        </div>
        <motion.div
          initial={{ rotate: 0 }}
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2, ease: [0.19, 1, 0.22, 1] }}
        >
          <ChevronDown size={14} style={{ color: 'var(--muted)', transition: 'transform 0.2s' }} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div style={{ position: 'relative', zIndex: 50 }}>
            <div 
              onClick={() => setIsOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99,
              }}
            />
            <motion.div
              className="acct-selector-panel"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: [0.19, 1, 0.22, 1] }}
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                zIndex: 100,
                width: '340px',
                maxWidth: 'calc(100vw - 24px)',
                maxHeight: 'calc(100vh - 90px)',
                overflowY: 'auto',
                overflowX: 'hidden',
                background: 'var(--card)',
                border: '1px solid var(--line)',
                borderRadius: '14px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
                padding: '8px',
              }}
            >
              <div style={{ padding: '16px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span className="label" style={{ marginBottom: 0 }}>SELECT ACCOUNT</span>
                </div>
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    onClick={() => handleSelect(account.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s, border-color 0.15s',
                      color: 'inherit',
                      fontFamily: 'inherit',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,139,0.08)'; e.currentTarget.style.borderColor = 'rgba(34,197,139,0.3)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(34,197,139,0.15)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, color: 'var(--brand)', flexShrink: 0 }}>
                      {(account.login_id || 'T')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {account.login_id}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span className={'tag ' + (account.status === 'active' ? 'tag-green' : account.status === 'breached' ? 'tag-red' : 'tag-gold')} style={{ fontSize: 10.5 }}>{(account.status || 'unknown').toUpperCase()}</span>
                        <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>{account.plans?.name}</span>
                      </div>
                    </div>
                    <div className="acct-row-value" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '44px', flexShrink: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, fontFamily: 'Manrope, sans-serif', fontVariantNumeric: 'tabular-nums', color: 'var(--text)' }}>
                        {formatCurrency(account.equity)}
                      </div>
                      <div style={{ 
                        fontSize: 12.5, 
                        color: (account.equity - account.plans?.capital) >= 0 ? 'var(--green)' : 'var(--red)',
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                          { (account.equity - (account.plans?.capital || 0)) >= 0 ? '+' : '−' }{formatCurrency(Math.abs(account.equity - (account.plans?.capital || 0)))}
                      </div>
                    </div>
                  </button>
                ))}
                {accounts.length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
                    No accounts found
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
                  <button onClick={onNewChallenge} style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    border: '1px solid var(--line2)',
                    background: 'transparent',
                    color: 'var(--muted)',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    fontFamily: 'Manrope, sans-serif',
                    cursor: 'pointer',
                    transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,139,0.08)'; e.currentTarget.style.borderColor = 'rgba(34,197,139,0.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--line2)'; }}
                  disabled={loading}
                >
                  <Plus size={14} /> New Challenge
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </div>
  );
}