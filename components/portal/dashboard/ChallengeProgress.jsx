'use client';

import { motion } from 'framer-motion';

export default function ChallengeProgress({ account, plan, trades = [] }) {
  if (!account || !plan) return null;

  const cap = plan.capital || 1000000;
  const equity = account.equity || cap;
  const profit = equity - cap;
  const profitPct = ((equity - cap) / cap) * 100;
  
  const isTwoStep = plan.plan_type === 'TWO_STEP';
  const isOneStep = plan.plan_type === 'ONE_STEP';
  const isInstant = plan.plan_type === 'INSTANT';
  
  let targetPct = 10;
  let targetLabel = 'Profit Target';
  
  if (isTwoStep) {
    if (account.phase === 'phase1') {
      targetPct = 10;
      targetLabel = 'Phase 1 Target';
    } else if (account.phase === 'phase2') {
      targetPct = 8;
      targetLabel = 'Phase 2 Target';
    } else {
      targetPct = 0;
      targetLabel = 'Funded';
    }
  } else if (isOneStep) {
    targetPct = 10;
    targetLabel = 'Challenge Target';
  } else {
    targetLabel = 'Funded Target';
  }

  const targetAmount = (cap * targetPct) / 100;
  const remaining = Math.max(0, targetAmount - profit);
  const progress = targetPct > 0 ? Math.min(100, (profitPct / targetPct) * 100) : 100;

  if (isInstant) {
    return (
      <div className="card" style={{ padding: 0 }}>
        <div style={{ 
          padding: '20px', 
          borderBottom: '1px solid var(--border)',
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Instant Fund Status</h3>
            <span className="tag tag-purple" style={{ fontSize: 11, textTransform: 'uppercase' }}>
              INSTANT FUNDED
            </span>
          </div>
        </div>
        
        <div style={{ padding: '20px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px' 
          }}>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>
                Instant Fund Status
              </div>
              <div style={{ fontFamily: "'Unbounded', 'Manrope', sans-serif", fontWeight: 800, fontSize: 'clamp(28px, 4vw, 36px)', color: 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
                ACTIVE
              </div>
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>
                Account Size
              </div>
              <div style={{ fontFamily: "'Unbounded', 'Manrope', sans-serif", fontWeight: 800, fontSize: 'clamp(24px, 3.5vw, 32px)', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                {'₹' + Number(cap).toLocaleString('en-IN')}
              </div>
            </div>
            <div className="card" style={{ padding: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>
                Profit Split
              </div>
              <div style={{ fontFamily: "'Unbounded', 'Manrope', sans-serif", fontWeight: 800, fontSize: 'clamp(24px, 3.5vw, 32px)', color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                Up to 80%
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 0 }}>
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
          <h3 style={{ margin: 0, fontSize: 16 }}>Challenge Progress</h3>
          <span className={`tag ${isTwoStep ? 'tag-blue' : isOneStep ? 'tag-green' : 'tag-purple'}`} style={{ fontSize: 11, textTransform: 'uppercase' }}>
            {isTwoStep ? 'TWO-STEP' : isOneStep ? 'ONE-STEP' : 'INSTANT'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className={`tag ${account.status === 'active' ? 'tag-green' : account.status === 'breached' ? 'tag-red' : 'tag-gold'}`} style={{ fontSize: 11 }}>
            {account.status.toUpperCase()}
          </span>
        </div>
      </div>

      {isTwoStep && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(255,180,0,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {['phase1', 'phase2', 'funded'].map((phase, i) => (
              <motion.div
                key={phase}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <div style={{ 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '50%', 
                  display: 'grid', 
                  placeItems: 'center',
                  fontWeight: 700,
                  fontSize: 12,
                  fontFamily: "'Manrope', sans-serif",
                  background: account.phase === phase || (phase === 'phase2' && account.phase === 'funded') || (phase === 'funded' && account.phase === 'funded') ? 'var(--grad)' : 'var(--bg2)',
                  color: account.phase === phase || (phase === 'phase2' && account.phase === 'funded') || (phase === 'funded' && account.phase === 'funded') ? '#040806' : 'var(--muted)',
                  border: account.phase === phase ? '2px solid var(--brand)' : '1px solid var(--border)',
                }}>
                  {i + 1}
                </div>
                <span style={{ 
                  fontSize: 12, 
                  fontWeight: 600, 
                  color: account.phase === phase || (phase === 'phase2' && account.phase === 'funded') || (phase === 'funded' && account.phase === 'funded') ? 'var(--text)' : 'var(--muted)',
                  fontFamily: "'Manrope', sans-serif",
                }}>
                  {phase === 'phase1' ? 'PHASE 1' : phase === 'phase2' ? 'PHASE 2' : 'FUNDED'}
                </span>
                {i < 2 && <span style={{ 
                  flex: 1, 
                  height: '2px', 
                  background: account.phase === 'phase2' || account.phase === 'funded' ? 'var(--grad)' : 'var(--border)',
                  maxWidth: '60px',
                  margin: '0 4px',
                }} />}
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '20px' }}>
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{ 
            padding: '24px', 
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(34,197,139,0.05) 0%, transparent 50%)',
            border: '1px solid rgba(34,197,139,0.15)',
          }}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--grad)', opacity: 0.8 }} />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
            <div>
              <motion.span
                className="eyebrow"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                {targetLabel}
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
                  fontSize: 'clamp(28px, 4vw, 36px)', 
                  lineHeight: 1.1, 
                  color: 'var(--text)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {'₹' + profit.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </span>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.3 }}
                style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif" }}
              >
                of {'₹' + targetAmount.toLocaleString('en-IN')} target ({targetPct}%)
              </motion.div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px' }}>
                Remaining
              </div>
              <div style={{ fontFamily: "'Unbounded', 'Manrope', sans-serif", fontWeight: 800, fontSize: '24px', color: remaining > 0 ? 'var(--red)' : 'var(--green)', fontVariantNumeric: 'tabular-nums' }}>
                {remaining > 0 ? '₹' + remaining.toLocaleString('en-IN') : 'TARGET REACHED'}
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.19, 1, 0.22, 1] }}
            style={{ 
              height: '8px', 
              background: 'var(--bg2)', 
              borderRadius: '4px', 
              overflow: 'hidden',
              marginTop: '24px',
              position: 'relative',
            }}
          >
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: progress / 100 }}
              transition={{ duration: 1, delay: 0.6, ease: [0.19, 1, 0.22, 1] }}
              style={{ 
                height: '100%', 
                background: 'var(--grad)',
                borderRadius: '4px',
                boxShadow: '0 0 20px rgba(34,197,139,0.4)',
              }}
            />
          </motion.div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '11px', color: 'var(--muted)' }}>
            <span>{progress.toFixed(1)}% Complete</span>
            <span>{profitPct >= 0 ? '+' : ''}{profitPct.toFixed(2)}% Current Return</span>
            <span>{profitPct >= targetPct ? '✓ Target Achieved' : `${(100 - progress).toFixed(1)}% to go`}</span>
          </div>
        </motion.div>

        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '12px' }}>
            Milestones
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <Milestone 
              label="5% Return" 
              value="5%" 
              achieved={profitPct >= 5} 
              target={5}
            />
            <Milestone 
              label="10% Return" 
              value="10%" 
              achieved={profitPct >= 10} 
              target={10}
            />
            <Milestone 
              label="Profit Target" 
              value={`${targetPct}%`} 
              achieved={profitPct >= targetPct} 
              target={targetPct}
              isFinal
            />
            <Milestone 
              label="Max DD Used" 
              value={Math.max(0, Math.min(100, (maxDD / 10) * 100)).toFixed(0) + '%'} 
              achieved={maxDD < 5}
              target={10}
              isDrawdown
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Milestone({ label, value, achieved, target, isFinal, isDrawdown }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: target * 0.02 }}
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '6px',
        padding: '12px 16px',
        borderRadius: '10px',
        background: achieved ? 'rgba(34,197,139,0.1)' : 'rgba(255,255,255,0.02)',
        border: achieved ? '1px solid var(--green)' : '1px solid var(--border)',
        minWidth: '100px',
        flex: 1,
      }}
    >
      <div style={{ 
        width: '32px', 
        height: '32px', 
        borderRadius: '50%', 
        display: 'grid', 
        placeItems: 'center',
        fontWeight: 700,
        fontSize: 12,
        fontFamily: "'Manrope', sans-serif",
        background: achieved ? 'var(--grad)' : 'var(--bg2)',
        color: achieved ? '#040806' : 'var(--muted)',
        border: achieved ? 'none' : '1px solid var(--border)',
      }}>
        {achieved ? '✓' : value}
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: achieved ? 'var(--green)' : 'var(--muted)', marginTop: 6, fontFamily: "'Manrope', sans-serif" }}>
        {label}
      </div>
      <div style={{ fontSize: 11, fontWeight: 700, color: achieved ? 'var(--text)' : 'var(--muted)', fontFamily: "'Unbounded', 'Manrope', sans-serif", marginTop: 2 }}>
        {value}
      </div>
    </motion.div>
  );
}