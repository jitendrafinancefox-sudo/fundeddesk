/**
 * Plan rule summary for the challenge catalogue / cart  (Batch 3)
 *
 * Thin adapter over the canonical resolver in lib/rules.js. It does NOT
 * re-derive any rule — it calls getRulesForAccount() with a synthetic
 * account whose phase reflects the *starting* stage for that plan type,
 * then passes the resolved values straight through. Missing values stay
 * null so the UI can render "Not specified".
 */

import { getRulesForAccount, getPlanPhases, getPhaseDisplayLabel } from '@/lib/rules';

function startingPhaseFor(planType) {
  switch (planType) {
    case 'ONE_STEP': return 'challenge';
    case 'INSTANT': return 'funded';
    case 'TWO_STEP':
    default: return 'phase1';
  }
}

const finite = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

/**
 * @param {object} plan  a row from the `plans` table (must include plan_type)
 * @returns {{
 *   planType: string|null,
 *   phases: {key:string,label:string}[],
 *   profitTargetPct: number|null,
 *   dailyDrawdownPct: number|null,
 *   maximumDrawdownPct: number|null,
 *   profitSplitPct: number|null,
 *   profitableTradingDays: number|null,
 *   inactivityDays: number|null,
 *   minimumTradeDurationSeconds: number|null,
 *   payoutCycleDays: number|null,
 * }}
 */
export function planRuleSummary(plan) {
  const planType = plan?.plan_type ?? null;
  const phase = startingPhaseFor(planType);
  const rules = getRulesForAccount({ phase, status: phase === 'funded' ? 'funded' : 'active' }, plan) || {};

  const phaseKeys = getPlanPhases(planType || 'TWO_STEP');
  const phases = phaseKeys.map((k) => ({ key: k, label: getPhaseDisplayLabel(planType, k === 'challenge' ? 'challenge' : k) }));

  return {
    planType,
    phases,
    profitTargetPct: finite(rules.profitTargetPct),
    dailyDrawdownPct: finite(rules.dailyDrawdownPct),
    maximumDrawdownPct: finite(rules.maximumDrawdownPct),
    profitSplitPct: finite(rules.profitSplitPct),
    profitableTradingDays: finite(rules.profitableTradingDays),
    inactivityDays: finite(rules.inactivityDays),
    minimumTradeDurationSeconds: finite(rules.minimumTradeDurationSeconds),
    payoutCycleDays: finite(rules.payoutCycleDays),
  };
}
