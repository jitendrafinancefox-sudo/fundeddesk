'use client';

import { motion } from 'framer-motion';
import { getRulesForAccount, getPhaseDisplayLabel, getPlanPhases } from '@/lib/rules';

export default function AccountContextBanner({ account, plan, trades = [] }) {
  if (!account || !plan) return null;

  const rules = getRulesForAccount(account, plan);
  const phaseLabel = getPhaseDisplayLabel(plan.plan_type, account.phase);
  const phases = getPlanPhases(plan.plan_type);

  const cap = plan.capital || 1000000;
  const equity = account.equity || cap;
  const profit = equity - cap;
  const profitPct = ((equity - cap) / cap) * 100;
  
  let peak = cap;
  let maxDD = 0;
  let runningEquity = cap;
  trades.forEach(t => {
    runningEquity += t.pnl;
    if (runningEquity > peak) peak = runningEquity;
    const dd = (peak - runningEquity) / peak * 100;
    if (dd > maxDD) maxDD = dd;
  });
  
  const todayPnl = trades
    .filter(t => new Date(t.traded_at).toDateString() === new Date().toDateString())
    .reduce((s, t) => s + t.pnl, 0);
  const todayPnlPct = (todayPnl / cap) * 100;

  const profitableDays = trades
    .filter(t => t.pnl > (cap * 0.001))
    .map(t => new Date(t.traded_at).toDateString());
  const uniqueProfitableDays = [...new Set(profitableDays)].length;
  const requiredProfitableDays = rules.profitableTradingDays || 5;

  const lastTradeDate = trades.length > 0 ? new Date(trades[trades.length - 1].traded_at) : new Date(account.created_at);
  const daysSinceLastTrade = Math.floor((Date.now() - lastTradeDate.getTime()) / (1000 * 60 * 60 * 24));
  const inactivityLimit = rules.inactivityDays || 21;

  const maxSoftBreaches = rules.maxSoftBreachesBeforeClosure || rules.maxSoftBreaches || 3;

  const positionStackingBreaches = 0;
  const stopLossBreaches = 0;
  const minTradeDurationBreaches = 0;
  const newsTradingBreaches = 0;
  const weekendTradingBreaches = 0;
  const totalSoftBreaches = positionStackingBreaches + stopLossBreaches + minTradeDurationBreaches + newsTradingBreaches + weekendTradingBreaches;

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
          <h3 style={{ margin: 0, fontSize: 16 }}>Account Rules & Health</h3>
          <span className={`tag ${account.status === 'active' ? 'tag-green' : account.status === 'breached' ? 'tag-red' : 'tag-gold'}`} style={{ fontSize: 11 }}>
            {account.status.toUpperCase()}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className={`tag ${plan.plan_type === 'TWO_STEP' ? 'tag-blue' : plan.plan_type === 'ONE_STEP' ? 'tag-green' : 'tag-purple'}`} style={{ fontSize: 11, textTransform: 'uppercase' }}>
            {plan.plan_type}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
            {phaseLabel}
          </span>
        </div>
      </div>

      {plan.plan_type === 'TWO_STEP' && (
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
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '16px' 
        }}>
          {[
            {
              label: 'Profit Target',
              value: rules.profitTargetPct ? `${rules.profitTargetPct}%` : '—',
              current: profitPct >= 0 ? `+${profitPct.toFixed(2)}%` : `${profitPct.toFixed(2)}%`,
              target: rules.profitTargetPct ? `${rules.profitTargetPct}%` : null,
              status: profitPct >= (rules.profitTargetPct || 10) ? 'pass' : 'progress',
              color: 'var(--green)',
            },
            {
              label: 'Daily Drawdown',
              value: rules.dailyDrawdownPct ? `${rules.dailyDrawdownPct}%` : '—',
              current: todayPnlPct <= 0 ? `${todayPnlPct.toFixed(2)}%` : `+${todayPnlPct.toFixed(2)}%`,
              target: rules.dailyDrawdownPct ? `-${rules.dailyDrawdownPct}%` : null,
              status: Math.abs(todayPnlPct) < (rules.dailyDrawdownPct || 3) ? 'safe' : 'warning',
              color: Math.abs(todayPnlPct) < (rules.dailyDrawdownPct || 3) ? 'var(--green)' : 'var(--red)',
            },
            {
              label: 'Max Drawdown',
              value: rules.maximumDrawdownPct ? `${rules.maximumDrawdownPct}%` : '—',
              current: `${maxDD.toFixed(2)}%`,
              target: rules.maximumDrawdownPct ? `${rules.maximumDrawdownPct}%` : null,
              status: maxDD < (rules.maximumDrawdownPct || 6) ? 'safe' : 'warning',
              color: maxDD < (rules.maximumDrawdownPct || 6) ? 'var(--green)' : 'var(--red)',
            },
            {
              label: 'Profitable Days',
              value: `${requiredProfitableDays}`,
              current: `${uniqueProfitableDays}`,
              target: requiredProfitableDays,
              status: uniqueProfitableDays >= requiredProfitableDays ? 'pass' : 'progress',
              color: 'var(--blue)',
            },
            {
              label: 'Inactivity',
              value: `${inactivityLimit} days`,
              current: `${daysSinceLastTrade} days`,
              target: `${inactivityLimit} days`,
              status: daysSinceLastTrade < inactivityLimit ? 'safe' : 'warning',
              color: daysSinceLastTrade < inactivityLimit ? 'var(--green)' : 'var(--red)',
            },
            {
              label: 'Soft Breaches',
              value: `${maxSoftBreaches}`,
              current: `${totalSoftBreaches}`,
              target: `${maxSoftBreaches}`,
              status: totalSoftBreaches === 0 ? 'safe' : totalSoftBreaches < maxSoftBreaches ? 'warning' : 'breach',
              color: totalSoftBreaches === 0 ? 'var(--green)' : totalSoftBreaches < maxSoftBreaches ? 'var(--gold)' : 'var(--red)',
            },
          ].map((kpi, i) => (
            <motion.div
              key={kpi.label}
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
              style={{ 
                padding: '20px', 
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: kpi.color, opacity: 0.8 }} />
              
              <motion.span
                className="eyebrow"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                {kpi.label}
              </motion.span>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                style={{ marginTop: '8px', marginBottom: '8px' }}
              >
                <span style={{ 
                  fontFamily: "'Unbounded', 'Manrope', sans-serif", 
                  fontWeight: 800, 
                  fontSize: 'clamp(22px, 3vw, 28px)', 
                  lineHeight: 1.1, 
                  color: kpi.color,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {kpi.current}
                </span>
              </motion.div>

              {kpi.target && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif" }}
                >
                  Target: {kpi.target}
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.35 }}
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
                  background: kpi.status === 'pass' || kpi.status === 'safe' ? 'var(--green)' : 
                              kpi.status === 'progress' ? 'var(--blue)' :
                              kpi.status === 'warning' ? 'var(--gold)' : 'var(--red)',
                  boxShadow: `0 0 8px ${kpi.status === 'pass' || kpi.status === 'safe' ? 'rgba(34,197,139,0.6)' : kpi.status === 'warning' ? 'rgba(255,180,0,0.6)' : 'rgba(239,68,68,0.6)'}`,
                }} />
              </motion.div>
            </motion.div>
          ))}
        </div>

        <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border)' }}>
          <h4 style={{ marginBottom: '16px', fontSize: 14, fontWeight: 600, color: 'var(--muted)' }}>Active Rules Summary</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
            {rules.dailyDrawdownPct && (
              <RuleDetail 
                label="Daily Drawdown" 
                value={`${rules.dailyDrawdownPct}%`} 
                detail={rules.dailyDrawdownIsTrailing ? 'Trailing from highest intraday equity' : 'From day-start balance'}
                includesUnrealized={rules.dailyDrawdownIncludesUnrealized}
              />
            )}
            {rules.maximumDrawdownPct && (
              <RuleDetail 
                label="Maximum Drawdown" 
                value={`${rules.maximumDrawdownPct}%`} 
                detail={rules.maximumDrawdownIsTrailing ? 'Trailing from highest equity since creation' : 'From initial balance'}
                includesUnrealized={rules.maximumDrawdownIncludesOpenAndClosed}
              />
            )}
            {rules.positionStackingLimit && (
              <RuleDetail 
                label="Position Stacking" 
                value={`${rules.positionStackingLimit} trades/instrument`} 
                detail={`4th trade = soft breach • ${rules.maxSoftBreachesBeforeClosure} soft breaches = closure`}
              />
            )}
            {rules.stopLossRequired && (
              <RuleDetail 
                label="Stop Loss" 
                value="Required" 
                detail={`Set within ${rules.stopLossWindowSeconds}s • ${rules.maxSoftBreaches} soft breaches allowed`}
              />
            )}
            {rules.minimumTradeDurationSeconds && (
              <RuleDetail 
                label="Min Trade Duration" 
                value={`${rules.minimumTradeDurationSeconds}s`} 
                detail={`${rules.maxSoftViolationsForDuration} soft violations allowed`}
              />
            )}
            {rules.inactivityDays && (
              <RuleDetail 
                label="Inactivity" 
                value={`${rules.inactivityDays} days`} 
                detail="Account expires after consecutive inactive days"
              />
            )}
            {rules.newsTrading && (
              <RuleDetail 
                label="News Events" 
                value={`±${rules.newsTradingWindowMinutes} min`} 
                detail="No trades around Tier-1 events"
              />
            )}
            {rules.weekendTrading === false && (
              <RuleDetail 
                label="Weekend Trading" 
                value="Prohibited" 
                detail="No positions over weekends"
              />
            )}
            {rules.maximumTimeLimit === false && (
              <RuleDetail 
                label="Time Limit" 
                value="None" 
                detail="Challenge never expires"
              />
            )}
            {rules.profitSplitPct && (
              <RuleDetail 
                label="Profit Split" 
                value={`Up to ${rules.profitSplitPct}%`} 
                detail="On withdrawal"
              />
            )}
            {rules.payoutCycleDays && (
              <RuleDetail 
                label="Payout Cycle" 
                value={`${rules.payoutCycleDays} days`} 
                detail={`${rules.payoutProfitableDays} profitable days required`}
              />
            )}
            {rules.minimumWithdrawalPct && (
              <RuleDetail 
                label="Min Withdrawal" 
                value={`${rules.minimumWithdrawalPct}%`} 
                detail="Of funded account balance"
              />
            )}
            {rules.withdrawalCapPct && (
              <RuleDetail 
                label="Withdrawal Cap" 
                value={`${rules.withdrawalCapPct}%/cycle`} 
                detail="Per withdrawal cycle"
              />
            )}
            {(positionStackingBreaches > 0 || stopLossBreaches > 0 || minTradeDurationBreaches > 0 || newsTradingBreaches > 0 || weekendTradingBreaches > 0) && (
              <RuleDetail 
                label="Soft Breach Breakdown" 
                value={`${totalSoftBreaches} / ${maxSoftBreaches}`} 
                detail={[
                  positionStackingBreaches > 0 && `Position Stacking: ${positionStackingBreaches}`,
                  stopLossBreaches > 0 && `Stop Loss: ${stopLossBreaches}`,
                  minTradeDurationBreaches > 0 && `Min Trade Duration: ${minTradeDurationBreaches}`,
                  newsTradingBreaches > 0 && `News Trading: ${newsTradingBreaches}`,
                  weekendTradingBreaches > 0 && `Weekend Trading: ${weekendTradingBreaches}`,
                ].filter(Boolean).join(' • ')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RuleDetail({ label, value, detail, includesUnrealized }) {
  return (
    <div className="card" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span className="eyebrow">{label}</span>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', fontFamily: "'Manrope', sans-serif" }}>{value}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
        {detail}
        {includesUnrealized && ' • Includes unrealized P&L'}
      </div>
    </div>
  );
}