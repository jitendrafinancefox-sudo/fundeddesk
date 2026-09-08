'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Plus, ChevronUp } from 'lucide-react';

export default function AccountSelector({ 
  accounts = [], 
  selectedAccountId, 
  onSelect,
  profile 
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

  const handleSelect = (accountId) => {
    onSelect?.(accountId);
    setIsOpen(false);
  };

  const handleNewChallenge = () => {
    window.location.href = '/challenges';
  };

  const formatCurrency = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

  return (
    <div style={{ position: 'relative', zIndex: 50 }}>
      <button
        ref={dropdownRef}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '8px 16px 8px 12px',
          borderRadius: '99px',
          border: '1px solid var(--line2)',
          background: 'rgba(34,197,139,0.08)',
          color: 'var(--text)',
          fontSize: '13.5px',
          fontWeight: 500,
          fontFamily: "'Manrope', sans-serif",
          cursor: 'pointer',
          transition: 'background 0.15s, border-color 0.15s, box-shadow 0.15s',
          minWidth: '220px',
          maxWidth: '320px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(34,197,139,0.12)';
          e.currentTarget.style.borderColor = 'rgba(34,197,139,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(34,197,139,0.08)';
          e.currentTarget.style.borderColor = 'var(--line2)';
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
            {(accounts.find(a => a.id === selectedAccountId)?.login_id || 'T')[0].toUpperCase()}
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
              {accounts.find(a => a.id === selectedAccountId)?.login_id || 'Select Account'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {accounts.find(a => a.id === selectedAccountId)?.plans?.name || 'Select Account'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: accounts.find(a => a.id === selectedAccountId)?.status === 'active' ? 'var(--green)' : 'var(--muted)',
            }} />
            <span style={{ fontSize: 10.5, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
              {accounts.find(a => a.id === selectedAccountId)?.status?.toUpperCase() || 'NONE'}
            </span>
          </div>
        </div>
        <ChevronDown size={14} style={{ color: 'var(--muted)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              onClick={() => setIsOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99,
              }}
            />
            <motion.div
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
                background: 'var(--card)',
                border: '1px solid var(--line)',
                borderRadius: '14px',
                boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
                overflow: 'hidden',
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
                      border: '1px solid var(--line)',
                      background: 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background 0.15s, border-color 0.15s',
                      border: 'none',
                      color: 'inherit',
                      fontFamily: 'inherit',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,139,0.08)'; e.currentTarget.style.borderColor = 'rgba(34,197,139,0.3)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(34,197,139,0.15)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 14, color: 'var(--brand)', flexShrink: 0 }}>
                      {(accounts.find(a => a.id === account.id)?.login_id || 'T')[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {account.login_id}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span className={'tag ' + (account.status === 'active' ? 'tag-green' : account.status === 'breached' ? 'tag-red' : 'tag-gold')} style={{ fontSize: 10.5 }}>{account.status.toUpperCase()}</span>
                        <span style={{ fontSize: 11.5, color: 'var(--muted)', fontWeight: 500 }}>{account.plans?.name}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '44px' }}>
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
                  <button onClick={() => window.location.href = '/challenges'} style={{
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
                >
                  <Plus size={14} /> New Challenge
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}