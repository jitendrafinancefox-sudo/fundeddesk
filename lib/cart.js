/**
 * Challenge selection persistence  (Batch 3)
 *
 * A single pending selection carried from /challenges to /cart. This is NOT
 * a state system — it is one small localStorage record so a refresh or a
 * login round-trip on /cart doesn't lose the plan the user picked. The
 * authoritative plan data is always re-read from the `plans` table by id;
 * nothing here stores prices, discounts or rules.
 */

const KEY = 'fd-cart-selection';

export function readSelection() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v || typeof v.planId !== 'string') return null;
    return { planId: v.planId, evalType: typeof v.evalType === 'string' ? v.evalType : null };
  } catch (e) {
    return null;
  }
}

export function writeSelection(sel) {
  try {
    if (!sel || !sel.planId) return;
    localStorage.setItem(KEY, JSON.stringify({ planId: String(sel.planId), evalType: sel.evalType || null }));
  } catch (e) {}
}

export function clearSelection() {
  try { localStorage.removeItem(KEY); } catch (e) {}
}

/** plans.plan_type -> orders.eval_type (mirrors the real plan structure; no pricing implied) */
export function evalTypeForPlan(planType) {
  if (planType === 'ONE_STEP') return '1step';
  if (planType === 'INSTANT') return 'instant';
  return '2step';
}
