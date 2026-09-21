/**
 * Account presentation helpers  (Batch 2)
 *
 * Pure, null-safe derivations from REAL account/plan columns only:
 *   accounts: id, login_id, phase, status, equity, day_start_equity, created_at, plan_id
 *   plans:    name, capital, plan_type, ...
 *
 * No rule logic lives here — phase/rule resolution stays in lib/rules.js.
 * No value is ever invented: missing inputs produce null, which the UI
 * renders as "—".
 */

export const PLAN_TYPE_LABELS = {
  ONE_STEP: 'One-Step',
  TWO_STEP: 'Two-Step',
  INSTANT: 'Instant',
};

export function getPlanTypeLabel(planType) {
  if (!planType) return '—';
  return PLAN_TYPE_LABELS[planType] || planType.replace(/_/g, ' ');
}

/**
 * Maps the raw DB status value to a human label + tag class WITHOUT
 * changing the underlying value. Known values: active | breached | passed
 * | funded (funded also appears as a phase). Anything else is passed
 * through uppercased.
 */
export function getStatusMeta(status) {
  switch (status) {
    case 'active':   return { label: 'Active',     tag: 'tag-green' };
    case 'breached': return { label: 'Not Passed', tag: 'tag-red' };
    case 'passed':   return { label: 'Passed',     tag: 'tag-blue' };
    case 'funded':   return { label: 'Funded',     tag: 'tag-green' };
    default:         return { label: status ? String(status).toUpperCase() : 'Unknown', tag: 'tag-muted' };
  }
}

/** True when the account has reached the funded stage. */
export function isFunded(account) {
  return account?.phase === 'funded' || account?.status === 'funded';
}

/**
 * Lifecycle bucket for the Accounts tabs. Every account falls in exactly
 * one bucket: 'instant' | 'funded' | 'challenge'.
 */
export function getLifecycle(account, plan) {
  const planType = plan?.plan_type ?? account?.plans?.plan_type ?? null;
  if (planType === 'INSTANT') return 'instant';
  if (isFunded(account)) return 'funded';
  return 'challenge';
}

const fin = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Money figures for an account, from real columns only.
 * capital  -> plans.capital
 * equity   -> accounts.equity
 * pnl      -> equity - capital            (null unless both present)
 * pnlPct   -> pnl / capital * 100
 * todayPnl -> equity - day_start_equity   (null unless both present)
 */
export function accountFinancials(account, plan) {
  const p = plan ?? account?.plans ?? null;
  const capital = fin(p?.capital);
  const equity = fin(account?.equity);
  const dayStart = fin(account?.day_start_equity);
  const pnl = capital != null && equity != null ? equity - capital : null;
  const pnlPct = pnl != null && capital ? (pnl / capital) * 100 : null;
  const todayPnl = equity != null && dayStart != null ? equity - dayStart : null;
  return { capital, equity, pnl, pnlPct, todayPnl };
}

/**
 * ONE canonical read of "where is this account in its lifecycle" — composed
 * from the existing helpers so callers don't each re-interpret the
 * status / phase / plan_type triple differently.
 *
 * Reflects only the ACTUAL schema values:
 *   accounts.status ∈ active | breached | passed        (schema.sql default 'active')
 *   accounts.phase  ∈ phase1 | phase2 | funded          (schema.sql default 'phase1')
 *   plans.plan_type ∈ ONE_STEP | TWO_STEP | INSTANT
 *
 * There is no separate "funded status" — funded is a PHASE. `stage` collapses
 * the two without inventing new states. Human labels stay in lib/rules.js
 * (getPhaseDisplayLabel) / getStatusMeta here — callers add those.
 *
 * @returns {{
 *   status: string|null, phase: string|null, planType: string|null,
 *   isFunded: boolean, isTerminal: boolean, isTradeable: boolean,
 *   stage: 'challenge'|'funded'|'breached'|'passed'|'unknown',
 *   statusLabel: string,
 * }}
 */
export function getAccountLifecycleState(account, plan) {
  const planType = plan?.plan_type ?? account?.plans?.plan_type ?? null;
  const status = account?.status ?? null;
  const phase = account?.phase ?? null;
  const funded = isFunded(account);

  let stage = 'unknown';
  if (status === 'breached') stage = 'breached';
  else if (status === 'passed') stage = 'passed';
  else if (funded) stage = 'funded';
  else if (status === 'active') stage = 'challenge';

  return {
    status,
    phase,
    planType,
    isFunded: funded,
    // terminal = no further automatic progression is expected from this state
    isTerminal: status === 'breached',
    isTradeable: status === 'active' || funded,
    stage,
    statusLabel: getStatusMeta(status).label,
  };
}
