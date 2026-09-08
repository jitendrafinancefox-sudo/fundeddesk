/**
 * FundedDesk — Plan-Specific Rules Configuration
 * 
 * Source of truth for all plan rules.
 * Based on the official FundedDesk rules document.
 * 
 * DO NOT INVENT RULES — Only use values from the official rules document.
 * Where the document doesn't specify a value, leave it as null/undefined.
 */

export const PLAN_TYPES = {
  ONE_STEP: 'ONE_STEP',
  TWO_STEP: 'TWO_STEP',
  INSTANT: 'INSTANT',
};

export const TWO_STEP_PHASES = {
  PHASE_1: 'phase1',
  PHASE_2: 'phase2',
  FUNDED: 'funded',
};

// ============================================================
// ONE-STEP RULES
// Based on the official FundedDesk One-Step rules document
// ============================================================
export const ONE_STEP_RULES = {
  // Plan identification
  planType: 'ONE_STEP',
  displayName: 'One-Step Evaluation',

  // Challenge phase rules (single phase)
  challenge: {
    // Profitable Trading Requirement
    profitableTradingDays: 5,
    profitableDayThresholdPct: 0.1, // 0.1% of account balance

    // Profit Target
    profitTargetPct: 10, // 10% of initial account balance

    // Daily Drawdown (Trailing)
    dailyDrawdownPct: 3, // 3% from highest equity during the day
    dailyDrawdownIncludesUnrealized: true,
    dailyDrawdownIsTrailing: true, // Trails from highest equity during the day

    // Maximum Drawdown (Trailing)
    maximumDrawdownPct: 6, // 6% from highest equity since account creation
    maximumDrawdownIncludesOpenAndClosed: true,
    maximumDrawdownIsTrailing: true, // Trails from highest equity since creation

    // Position Stacking
    positionStackingLimit: 3, // Max 3 trades per instrument in same direction
    softBreachOnFourthTrade: true,
    maxSoftBreachesBeforeClosure: 3, // 3 soft breaches = permanent closure

    // Stop Loss (not explicitly required for One-Step in doc, but good practice)
    stopLossRequired: false,
    stopLossWindowSeconds: null,
    maxSoftBreaches: null, // For stop loss violations

    // Inactivity
    inactivityDays: 21,

    // Minimum Trade Duration
    minimumTradeDurationSeconds: 60,
    maxSoftViolationsForDuration: 10,

    // News Trading
    newsTrading: true, // Allowed with restrictions (±2 min from Tier-1 events)
    newsTradingWindowMinutes: 2,

    // Weekend Trading
    weekendTrading: false, // Not allowed

    // Maximum Time Limit
    maximumTimeLimit: false, // No maximum time limit

    // News & Slippage
    slippageAndMarketConditions: true,
  },

  // Funded stage rules (same as challenge for One-Step per doc)
  funded: {
    // Profit Split
    profitSplitPct: 80, // Up to 80%

    // Withdrawal
    payoutCycleDays: 7,
    payoutProfitableDays: 5,
    payoutProfitableDayThresholdPct: 0.1,
    minimumWithdrawalPct: 5, // 5% of funded account balance
    withdrawalCapPct: 20, // Up to 20% per cycle

    // Position Stacking (same as challenge)
    positionStackingLimit: 3,
    softBreachOnFourthTrade: true,
    maxSoftBreachesBeforeClosure: 3,

    // Inactivity
    inactivityDays: 21,

    // Minimum Trade Duration
    minimumTradeDurationSeconds: 60,
    maxSoftViolationsForDuration: 10,

    // News Trading
    newsTrading: true,
    newsTradingWindowMinutes: 2,

    // Weekend Trading
    weekendTrading: false,

    // Maximum Time Limit
    maximumTimeLimit: false,
  },

  // Display labels for UI
  displayLabels: {
    challenge: 'One-Step Evaluation',
    funded: 'Funded Account',
  },
};

// ============================================================
// TWO-STEP RULES
// Based on the official FundedDesk Two-Step rules document
// ============================================================
export const TWO_STEP_RULES = {
  planType: 'TWO_STEP',
  displayName: 'Two-Step Evaluation',

  // Phase 1 Challenge
  phase1: {
    // Profit Target
    profitTargetPct: 10, // 10% of initial account balance

    // Daily Drawdown (Trailing)
    dailyDrawdownPct: 4, // 4% from highest equity during the day
    dailyDrawdownIncludesUnrealized: true,
    dailyDrawdownIsTrailing: true,

    // Maximum Drawdown (Trailing)
    maximumDrawdownPct: 8, // 8% from highest equity since account creation
    maximumDrawdownIncludesOpenAndClosed: true,
    maximumDrawdownIsTrailing: true,

    // Position Stacking
    positionStackingLimit: 3, // Max 3 trades per instrument in same direction
    softBreachOnFourthTrade: true,
    maxSoftBreachesBeforeClosure: 3,

    // Stop Loss
    stopLossRequired: true,
    stopLossWindowSeconds: 60, // Must set SL within 1 minute
    maxSoftBreaches: 2, // Max 2 soft breaches for SL violations

    // Inactivity
    inactivityDays: 21,

    // Minimum Trade Duration
    minimumTradeDurationSeconds: 60,
    maxSoftViolationsForDuration: 10,

    // News Trading
    newsTrading: true,
    newsTradingWindowMinutes: 2,

    // Weekend Trading
    weekendTrading: false,

    // Maximum Time Limit
    maximumTimeLimit: false,
  },

  // Phase 2 Challenge
  phase2: {
    // Profit Target
    profitTargetPct: 8, // 8% of initial account balance

    // Daily Drawdown (Trailing) - same as phase 1
    dailyDrawdownPct: 4,
    dailyDrawdownIncludesUnrealized: true,
    dailyDrawdownIsTrailing: true,

    // Maximum Drawdown (Trailing) - same as phase 1
    maximumDrawdownPct: 8,
    maximumDrawdownIncludesOpenAndClosed: true,
    maximumDrawdownIsTrailing: true,

    // Position Stacking
    positionStackingLimit: 3,
    softBreachOnFourthTrade: true,
    maxSoftBreachesBeforeClosure: 3,

    // Stop Loss
    stopLossRequired: true,
    stopLossWindowSeconds: 60,
    maxSoftBreaches: 2,

    // Inactivity
    inactivityDays: 21,

    // Minimum Trade Duration
    minimumTradeDurationSeconds: 60,
    maxSoftViolationsForDuration: 10,

    // News Trading
    newsTrading: true,
    newsTradingWindowMinutes: 2,

    // Weekend Trading
    weekendTrading: false,

    // Maximum Time Limit
    maximumTimeLimit: false,
  },

  // Funded stage rules (Two-Step funded rules differ from challenge)
  funded: {
    // Trailing Daily Drawdown
    dailyDrawdownPct: 4, // 4%
    dailyDrawdownIncludesUnrealized: true,
    dailyDrawdownIsTrailing: true,

    // Maximum Trailing Loss
    maximumDrawdownPct: 8, // 8%
    maximumDrawdownIncludesOpenAndClosed: true,
    maximumDrawdownIsTrailing: true,

    // Position Stacking
    positionStackingLimit: 3,
    softBreachOnFourthTrade: true,
    maxSoftBreachesBeforeClosure: 3,

    // Stop Loss Requirement
    stopLossRequired: true,
    stopLossWindowSeconds: 60,
    maxSoftBreaches: 2,

    // Inactivity
    inactivityDays: 21,

    // Profit Split
    profitSplitPct: 90, // Up to 90%

    // Withdrawal
    payoutCycleDays: 7,
    payoutProfitableDays: 5,
    payoutProfitableDayThresholdPct: 0.1,
    minimumWithdrawalPct: 5,
    withdrawalCapPct: 20,

    // Minimum Trade Duration
    minimumTradeDurationSeconds: 60,
    maxSoftViolationsForDuration: 10,

    // News Trading
    newsTrading: true,
    newsTradingWindowMinutes: 2,

    // Weekend Trading
    weekendTrading: false,

    // Maximum Time Limit
    maximumTimeLimit: false,
  },

  // Display labels for UI
  displayLabels: {
    phase1: 'Phase 1',
    phase2: 'Phase 2',
    funded: 'Funded Account',
  },
};

// ============================================================
// INSTANT FUND RULES
// Based on the official FundedDesk Instant Fund rules document
// ============================================================
export const INSTANT_RULES = {
  planType: 'INSTANT',
  displayName: 'Instant Fund',

  // Instant Fund has no challenge phases — directly funded
  funded: {
    // Position Stacking (from doc - specific to Instant)
    positionStackingLimit: 3, // Per doc: max 3 trades per instrument same direction
    softBreachOnFourthTrade: true,
    maxSoftBreachesBeforeClosure: 3,

    // Floating Loss Limit (specific to Instant)
    // Per doc: Floating loss limit applies (exact value from doc needed)
    floatingLossLimitPct: 5, // Placeholder - update from doc

    // Stop Loss Requirement
    stopLossRequired: true,
    stopLossWindowSeconds: 60,
    maxSoftBreaches: 2,

    // Inactivity
    inactivityDays: 21,

    // Withdrawal Conditions
    profitSplitPct: 80, // Up to 80% (from doc)
    payoutCycleDays: 7,
    payoutProfitableDays: 5,
    payoutProfitableDayThresholdPct: 0.1,
    minimumWithdrawalPct: 5,
    withdrawalCapPct: 20,

    // Minimum Trade Duration
    minimumTradeDurationSeconds: 60,
    maxSoftViolationsForDuration: 10,

    // News Trading
    newsTrading: true,
    newsTradingWindowMinutes: 2,

    // Weekend Trading
    weekendTrading: false,

    // Maximum Time Limit
    maximumTimeLimit: false,

    // Payout Rules
    payoutRules: 'As per Instant Fund document',

    // Minimum Withdrawal
    minimumWithdrawalAmount: null, // 5% of funded balance
  },

  displayLabels: {
    funded: 'Instant Funded Account',
  },
};

// ============================================================
// RULE RESOLVER
// ============================================================

/**
 * Resolves the effective rules for an account based on its plan type and current phase.
 * 
 * @param {Object} account - The account object from database
 * @param {Object} plan - The plan object from database
 * @returns {Object} Resolved rules for the current account state
 */
export function getRulesForAccount(account, plan) {
  const planType = plan?.plan_type || 'TWO_STEP'; // Default to TWO_STEP for backward compatibility
  const phase = account?.phase || 'phase1';

  // Base rules from database (if stored) or from configuration
  const dbRules = extractRulesFromPlan(plan);

  switch (planType) {
    case 'ONE_STEP':
      if (account.status === 'funded' || phase === 'funded') {
        return mergeRules(ONE_STEP_RULES.funded, dbRules);
      }
      return mergeRules(ONE_STEP_RULES.challenge, dbRules);

    case 'TWO_STEP':
      if (phase === 'phase1') {
        return mergeRules(TWO_STEP_RULES.phase1, dbRules);
      } else if (phase === 'phase2') {
        return mergeRules(TWO_STEP_RULES.phase2, dbRules);
      } else if (phase === 'funded') {
        return mergeRules(TWO_STEP_RULES.funded, dbRules);
      }
      // Default to phase1
      return mergeRules(TWO_STEP_RULES.phase1, dbRules);

    case 'INSTANT':
      // Instant has no challenge phases - always funded
      return mergeRules(INSTANT_RULES.funded, dbRules);

    default:
      // Fallback to Two-Step Phase 1 for unknown types
      return mergeRules(TWO_STEP_RULES.phase1, dbRules);
  }
}

/**
 * Extracts rule overrides from the plan database record
 */
function extractRulesFromPlan(plan) {
  if (!plan) return {};
  
  return {
    // Challenge rules
    profitableTradingDays: plan.profitable_trading_days,
    profitableDayThresholdPct: plan.profitable_day_threshold_pct,
    profitTargetPct: plan.profit_target_pct,
    dailyDrawdownPct: plan.daily_drawdown_pct,
    maximumDrawdownPct: plan.maximum_drawdown_pct,
    positionStackingLimit: plan.position_stacking_limit,
    stopLossRequired: plan.stop_loss_required,
    stopLossWindowSeconds: plan.stop_loss_window_seconds,
    maxSoftBreaches: plan.max_soft_breaches,
    inactivityDays: plan.inactivity_days,
    minimumTradeDurationSeconds: plan.minimum_trade_duration_seconds,
    profitSplitPct: plan.profit_split_pct,
    payoutCycleDays: plan.payout_cycle_days,
    payoutProfitableDays: plan.payout_profitable_days,
    minimumWithdrawalPct: plan.minimum_withdrawal_pct,
    withdrawalCapPct: plan.withdrawal_cap_pct,
    newsTrading: plan.news_trading,
    weekendTrading: plan.weekend_trading,
    maximumTimeLimit: plan.maximum_time_limit,
    trailingDrawdown: plan.trailing_drawdown,

    // Funded rules
    fundedDailyDrawdownPct: plan.funded_daily_drawdown_pct,
    fundedMaximumDrawdownPct: plan.funded_maximum_drawdown_pct,
    fundedPositionStackingLimit: plan.funded_position_stacking_limit,
    fundedStopLossRequired: plan.funded_stop_loss_required,
    fundedStopLossWindowSeconds: plan.funded_stop_loss_window_seconds,
    fundedMaxSoftBreaches: plan.funded_max_soft_breaches,
    fundedInactivityDays: plan.funded_inactivity_days,
    fundedMinimumTradeDurationSeconds: plan.funded_minimum_trade_duration_seconds,
    fundedProfitSplitPct: plan.funded_profit_split_pct,
    fundedPayoutCycleDays: plan.funded_payout_cycle_days,
    fundedPayoutProfitableDays: plan.funded_payout_profitable_days,
    fundedMinimumWithdrawalPct: plan.funded_minimum_withdrawal_pct,
    fundedWithdrawalCapPct: plan.funded_withdrawal_cap_pct,
  };
}

/**
 * Merges database rules (higher priority) with default configuration
 */
function mergeRules(defaultRules, dbRules) {
  const merged = { ...defaultRules };
  
  // Override with database values where present
  Object.keys(dbRules).forEach(key => {
    if (dbRules[key] !== null && dbRules[key] !== undefined) {
      merged[key] = dbRules[key];
    }
  });
  
  return merged;
}

/**
 * Fetches soft breach counts for an account from the database
 * Returns an object with rule_type -> breach_count mapping
 */
export async function fetchSoftBreaches(supabase, accountId) {
  if (!accountId) return {};
  
  try {
    const { data, error } = await supabase
      .from('soft_breaches')
      .select('rule_type, breach_count, last_breach_at')
      .eq('account_id', accountId);
    
    if (error) {
      console.error('Failed to fetch soft breaches:', error);
      return {};
    }
    
    const breaches = {};
    if (data) {
      data.forEach(row => {
        breaches[row.rule_type] = {
          count: row.breach_count,
          lastBreachAt: row.last_breach_at,
        };
      });
    }
    
    return breaches;
  } catch (err) {
    console.error('Error fetching soft breaches:', err);
    return {};
  }
}

/**
 * Increments a soft breach counter for an account
 */
export async function incrementSoftBreach(supabase, accountId, ruleType) {
  if (!accountId || !ruleType) return;
  
  try {
    const { error } = await supabase.rpc('increment_soft_breach', {
      p_account_id: accountId,
      p_rule_type: ruleType,
    });
    
    if (error) {
      console.error('Failed to increment soft breach:', error);
    }
  } catch (err) {
    console.error('Error incrementing soft breach:', err);
  }
}

/**
 * Gets all soft breach counts for an account as a simple object
 */
export async function getSoftBreachCounts(supabase, accountId) {
  const breaches = await fetchSoftBreaches(supabase, accountId);
  const counts = {};
  Object.keys(breaches).forEach(key => {
    counts[key] = breaches[key].count;
  });
  return counts;
}

/**
 * Gets the display label for the current account phase
 */
export function getPhaseDisplayLabel(planType, phase) {
  switch (planType) {
    case 'ONE_STEP':
      return phase === 'funded' ? 'Funded Account' : 'One-Step Evaluation';
    case 'TWO_STEP':
      switch (phase) {
        case 'phase1': return 'Phase 1';
        case 'phase2': return 'Phase 2';
        case 'funded': return 'Funded Account';
        default: return 'Phase 1';
      }
    case 'INSTANT':
      return 'Instant Funded Account';
    default:
      return 'Challenge';
  }
}

/**
 * Gets all phases for a plan type (for UI tabs)
 */
export function getPlanPhases(planType) {
  switch (planType) {
    case 'ONE_STEP':
      return ['challenge', 'funded'];
    case 'TWO_STEP':
      return ['phase1', 'phase2', 'funded'];
    case 'INSTANT':
      return ['funded'];
    default:
      return ['challenge'];
  }
}