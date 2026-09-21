/**
 * lib/riskEngine.js — CANONICAL account risk evaluator  (Batch 20)
 *
 * ONE place that turns (account row, plan row, trade rows, soft-breach counts)
 * into structured risk metrics plus an INDICATIVE pass / breach read-out.
 *
 * NON-NEGOTIABLE CONTRACT
 *  - PURE. No Supabase, no fetch, no mutation. `now` is injectable. This
 *    module NEVER changes account state — calculation only.
 *  - NOT a rule source. Every limit comes from getRulesForAccount() in
 *    lib/rules.js. A limit the resolver leaves null STAYS null and its check
 *    is skipped — never replaced with a guessed default.
 *  - Does NOT enforce anything. `evaluation.enforced` is ALWAYS false: the
 *    platform has no trusted server-side trade/equity event source today
 *    (trades and accounts.equity are admin-maintained). The verdict is a
 *    decision-support signal for an operator, not an automated transition.
 *  - Honest gaps. Anything that cannot be derived from real columns is null
 *    and listed in `dataGaps` with a stable code.
 *
 * REAL DATA MODEL this evaluator is allowed to touch:
 *   accounts: equity, day_start_equity, phase, status, created_at, plan_id
 *   plans:    capital, plan_type  (+ rule columns, via the resolver)
 *   trades:   pnl, traded_at, instrument, side        ← nothing else exists
 *   soft_breaches: rule_type -> { count, lastBreachAt }
 */

import { getRulesForAccount } from '@/lib/rules';
import { isFunded } from '@/lib/accounts';

const IST = 'Asia/Kolkata';
const _istYmd = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit',
});

// null / undefined / '' are genuinely-absent -> null (NOT 0). Number(null) is 0,
// so the empty checks must come first (matches lib/accounts.js `fin`).
const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const posNum = (v) => {
  const n = num(v);
  return n != null && n > 0 ? n : null;
};

/** IST calendar-day key (YYYY-MM-DD) for a timestamp, or null. */
export function istDayKey(ts) {
  const d = ts instanceof Date ? ts : new Date(ts);
  return Number.isNaN(d.getTime()) ? null : _istYmd.format(d);
}

/* ------------------------------------------------------------------ *
 * Shared derivations — exact formulas, so every surface agrees.
 * ------------------------------------------------------------------ */

/**
 * Peak-to-trough drawdown of the running equity curve `capital + Σ trades.pnl`
 * walked in the order given. This is a TRADE-RECORD approximation, NOT a
 * trailing high-water-mark on real equity (no equity history exists).
 * Returns { maxDrawdownPct, maxDrawdownAmount, peak, trough } or null.
 */
export function equityCurveDrawdown(capital, trades) {
  const cap = posNum(capital);
  if (cap == null) return null;
  let peak = cap;
  let run = cap;
  let trough = cap;
  let ddPct = 0;
  let ddAmt = 0;
  for (const t of Array.isArray(trades) ? trades : []) {
    run += num(t?.pnl) || 0;
    if (run > peak) peak = run;
    const gap = peak - run;
    if (gap > ddAmt) { ddAmt = gap; trough = run; }
    const pct = peak > 0 ? (gap / peak) * 100 : 0;
    if (pct > ddPct) ddPct = pct;
  }
  return { maxDrawdownPct: ddPct, maxDrawdownAmount: ddAmt, peak, trough };
}

/** Backwards-compatible scalar helper (matches the old inline loops). */
export function equityCurveMaxDrawdownPct(capital, trades) {
  return equityCurveDrawdown(capital, trades)?.maxDrawdownPct ?? null;
}

/** Σ pnl of trades whose browser-LOCAL calendar day equals `now`'s. */
export function sumTradePnlOnLocalDay(trades, now = Date.now()) {
  const key = new Date(now).toDateString();
  return (Array.isArray(trades) ? trades : [])
    .filter((t) => new Date(t?.traded_at).toDateString() === key)
    .reduce((s, t) => s + (num(t?.pnl) || 0), 0);
}

/** Σ pnl of trades whose IST calendar day equals `now`'s IST day. */
export function sumTradePnlOnIstDay(trades, now = Date.now()) {
  const key = istDayKey(now);
  return (Array.isArray(trades) ? trades : [])
    .filter((t) => istDayKey(t?.traded_at) === key)
    .reduce((s, t) => s + (num(t?.pnl) || 0), 0);
}

/**
 * Count of distinct browser-LOCAL days with Σ-day pnl above `capital * fraction`.
 * `fraction` default 0.001 == 0.1% — the value the UI has always used.
 */
export function countLocalProfitableDays(trades, capital, fraction = 0.001) {
  const cap = posNum(capital);
  const threshold = cap != null ? cap * fraction : 0;
  const byDay = new Map();
  for (const t of Array.isArray(trades) ? trades : []) {
    const k = new Date(t?.traded_at).toDateString();
    byDay.set(k, (byDay.get(k) || 0) + (num(t?.pnl) || 0));
  }
  let n = 0;
  for (const v of byDay.values()) if (v > threshold) n += 1;
  return n;
}

/** Same, but on IST calendar days. */
export function countIstProfitableDays(trades, capital, fraction = 0.001) {
  const cap = posNum(capital);
  const threshold = cap != null ? cap * fraction : 0;
  const byDay = new Map();
  for (const t of Array.isArray(trades) ? trades : []) {
    const k = istDayKey(t?.traded_at);
    if (!k) continue;
    byDay.set(k, (byDay.get(k) || 0) + (num(t?.pnl) || 0));
  }
  let n = 0;
  for (const v of byDay.values()) if (v > threshold) n += 1;
  return n;
}

/* ------------------------------------------------------------------ *
 * Equity reconciliation (diagnostic ONLY — never mutates state)
 * ------------------------------------------------------------------ *
 * Compares the recorded accounts.equity against what the trade ledger
 * implies (plans.capital + Σ realized trades.pnl). accounts.equity is
 * operations-maintained and legitimately carries manual adjustments, so a
 * non-zero delta is INFORMATION, not an error to auto-correct.
 *
 * state:
 *   'MATCHED'      delta within ₹1
 *   'MISMATCH'     both sides known, delta ≥ ₹1
 *   'UNAVAILABLE'  capital or equity missing — cannot compare (NOT a mismatch)
 */
export function reconcileAccountEquity(account, plan, trades) {
  const startingCapital = posNum(plan?.capital ?? account?.plans?.capital);
  const currentEquity = num(account?.equity);
  const realizedTradePnl = (Array.isArray(trades) ? trades : []).reduce(
    (s, t) => s + (num(t?.pnl) || 0), 0,
  );
  const impliedEquity = startingCapital != null ? startingCapital + realizedTradePnl : null;
  const equityDelta = impliedEquity != null && currentEquity != null ? currentEquity - impliedEquity : null;
  const matches = equityDelta == null ? null : Math.abs(equityDelta) < 1;
  const state = equityDelta == null ? 'UNAVAILABLE' : matches ? 'MATCHED' : 'MISMATCH';
  return { startingCapital, currentEquity, realizedTradePnl, impliedEquity, equityDelta, matches, state };
}

/* ------------------------------------------------------------------ *
 * Main evaluator
 * ------------------------------------------------------------------ */

const G = {
  NO_EQUITY_HISTORY: 'Drawdown is approximated from trade-record P&L. True trailing high-water-mark drawdown needs stored equity snapshots, which the platform does not keep.',
  NO_AUTOMATIC_DAILY_RESET: 'Daily-loss limits are reference-only: there is no automatic IST day-start equity snapshot, so daily loss cannot be evaluated.',
  NO_UNREALIZED_PNL: 'Only realized, admin-entered trade P&L is available. Unrealized / open-position P&L is not recorded.',
  TRADE_SCHEMA_MINIMAL: 'Trade rows carry only instrument, side, pnl and time. Duration, quantity, stop-loss, strike and expiry are not recorded, so position-stacking, stop-loss, minimum-duration, news and weekend rules cannot be auto-detected.',
  PROFITABLE_DAYS_APPROX: 'Profitable-day count is derived from trade-record days, not from an independent trading-day log.',
  NO_CAPITAL: 'The plan has no capital value, so percentage-based rules cannot be evaluated.',
  NO_EQUITY: 'The account has no equity value, so net P&L and return cannot be computed.',
};

/**
 * @param {object} account  a public.accounts row
 * @param {object} plan     the joined public.plans row (account.plans)
 * @param {object} [ctx]
 * @param {Array}  [ctx.trades]        public.trades rows for this account
 * @param {object} [ctx.softBreaches]  { RULE_TYPE: { count, lastBreachAt } }
 * @param {number} [ctx.now]           ms epoch (default Date.now())
 * @returns structured risk read-out (see module header)
 */
export function evaluateAccountRisk(account, plan, ctx = {}) {
  const trades = Array.isArray(ctx.trades) ? ctx.trades.slice() : [];
  const softBreaches = ctx.softBreaches && typeof ctx.softBreaches === 'object' ? ctx.softBreaches : {};
  const now = Number.isFinite(ctx.now) ? ctx.now : Date.now();

  // chronological order for the equity walk
  trades.sort((a, b) => new Date(a?.traded_at).getTime() - new Date(b?.traded_at).getTime());

  const rules = account && plan ? (getRulesForAccount(account, plan) || {}) : {};
  const planType = plan?.plan_type ?? null;
  const phase = account?.phase ?? null;
  const accountStatus = account?.status ?? null;
  const fundedStage = isFunded(account) || planType === 'INSTANT';

  const startingCapital = posNum(plan?.capital);
  const currentEquity = num(account?.equity);
  const netPnl = startingCapital != null && currentEquity != null ? currentEquity - startingCapital : null;
  const returnPct = netPnl != null && startingCapital ? (netPnl / startingCapital) * 100 : null;

  // --- reconciliation (diagnostic only — never overwrites anything) ---
  const recon = reconcileAccountEquity(account, plan, trades);
  const { realizedTradePnl, impliedEquity, equityDelta, matches: reconMatches } = recon;

  // --- drawdown (trade-curve approximation) ---
  const dd = equityCurveDrawdown(startingCapital, trades);
  const maxDrawdownLimitPct = num(rules.maximumDrawdownPct);
  const observedMaxDrawdownPct = dd?.maxDrawdownPct ?? null;
  const maxDrawdownLimitBreached =
    maxDrawdownLimitPct != null && observedMaxDrawdownPct != null
      ? observedMaxDrawdownPct >= maxDrawdownLimitPct
      : null;

  const dailyDrawdownLimitPct = num(rules.dailyDrawdownPct);
  const dailyPnl = sumTradePnlOnIstDay(trades, now);
  const dailyPnlPct = startingCapital != null ? (dailyPnl / startingCapital) * 100 : null;

  // --- profit target ---
  const rawTargetPct = num(rules.profitTargetPct);
  const targetApplies = !fundedStage && rawTargetPct != null && rawTargetPct > 0;
  const profitTargetPct = targetApplies ? rawTargetPct : null;
  const profitTargetAmount = targetApplies && startingCapital != null ? (startingCapital * rawTargetPct) / 100 : null;
  const profitTargetProgressPct =
    targetApplies && returnPct != null ? Math.max(0, (returnPct / rawTargetPct) * 100) : null;
  const profitTargetMet =
    targetApplies && netPnl != null && profitTargetAmount != null ? netPnl >= profitTargetAmount : null;

  // --- profitable days (trade-record approximation) ---
  const thresholdFraction = (num(rules.profitableDayThresholdPct) ?? 0.1) / 100;
  const observedProfitableDays = countIstProfitableDays(trades, startingCapital, thresholdFraction);
  const requiredProfitableDays = num(rules.profitableTradingDays);
  const profitableDaysMet =
    requiredProfitableDays == null ? null : observedProfitableDays >= requiredProfitableDays;

  // --- inactivity ---
  const lastTradeTs = trades.length
    ? new Date(trades[trades.length - 1]?.traded_at).getTime()
    : (account?.created_at ? new Date(account.created_at).getTime() : null);
  const daysSinceLastTrade =
    lastTradeTs != null && Number.isFinite(lastTradeTs)
      ? Math.floor((now - lastTradeTs) / 86400000)
      : null;
  const inactivityLimitDays = num(rules.inactivityDays);
  const inactivityExceeded =
    inactivityLimitDays != null && daysSinceLastTrade != null
      ? daysSinceLastTrade >= inactivityLimitDays
      : null;

  // --- soft breaches ---
  const byType = {};
  let softTotal = 0;
  for (const [k, v] of Object.entries(softBreaches)) {
    const c = num(v?.count) || 0;
    byType[k] = c;
    softTotal += c;
  }
  const softLimit = num(rules.maxSoftBreachesBeforeClosure) ?? num(rules.maxSoftBreaches);
  const softLimitReached = softLimit != null ? softTotal >= softLimit : null;

  // --- indicative evaluation (NOT enforced) ---
  const breachReasons = [];
  if (accountStatus === 'breached') {
    breachReasons.push({ code: 'ACCOUNT_MARKED_BREACHED', label: 'Account is already marked breached by operations.', basis: 'account.status' });
  }
  if (maxDrawdownLimitBreached === true) {
    breachReasons.push({
      code: 'MAX_DRAWDOWN_EXCEEDED',
      label: `Trade-curve drawdown ${observedMaxDrawdownPct.toFixed(2)}% reached the ${maxDrawdownLimitPct}% maximum.`,
      basis: 'trade-record equity curve (approximation)',
    });
  }
  if (inactivityExceeded === true) {
    breachReasons.push({
      code: 'INACTIVITY_LIMIT_EXCEEDED',
      label: `${daysSinceLastTrade} days since the last trade — the limit is ${inactivityLimitDays}.`,
      basis: 'trades.traded_at',
    });
  }
  const breached = breachReasons.length > 0;

  const warnings = [];
  if (reconMatches === false) {
    warnings.push({
      code: 'EQUITY_RECONCILIATION_MISMATCH',
      label: `accounts.equity differs from capital + Σ trade P&L by ${equityDelta > 0 ? '+' : ''}${Math.round(equityDelta)}. Equity carries admin adjustments; this is informational.`,
    });
  }
  if (maxDrawdownLimitBreached === false && observedMaxDrawdownPct != null && maxDrawdownLimitPct != null
      && observedMaxDrawdownPct >= maxDrawdownLimitPct * 0.8) {
    warnings.push({ code: 'DRAWDOWN_NEAR_LIMIT', label: `Trade-curve drawdown ${observedMaxDrawdownPct.toFixed(2)}% is within 20% of the ${maxDrawdownLimitPct}% limit.` });
  }
  if (dailyDrawdownLimitPct != null && dailyPnlPct != null && dailyPnlPct <= -dailyDrawdownLimitPct) {
    warnings.push({ code: 'DAILY_LOSS_REFERENCE_EXCEEDED', label: `Today's trade P&L is ${dailyPnlPct.toFixed(2)}% vs a ${dailyDrawdownLimitPct}% daily limit — reference only (daily loss is not evaluated, see data gaps).` });
  }
  if (softLimitReached === true) {
    warnings.push({ code: 'SOFT_BREACH_LIMIT_REACHED', label: `Recorded soft breaches (${softTotal}) reached the configured limit (${softLimit}).` });
  }

  // pass evaluation only makes sense for a challenge stage
  let passed = null;
  const passBlockers = [];
  if (!fundedStage) {
    if (accountStatus === 'passed') {
      passed = true;
    } else if (!targetApplies) {
      passed = null;
      passBlockers.push({ code: 'NO_TARGET_CONFIGURED', label: 'No profit target is configured for this phase, so a pass cannot be evaluated.' });
    } else {
      if (startingCapital == null || currentEquity == null) passBlockers.push({ code: 'MISSING_CAPITAL_OR_EQUITY', label: 'Capital or equity is missing.' });
      if (profitTargetMet !== true) passBlockers.push({ code: 'TARGET_NOT_MET', label: 'Profit target has not been reached.' });
      if (breached) passBlockers.push({ code: 'OPEN_BREACH', label: 'An open breach reason is present.' });
      if (profitableDaysMet === false) passBlockers.push({ code: 'PROFITABLE_DAYS_NOT_MET', label: `Only ${observedProfitableDays} of ${requiredProfitableDays} profitable days observed.` });
      passed = passBlockers.length === 0;
    }
  }

  // --- data gaps (always-true structural limits + conditionals) ---
  const dataGaps = [
    { code: 'NO_EQUITY_HISTORY', label: G.NO_EQUITY_HISTORY },
    { code: 'NO_AUTOMATIC_DAILY_RESET', label: G.NO_AUTOMATIC_DAILY_RESET },
    { code: 'NO_UNREALIZED_PNL', label: G.NO_UNREALIZED_PNL },
    { code: 'TRADE_SCHEMA_MINIMAL', label: G.TRADE_SCHEMA_MINIMAL },
  ];
  if (requiredProfitableDays != null) dataGaps.push({ code: 'PROFITABLE_DAYS_APPROX', label: G.PROFITABLE_DAYS_APPROX });
  if (startingCapital == null) dataGaps.push({ code: 'NO_CAPITAL', label: G.NO_CAPITAL });
  if (currentEquity == null) dataGaps.push({ code: 'NO_EQUITY', label: G.NO_EQUITY });

  return {
    meta: {
      planType, phase, accountStatus, fundedStage,
      evaluatedAt: new Date(now).toISOString(),
    },
    capital: { startingCapital, currentEquity, netPnl, returnPct },
    reconciliation: recon,
    drawdown: {
      model: 'trade-curve-approximation',
      observedMaxDrawdownPct,
      observedMaxDrawdownAmount: dd?.maxDrawdownAmount ?? null,
      maxDrawdownLimitPct,
      maxDrawdownLimitBreached,
      dailyDrawdownLimitPct,
      dailyPnl,
      dailyPnlPct,
      dailyLossEvaluable: false,
    },
    target: {
      profitTargetPct,
      profitTargetAmount,
      profitTargetProgressPct,
      profitTargetMet,
    },
    profitableDays: {
      observed: observedProfitableDays,
      required: requiredProfitableDays,
      met: profitableDaysMet,
    },
    activity: { daysSinceLastTrade, inactivityLimitDays, inactivityExceeded },
    softBreaches: { total: softTotal, byType, limit: softLimit, limitReached: softLimitReached },
    evaluation: {
      enforced: false,
      breached,
      breachReasons,
      passed,
      passBlockers,
      warnings,
    },
    dataGaps,
  };
}
