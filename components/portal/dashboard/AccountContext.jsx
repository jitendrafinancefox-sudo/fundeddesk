'use client';

import { motion } from 'framer-motion';
import { getRulesForAccount, getPhaseDisplayLabel, getPlanPhases } from '@/lib/rules';
import { formatINR } from '@/lib/format';

function formatCurrency(n) {
  return formatINR(n, { decimals: 0 });
}

function formatPct(n) {
  if (n === null || n === undefined) return '—';
  return n >= 0 ? '+' + Number(n || 0).toFixed(2) + '%' : Number(n || 0).toFixed(2) + '%';
}

function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  return Number(n || 0).toLocaleString('en-IN');
}

/* Local palette fallbacks — keeps hierarchy intact wherever the shared
   --green / --blue / --line / --bg2 tokens are not defined. */
const C = {
  pass: 'var(--green, var(--brand))',
  progress: 'var(--blue, var(--text-dim))',
  warn: 'var(--gold)',
  breach: 'var(--red)',
  line: 'var(--line, var(--border))',
  bg2: 'var(--bg2, var(--bg-elevated))',
};

function statusTone(status) {
  if (status === 'pass' || status === 'safe') return C.pass;
  if (status === 'progress') return C.progress;
  if (status === 'warning') return C.warn;
  return C.breach;
}

function RuleDetail({ label, value, detail, includesUnrealized }) {
  return (
    <div className="card" style={{ padding: '10px 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 3 }}>
        <span className="eyebrow" style={{ fontSize: '9px', letterSpacing: '.1em', marginBottom: 0 }}>{label}</span>
        <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--text)', fontFamily: "'Manrope', sans-serif", whiteSpace: 'nowrap' }}>{value}</span>
      </div>
      <div style={{ fontSize: '10.5px', color: 'var(--muted)', lineHeight: 1.45 }}>
        {detail}
        {includesUnrealized && ' • Includes unrealized P&L'}
      </div>
    </div>
  );
}

export default function AccountContext({ account, plan, trades = [], softBreaches = {} }) {
  if (!account || !plan) return null;

  // Canonical plan-type field from the accounts→plans join (see lib/rules.js).
  // May be temporarily undefined/null while data loads or for legacy records.
  const planType = plan.plan_type ?? null;

  const rules = getRulesForAccount(account, plan);
  const phaseLabel = getPhaseDisplayLabel(planType, account.phase);
  const phases = getPlanPhases(planType);

  // Real DB fields only — no placeholder capital. null when genuinely absent.
  const capRaw = Number(plan.capital);
  const cap = Number.isFinite(capRaw) && capRaw > 0 ? capRaw : null;
  const equityRaw = Number(account.equity);
  const equity = Number.isFinite(equityRaw) ? equityRaw : (cap ?? null);
  const profit = (cap != null && equity != null) ? equity - cap : null;
  const profitPct = (cap != null && equity != null) ? ((equity - cap) / cap) * 100 : null;

  let maxDD = null;
  if (cap != null) {
    let peak = cap;
    let runningEquity = cap;
    let dd = 0;
    trades.forEach(t => {
      runningEquity += t.pnl;
      if (runningEquity > peak) peak = runningEquity;
      const x = (peak - runningEquity) / peak * 100;
      if (x > dd) dd = x;
    });
    maxDD = dd;
  }

  const todayPnl = trades
    .filter(t => new Date(t.traded_at).toDateString() === new Date().toDateString())
    .reduce((s, t) => s + t.pnl, 0);
  const todayPnlPct = cap != null ? (todayPnl / cap) * 100 : null;

  const pdThreshold = cap != null ? cap * 0.001 : 0;
  const profitableDays = trades
    .filter(t => t.pnl > pdThreshold)
    .map(t => new Date(t.traded_at).toDateString());
  const uniqueProfitableDays = [...new Set(profitableDays)].length;
  // Resolved-rule values only (lib/rules.js). null → shown as N/A, not a guessed number.
  const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
  const requiredProfitableDays = num(rules.profitableTradingDays);

  const lastTradeDate = trades.length > 0 ? new Date(trades[trades.length - 1].traded_at) : new Date(account.created_at);
  const daysSinceLastTrade = Math.floor((Date.now() - lastTradeDate.getTime()) / (1000 * 60 * 60 * 24));
  const inactivityLimit = num(rules.inactivityDays);

  const softBreachCounts = softBreaches || {};
  const getBreachCount = (ruleType) => softBreachCounts[ruleType]?.count || 0;

  const positionStackingBreaches = getBreachCount('POSITION_STACKING');
  const stopLossBreaches = getBreachCount('STOP_LOSS');
  const minTradeDurationBreaches = getBreachCount('MINIMUM_TRADE_DURATION');
  const newsTradingBreaches = getBreachCount('NEWS_TRADING');
  const weekendTradingBreaches = getBreachCount('WEEKEND_TRADING');

  const maxSoftBreaches = num(rules.maxSoftBreachesBeforeClosure) ?? num(rules.maxSoftBreaches);
  const totalSoftBreaches = positionStackingBreaches + stopLossBreaches + minTradeDurationBreaches + newsTradingBreaches + weekendTradingBreaches;

  const isTwoStep = planType === 'TWO_STEP';
  const isOneStep = planType === 'ONE_STEP';
  const isInstant = planType === 'INSTANT';
  const isFundedPhase = account.phase === 'funded' || account.status === 'funded';

  // Profit target comes ONLY from the resolved rules. Funded / Instant / any
  // phase without a target → targetPct null → UI shows "No target", never 10%.
  const resolvedTargetPct = num(rules.profitTargetPct);
  const targetPct = (!isInstant && !isFundedPhase && resolvedTargetPct != null && resolvedTargetPct > 0)
    ? resolvedTargetPct
    : null;

  let targetLabel;
  if (isFundedPhase || isInstant) targetLabel = 'Profit Target';
  else if (isTwoStep) targetLabel = account.phase === 'phase2' ? 'Phase 2 Target' : 'Phase 1 Target';
  else if (isOneStep) targetLabel = 'Challenge Target';
  else targetLabel = 'Profit Target';

  const targetAmount = (targetPct != null && cap != null) ? (cap * targetPct) / 100 : null;
  const remaining = (targetAmount != null && profit != null) ? Math.max(0, targetAmount - profit) : null;
  const progress = (targetPct != null && profitPct != null) ? Math.min(100, Math.max(0, (profitPct / targetPct) * 100)) : null;

  const accountStatus = account.status ?? null;
  const statusTag = accountStatus === 'active' ? 'tag-green' : accountStatus === 'breached' ? 'tag-red' : accountStatus ? 'tag-gold' : 'tag-muted';
  const statusDot = accountStatus === 'active' ? C.pass : accountStatus === 'breached' ? C.breach : accountStatus ? C.warn : 'var(--muted)';

  const fin = (n) => Number.isFinite(Number(n));
  const pctStr = (n, sign = false) => {
    if (!fin(n)) return '—';
    const v = Number(n);
    return `${sign && v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
  };

  const dailyDD = num(rules.dailyDrawdownPct);
  const maxDDLimit = num(rules.maximumDrawdownPct);

  const KPIS = [
    {
      label: 'Profit Target',
      current: pctStr(profitPct, true),
      target: targetPct != null ? `${targetPct}%` : 'No target',
      status: targetPct == null || !fin(profitPct) ? 'progress' : profitPct >= targetPct ? 'pass' : 'progress',
      color: C.pass,
    },
    {
      label: 'Daily Drawdown',
      current: pctStr(todayPnlPct, true),
      target: dailyDD != null ? `-${dailyDD}%` : null,
      status: dailyDD == null || !fin(todayPnlPct) ? 'safe' : Math.abs(todayPnlPct) < dailyDD ? 'safe' : 'warning',
      color: dailyDD == null || !fin(todayPnlPct) ? 'var(--text)' : Math.abs(todayPnlPct) < dailyDD ? C.pass : C.breach,
    },
    {
      label: 'Max Drawdown',
      current: pctStr(maxDD),
      target: maxDDLimit != null ? `${maxDDLimit}%` : null,
      status: maxDDLimit == null || !fin(maxDD) ? 'safe' : maxDD < maxDDLimit ? 'safe' : 'warning',
      color: maxDDLimit == null || !fin(maxDD) ? 'var(--text)' : maxDD < maxDDLimit ? C.pass : C.breach,
    },
    {
      label: 'Profitable Days',
      current: `${uniqueProfitableDays}`,
      target: requiredProfitableDays != null ? `${requiredProfitableDays}` : '—',
      status: requiredProfitableDays == null ? 'progress' : uniqueProfitableDays >= requiredProfitableDays ? 'pass' : 'progress',
      color: requiredProfitableDays != null && uniqueProfitableDays >= requiredProfitableDays ? C.pass : 'var(--text)',
    },
    {
      label: 'Inactivity',
      current: `${daysSinceLastTrade}d`,
      target: inactivityLimit != null ? `${inactivityLimit}d` : '—',
      status: inactivityLimit == null ? 'safe' : daysSinceLastTrade < inactivityLimit ? 'safe' : 'warning',
      color: inactivityLimit == null ? 'var(--text)' : daysSinceLastTrade < inactivityLimit ? C.pass : C.breach,
    },
    {
      label: 'Soft Breaches',
      current: `${totalSoftBreaches}`,
      target: maxSoftBreaches != null ? `${maxSoftBreaches}` : '—',
      status: totalSoftBreaches === 0 ? 'safe' : maxSoftBreaches != null && totalSoftBreaches < maxSoftBreaches ? 'warning' : maxSoftBreaches != null ? 'breach' : 'warning',
      color: totalSoftBreaches === 0 ? C.pass : maxSoftBreaches != null && totalSoftBreaches < maxSoftBreaches ? C.warn : maxSoftBreaches != null ? C.breach : C.warn,
    },
  ];

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header — identity, plan/phase, live status */}
      <div style={{
        padding: '12px 16px',
        borderBottom: `1px solid ${C.line}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '9px',
            background: 'var(--grad)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'Manrope, sans-serif',
            fontWeight: 800,
            fontSize: '13px',
            color: '#040806',
            flexShrink: 0,
          }}>
            {(account.login_id || 'T')[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', lineHeight: 1.2, letterSpacing: '.01em' }}>
              {account.login_id}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '7px', marginTop: 3 }}>
              <span className={`tag ${isTwoStep ? 'tag-blue' : isOneStep ? 'tag-green' : isInstant ? 'tag-purple' : 'tag-muted'}`} style={{ fontSize: 9, padding: '2px 7px' }}>
                {planType ? planType.replace('_', ' ') : 'PLAN'}
              </span>
              <span style={{ fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.05em', fontSize: 10 }}>{phaseLabel}</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusDot, flexShrink: 0 }} />
          <span className={`tag ${statusTag}`} style={{ fontSize: 10, padding: '3px 9px' }}>
            {accountStatus ? accountStatus.toUpperCase() : 'UNKNOWN'}
          </span>
        </div>
      </div>

      {/* Phase progression (Two-Step) / Instant fund status */}
      {(isTwoStep || isInstant) && (
        <div style={{
          padding: '9px 16px',
          borderBottom: `1px solid var(--border)`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {isTwoStep ? (
              ['phase1', 'phase2', 'funded'].map((phase, i) => {
                const reached = account.phase === phase || (phase === 'phase2' && account.phase === 'funded') || (phase === 'funded' && account.phase === 'funded');
                const isCurrent = account.phase === phase;
                return (
                  <motion.div
                    key={phase}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.06 }}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px' }}
                  >
                    <div style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      fontWeight: 700,
                      fontSize: 10,
                      fontFamily: "'Manrope', sans-serif",
                      background: reached ? 'var(--grad)' : C.bg2,
                      color: reached ? '#040806' : 'var(--muted)',
                      border: isCurrent ? '2px solid var(--brand)' : '1px solid var(--border)',
                    }}>
                      {i + 1}
                    </div>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '.06em',
                      color: reached ? 'var(--text)' : 'var(--muted)',
                      fontFamily: "'Manrope', sans-serif",
                    }}>
                      {phase === 'phase1' ? 'PHASE 1' : phase === 'phase2' ? 'PHASE 2' : 'FUNDED'}
                    </span>
                    {i < 2 && <span style={{
                      width: '32px',
                      height: '2px',
                      background: account.phase === 'phase2' || account.phase === 'funded' ? 'var(--grad)' : 'var(--border)',
                      margin: '0 2px',
                    }} />}
                  </motion.div>
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                style={{ display: 'flex', alignItems: 'center', gap: '9px' }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                  fontSize: 13,
                  fontFamily: "'Manrope', sans-serif",
                  background: 'var(--grad)',
                  color: '#040806',
                }}>
                  ∞
                </div>
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '.08em',
                  color: 'var(--text)',
                  fontFamily: "'Manrope', sans-serif",
                }}>
                  INSTANT FUNDED
                </span>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Progress toward profit target (non-Instant) */}
      {!isInstant && (
        <div style={{ padding: '14px 16px', borderBottom: `1px solid var(--border)` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ minWidth: 0 }}>
              <span className="eyebrow" style={{ marginBottom: 0, fontSize: '10px' }}>{targetLabel}</span>
              <div style={{ marginTop: '4px' }}>
                <span style={{
                  fontFamily: "'Unbounded', 'Manrope', sans-serif",
                  fontWeight: 800,
                  fontSize: 'clamp(20px, 2.8vw, 28px)',
                  lineHeight: 1.1,
                  color: profit == null ? 'var(--text)' : profit >= 0 ? 'var(--text)' : C.breach,
                  fontVariantNumeric: 'tabular-nums',
                  overflowWrap: 'anywhere',
                }}>
                  {formatINR(profit, { decimals: 0, sign: true })}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif", marginTop: 2 }}>
                {targetPct != null
                  ? `of ${formatINR(targetAmount, { decimals: 0 })} target (${targetPct}%)`
                  : 'No profit target for this phase'}
              </div>
            </div>
            {targetPct != null && (
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '9px', color: 'var(--muted)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: '3px', fontFamily: "'Manrope', sans-serif" }}>
                  Remaining
                </div>
                <div style={{ fontFamily: "'Unbounded', 'Manrope', sans-serif", fontWeight: 800, fontSize: '15px', color: (remaining ?? 0) > 0 ? C.breach : C.pass, fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>
                  {(remaining ?? 0) > 0 ? formatINR(remaining, { decimals: 0 }) : 'TARGET REACHED'}
                </div>
              </div>
            )}
          </div>

          {targetPct != null && (
            <>
              <div style={{
                height: '6px',
                background: C.bg2,
                borderRadius: '99px',
                overflow: 'hidden',
                position: 'relative',
              }}>
                <motion.div
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: (progress ?? 0) / 100 }}
                  transition={{ duration: 0.9, delay: 0.2, ease: [0.19, 1, 0.22, 1] }}
                  style={{
                    height: '100%',
                    transformOrigin: 'left',
                    background: 'var(--grad)',
                    borderRadius: '99px',
                    boxShadow: '0 0 8px rgba(22,199,132,0.25)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10.5px', color: 'var(--muted)', flexWrap: 'wrap', gap: '8px', fontFamily: "'Manrope', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
                <span>{progress != null ? `${progress.toFixed(1)}% complete` : '—'}</span>
                <span>{fin(profitPct) ? `${profitPct >= 0 ? '+' : ''}${profitPct.toFixed(2)}% return` : '—'}</span>
                <span style={{ color: fin(profitPct) && profitPct >= targetPct ? C.pass : 'var(--muted)' }}>
                  {fin(profitPct) && profitPct >= targetPct ? '✓ Target achieved' : (progress != null ? `${(100 - progress).toFixed(1)}% to go` : '—')}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Rule health — KPI grid */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
          gap: '10px',
        }}>
          {KPIS.map((kpi, i) => (
            <motion.div
              key={kpi.label}
              className="card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: i * 0.04 }}
              style={{
                padding: '11px 12px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: kpi.color, opacity: 0.85 }} />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span className="eyebrow" style={{ marginBottom: 0, fontSize: '9px', letterSpacing: '.1em' }}>
                  {kpi.label}
                </span>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: statusTone(kpi.status),
                }} />
              </div>

              <div style={{ marginTop: '7px', display: 'flex', alignItems: 'baseline', gap: '5px', flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily: "'Unbounded', 'Manrope', sans-serif",
                  fontWeight: 800,
                  fontSize: 'clamp(18px, 2.1vw, 22px)',
                  lineHeight: 1.05,
                  color: kpi.color,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {kpi.current}
                </span>
                {kpi.target && (
                  <span style={{ fontSize: '10px', color: 'var(--muted)', fontFamily: "'Manrope', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
                    / {kpi.target}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Active rules — collapsible detail */}
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: `1px solid var(--border)` }}>
          <button
            onClick={(e) => {
              e.currentTarget.nextElementSibling.style.display =
                e.currentTarget.nextElementSibling.style.display === 'none' ? 'grid' : 'none';
              e.currentTarget.querySelector('svg').style.transform =
                e.currentTarget.nextElementSibling.style.display === 'none' ? 'rotate(-90deg)' : 'rotate(0deg)';
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: "'Manrope', sans-serif",
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              padding: '4px 0',
            }}
          >
            <span>Active Rules Summary</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ transition: 'transform 0.2s', flexShrink: 0 }}>
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(232px, 1fr))',
            gap: '10px',
            marginTop: '10px',
          }}>
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
