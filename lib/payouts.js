/**
 * Payout presentation + eligibility helpers  (Batch 4)
 *
 * The ONLY payout table is `public.payouts`
 *   (id, account_id, user_id, amount bigint, status text default 'requested', created_at)
 * Statuses used by the real admin/user flow: 'requested' | 'paid' | 'rejected'.
 *
 * Eligibility mirrors the behaviour that already exists in the codebase
 * (app/portal/payouts + app/dashboard): a payout needs a FUNDED account
 * that is currently in profit. Split / min / max come from the canonical
 * resolver (lib/rules.js) — never invented here. A rule value that the
 * resolver leaves null stays null and the UI shows "Not specified".
 */

import { getRulesForAccount } from '@/lib/rules';
import { isFunded, accountFinancials } from '@/lib/accounts';

/** payouts.status -> { label, tag } (display only; underlying value untouched) */
export function payoutStatusMeta(status) {
  switch (status) {
    case 'requested': return { label: 'Requested', tag: 'tag-gold' };
    case 'paid':      return { label: 'Paid',      tag: 'tag-green' };
    case 'rejected':  return { label: 'Rejected',  tag: 'tag-red' };
    default:          return { label: status ? String(status) : 'Status unavailable', tag: 'tag-muted' };
  }
}

const finite = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

/**
 * Eligibility for ONE account, derived from real fields + the resolver.
 *
 * @returns {{
 *   state: 'eligible' | 'ineligible' | 'unknown',
 *   reason: string,
 *   funded: boolean,
 *   capital: number|null,
 *   equity: number|null,
 *   profit: number|null,          // equity - capital
 *   splitPct: number|null,        // resolver profitSplitPct
 *   splitAmount: number|null,     // round(profit * splitPct/100) when both known
 *   minAmount: number|null,       // round(capital * minimumWithdrawalPct/100) when configured
 *   maxAmount: number|null,       // min(profit, round(capital * withdrawalCapPct/100)) — profit cap always applies
 *   cycleDays: number|null,
 *   cycleProfitableDays: number|null,
 * }}
 */
export function computeEligibility(account, plan) {
  const funded = isFunded(account);
  const { capital, equity, pnl } = accountFinancials(account, plan);
  const profit = pnl; // equity - capital

  const rules = funded && plan ? (getRulesForAccount(account, plan) || {}) : {};
  const splitPct = finite(rules.profitSplitPct);
  const minPct = finite(rules.minimumWithdrawalPct);
  const capPct = finite(rules.withdrawalCapPct);

  const splitAmount = splitPct != null && profit != null && profit > 0
    ? Math.round((profit * splitPct) / 100)
    : null;

  // % limits are interpreted against account size (capital), matching how
  // targets are computed elsewhere (AccountContext). Only applied when the
  // resolver actually carries the value.
  const minAmount = minPct != null && capital != null ? Math.round((capital * minPct) / 100) : null;
  const capAmount = capPct != null && capital != null ? Math.round((capital * capPct) / 100) : null;
  const maxAmount = profit != null
    ? (capAmount != null ? Math.min(profit, capAmount) : profit)
    : capAmount;

  let state = 'unknown';
  let reason = 'Eligibility cannot be determined — account financials are unavailable.';

  if (!funded) {
    state = 'ineligible';
    reason = 'Account is not funded yet.';
  } else if (capital == null || equity == null) {
    state = 'unknown';
    reason = 'Eligibility cannot be determined — capital or equity is missing on this account.';
  } else if (profit == null || profit <= 0) {
    state = 'ineligible';
    reason = 'No profit available on this account yet.';
  } else if (minAmount != null && profit < minAmount) {
    state = 'ineligible';
    reason = `Available profit is below the configured minimum payout.`;
  } else {
    state = 'eligible';
    reason = 'Funded account with profit available to request.';
  }

  return {
    state,
    reason,
    funded,
    capital,
    equity,
    profit,
    splitPct,
    splitAmount,
    minAmount,
    maxAmount,
    cycleDays: finite(rules.payoutCycleDays),
    cycleProfitableDays: finite(rules.payoutProfitableDays),
  };
}

/**
 * Validate a requested payout amount against the derived bounds.
 * Returns an error string, or null when the amount is acceptable.
 */
export function validatePayoutAmount(amount, elig) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 'Enter a valid amount.';
  if (n <= 0) return 'Amount must be greater than zero.';
  if (!Number.isInteger(n)) return 'Enter a whole rupee amount.';
  if (elig.profit == null) return 'Available amount is unknown for this account.';
  if (n > elig.profit) return 'Amount cannot exceed the profit available on this account.';
  if (elig.minAmount != null && n < elig.minAmount) return `Minimum payout is ₹${elig.minAmount.toLocaleString('en-IN')}.`;
  if (elig.maxAmount != null && n > elig.maxAmount) return `Maximum payout for this request is ₹${elig.maxAmount.toLocaleString('en-IN')}.`;
  return null;
}
