/**
 * lib/simRisk.js — simulator-side rule/risk adapter  (Phase 6)
 *
 * NOT a rule source and NOT a second risk engine. Every limit still comes
 * from getRulesForAccount() (lib/rules.js); every drawdown/profitable-day
 * formula is the exact one already exported by lib/riskEngine.js — this
 * file only applies those canonical formulas to the SIMULATOR's own
 * (TradingStore) state instead of the real admin-maintained trades table,
 * and only for rules the simulator can honestly evaluate from data it
 * actually has (real timestamps, real simulated fills).
 *
 * Two use cases:
 *  - checkOrderAgainstRules / checkCloseAgainstRules: called by
 *    TradingStore before it mutates state, so a violation is rejected the
 *    same way an insufficient-margin order already is (a real 'rejected'
 *    order record with a real reason) — no separate blocking UI needed.
 *  - summarizeSimRisk: a read-only snapshot for the terminal's account
 *    popover. Never mutates anything.
 *
 * Every field this module cannot honestly evaluate is null, not a guess.
 */

import { equityCurveDrawdown, countIstProfitableDays } from '@/lib/riskEngine';

/** Same weekday check IS_MARKET_OPEN() already uses (components/terminal/constants.js) — not a second timezone source. */
export function isWeekendNow() {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

/**
 * Pre-trade check. Returns { ok: true } or { ok: false, reason }.
 * `rules` is whatever getRulesForAccount() returned (or null/undefined —
 * every check below is skipped when the limit it needs is null).
 */
export function checkOrderAgainstRules({ rules, positions, trades, account, capital, side, underlying, sl }) {
  if (!rules) return { ok: true };

  if (rules.weekendTrading === false && isWeekendNow()) {
    return { ok: false, reason: 'Weekend trading is not permitted for this account.' };
  }

  if (rules.stopLossRequired && (sl == null || !(Number(sl) > 0))) {
    return { ok: false, reason: 'Stop Loss is required for this account.' };
  }

  const stackingLimit = Number(rules.positionStackingLimit);
  if (Number.isFinite(stackingLimit) && stackingLimit > 0) {
    const sameDirectionCount = (Array.isArray(positions) ? positions : [])
      .filter((p) => p.underlying === underlying && p.side === side).length;
    if (sameDirectionCount >= stackingLimit) {
      return { ok: false, reason: `Position stacking limit reached (${stackingLimit} ${side} position${stackingLimit === 1 ? '' : 's'} on ${underlying}).` };
    }
  }

  const cap = Number(capital);
  if (Number.isFinite(cap) && cap > 0) {
    const maxDrawdownLimitPct = Number(rules.maximumDrawdownPct);
    if (Number.isFinite(maxDrawdownLimitPct)) {
      const dd = equityCurveDrawdown(cap, simTradesForCurve(trades));
      if (dd && dd.maxDrawdownPct >= maxDrawdownLimitPct) {
        return { ok: false, reason: `Maximum drawdown limit reached (simulated ${dd.maxDrawdownPct.toFixed(2)}% ≥ ${maxDrawdownLimitPct}%).` };
      }
    }

    const dailyDrawdownLimitPct = Number(rules.dailyDrawdownPct);
    const dailyPeak = Number(account?.dailyPeakEquity);
    const equity = Number(account?.equity);
    if (Number.isFinite(dailyDrawdownLimitPct) && Number.isFinite(dailyPeak) && dailyPeak > 0 && Number.isFinite(equity)) {
      const pct = ((dailyPeak - equity) / dailyPeak) * 100;
      if (pct >= dailyDrawdownLimitPct) {
        return { ok: false, reason: `Daily drawdown limit reached (simulated ${pct.toFixed(2)}% ≥ ${dailyDrawdownLimitPct}%, from today's peak equity).` };
      }
    }
  }

  return { ok: true };
}

/**
 * Pre-close check (minimum trade duration only — the one close-time rule
 * the simulator has trustworthy data for: real open/close timestamps).
 */
export function checkCloseAgainstRules({ rules, position, now = Date.now() }) {
  if (!rules || !position) return { ok: true };
  const minSeconds = Number(rules.minimumTradeDurationSeconds);
  if (!Number.isFinite(minSeconds) || minSeconds <= 0) return { ok: true };
  const openedAt = Number(position.openedAt);
  if (!Number.isFinite(openedAt)) return { ok: true };
  const heldSeconds = (now - openedAt) / 1000;
  if (heldSeconds < minSeconds) {
    return { ok: false, reason: `Minimum trade duration not reached (${Math.ceil(minSeconds - heldSeconds)}s remaining).` };
  }
  return { ok: true };
}

// equityCurveDrawdown walks trades in order and expects a `.pnl` field —
// TradingStore's trade records already use that exact shape.
function simTradesForCurve(trades) {
  return Array.isArray(trades) ? trades : [];
}

/**
 * Read-only simulator risk snapshot for the account popover. Every section
 * only appears when the underlying rule actually applies to this account
 * (getRulesForAccount already resolved that) AND the simulator has data
 * to back it — otherwise the field is null and the caller should render
 * "—" / an explicit "unavailable" label, never a guessed number.
 */
export function summarizeSimRisk({ rules, account, trades, capital }) {
  if (!rules) return null;
  const cap = Number(capital);
  const hasCapital = Number.isFinite(cap) && cap > 0;

  const maxDrawdownLimitPct = Number.isFinite(Number(rules.maximumDrawdownPct)) ? Number(rules.maximumDrawdownPct) : null;
  const dd = hasCapital ? equityCurveDrawdown(cap, simTradesForCurve(trades)) : null;
  const maxDrawdown = {
    limitPct: maxDrawdownLimitPct,
    observedPct: dd?.maxDrawdownPct ?? null,
    observedAmount: dd?.maxDrawdownAmount ?? null,
    limitAmount: maxDrawdownLimitPct != null && hasCapital ? (cap * maxDrawdownLimitPct) / 100 : null,
    breached: maxDrawdownLimitPct != null && dd ? dd.maxDrawdownPct >= maxDrawdownLimitPct : null,
  };

  const dailyDrawdownLimitPct = Number.isFinite(Number(rules.dailyDrawdownPct)) ? Number(rules.dailyDrawdownPct) : null;
  const dailyPeak = Number(account?.dailyPeakEquity);
  const equity = Number(account?.equity);
  const dailyObservedPct = dailyDrawdownLimitPct != null && Number.isFinite(dailyPeak) && dailyPeak > 0 && Number.isFinite(equity)
    ? Math.max(0, ((dailyPeak - equity) / dailyPeak) * 100)
    : null;
  const dailyDrawdown = {
    limitPct: dailyDrawdownLimitPct,
    observedPct: dailyObservedPct,
    breached: dailyDrawdownLimitPct != null && dailyObservedPct != null ? dailyObservedPct >= dailyDrawdownLimitPct : null,
    // Always calculable when a peak exists — this is the simulator's OWN
    // live equity high-water-mark, unlike the real ledger (see riskEngine.js).
    evaluable: Number.isFinite(dailyPeak),
  };

  const profitTargetPct = Number.isFinite(Number(rules.profitTargetPct)) && Number(rules.profitTargetPct) > 0 ? Number(rules.profitTargetPct) : null;
  const netPnl = hasCapital && Number.isFinite(equity) ? equity - cap : null;
  const profitTarget = profitTargetPct == null ? null : {
    pct: profitTargetPct,
    amount: hasCapital ? (cap * profitTargetPct) / 100 : null,
    progressPct: hasCapital && netPnl != null ? Math.max(0, (netPnl / cap) * 100 / profitTargetPct * 100) : null,
    met: hasCapital && netPnl != null ? netPnl >= (cap * profitTargetPct) / 100 : null,
  };

  const requiredProfitableDays = Number.isFinite(Number(rules.profitableTradingDays)) ? Number(rules.profitableTradingDays) : null;
  const profitableDays = requiredProfitableDays == null || !hasCapital ? null : {
    required: requiredProfitableDays,
    observed: countIstProfitableDays(simTradesForCurve(trades), cap, (Number(rules.profitableDayThresholdPct) || 0.1) / 100),
  };

  const positionStackingLimit = Number.isFinite(Number(rules.positionStackingLimit)) ? Number(rules.positionStackingLimit) : null;

  return {
    maxDrawdown,
    dailyDrawdown,
    profitTarget,
    profitableDays,
    stopLossRequired: !!rules.stopLossRequired,
    positionStackingLimit,
    minimumTradeDurationSeconds: Number.isFinite(Number(rules.minimumTradeDurationSeconds)) ? Number(rules.minimumTradeDurationSeconds) : null,
    weekendTradingBlocked: rules.weekendTrading === false && isWeekendNow(),
  };
}
