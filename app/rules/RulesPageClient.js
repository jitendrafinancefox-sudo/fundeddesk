'use client';

/* ============================================================
   /rules — Knowledge Base workspace  (single canonical route)

   Rule values are NEVER computed here. Everything comes from the
   canonical resolver:  getRulesForAccount(account, plan)  in lib/rules.js
   (DB overrides on the plan row take precedence automatically). A value
   the resolver leaves null/undefined is shown as "Not specified" — it is
   never turned into a number, "Allowed", or "Not allowed".

   Navigation is a documentation tree, strictly one-directional:

       PROGRAM  →  PHASE (Two-Step only)  →  CATEGORY  →  RULES

   The left pane is an accordion tree (only the active program's branch is
   expanded); the right pane renders exactly one category's rule
   accordions — never every category stacked vertically, and never a
   permanent cross-program comparison table.

   Account-aware: this route is linked from both marketing pages and the
   portal sidebar, so it does its own lightweight session/account read
   (like /challenges and /cart) rather than depending on the portal-only
   PortalDataProvider. It shares the `fd-selected-account` localStorage key
   with the portal so the selected account stays in sync. Account context
   is a single subtle line, never the primary content, and ₹ amounts only
   ever appear when a real account's plan capital is known.
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  BookOpen, HelpCircle, FileText, ShieldAlert,
  CandlestickChart, SlidersHorizontal, ShieldCheck, Clock, Wallet, Banknote, RotateCcw, Info,
  Plus, ArrowRightCircle, Layers, Zap, Check,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getRulesForAccount, getPhaseDisplayLabel, getPlanPhases, PLAN_TYPES } from '@/lib/rules';
import { getPlanTypeLabel } from '@/lib/accounts';
import { formatINR } from '@/lib/format';
import RulesHero from './RulesHero';
import styles from './rules.module.css';

// One icon per documentation category — from the icon library already used across the portal
// (lucide-react), never emoji or a one-off SVG per category.
const CATEGORY_ICONS = {
  instruments: CandlestickChart,
  conditions: SlidersHorizontal,
  requirements: ShieldCheck,
  inactivity: Clock,
  funded: Wallet,
  payout: Banknote,
  restrictions: ShieldAlert,
  refund: RotateCcw,
  disclaimer: Info,
};

const SELECTED_ACCOUNT_KEY = 'fd-selected-account';

const TRACKS = [
  { id: PLAN_TYPES.ONE_STEP, label: 'One-Step' },
  { id: PLAN_TYPES.TWO_STEP, label: 'Two-Step' },
  { id: PLAN_TYPES.INSTANT, label: 'Instant' },
];

const PHASE_LABELS = { challenge: 'Evaluation', phase1: 'Phase 1', phase2: 'Phase 2', funded: 'Funded' };

// Program identity — one distinct accent/icon/motif per program so the three
// never read as one mixed rule library. Copy is sourced from the actual
// phase structure in lib/rules.js (getPlanPhases), never invented:
//   ONE_STEP  -> ['challenge', 'funded']        one evaluation stage
//   TWO_STEP  -> ['phase1', 'phase2', 'funded']  two evaluation stages
//   INSTANT   -> ['funded']                      no evaluation stage at all
const PROGRAM_META = {
  [PLAN_TYPES.ONE_STEP]: {
    label: 'One-Step',
    tag: 'Single evaluation',
    tagline: 'One evaluation. One clear path to funding.',
    Icon: ArrowRightCircle,
    motif: 'One-Step → Funded',
  },
  [PLAN_TYPES.TWO_STEP]: {
    label: 'Two-Step',
    tag: 'Two-phase evaluation',
    tagline: 'Two evaluation phases. Structured progression to a funded account.',
    Icon: Layers,
    motif: 'Phase 1 → Phase 2 → Funded',
  },
  [PLAN_TYPES.INSTANT]: {
    label: 'Instant',
    tag: 'Direct funded access',
    tagline: 'Skip evaluation. Start directly at the funded stage.',
    Icon: Zap,
    motif: 'Instant → Funded',
  },
};

// URL <-> internal state slugs, so /rules?program=two-step&phase=phase-1&category=payout is stable.
const PROGRAM_SLUG = { ONE_STEP: 'one-step', TWO_STEP: 'two-step', INSTANT: 'instant' };
const SLUG_PROGRAM = Object.fromEntries(Object.entries(PROGRAM_SLUG).map(([k, v]) => [v, k]));
const PHASE_SLUG = { challenge: 'evaluation', phase1: 'phase-1', phase2: 'phase-2', funded: 'funded' };
const SLUG_PHASE = Object.fromEntries(Object.entries(PHASE_SLUG).map(([k, v]) => [v, k]));
const CATEGORY_IDS = ['instruments', 'conditions', 'requirements', 'inactivity', 'funded', 'payout', 'restrictions', 'refund', 'disclaimer'];
// The URL always writes the short canonical ids above. Reading also accepts the longer,
// descriptive slugs (e.g. ?category=trading-instruments) as aliases, so either form deep-links
// correctly — no behavior change for links already using the canonical short form.
const CATEGORY_ALIASES = {
  'trading-instruments': 'instruments',
  'trading-conditions': 'conditions',
  'trading-rules-requirements': 'requirements',
  'trading-rules-and-requirements': 'requirements',
  'funded-account-rules': 'funded',
  'payout-rules': 'payout',
  'risk-drawdown': 'requirements',
};
function resolveCategoryParam(c) {
  if (!c) return null;
  if (CATEGORY_IDS.includes(c)) return c;
  return CATEGORY_ALIASES[c] || null;
}

const NS = 'Not specified';
const finN = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

function pctStr(v) { const n = finN(v); return n == null ? NS : `${Number.isInteger(n) ? n : n.toFixed(2)}%`; }
function daysStr(v) { const n = finN(v); return n == null ? NS : `${n} day${n === 1 ? '' : 's'}`; }
function secStr(v) { const n = finN(v); return n == null ? NS : `${n} second${n === 1 ? '' : 's'}`; }
function countStr(v) { const n = finN(v); return n == null ? NS : String(n); }
function boolStr(v, yes, no) { if (v === null || v === undefined) return NS; return v ? yes : no; }
function rupeesFromPct(pct, capital) {
  const p = finN(pct); const c = finN(capital);
  if (p == null || c == null || c <= 0) return null;
  return formatINR(Math.round((c * p) / 100));
}

// Only Two-Step exposes a phase level in the tree. One-Step and Instant resolve their phase
// automatically: Instant only ever has a funded stage; One-Step shows its own account's real
// phase when browsing your own account, and the evaluation phase otherwise (the phase a visitor
// evaluating the program actually needs to pass).
function defaultPhaseFor(programId, account) {
  if (programId === PLAN_TYPES.INSTANT) return 'funded';
  if (programId === PLAN_TYPES.ONE_STEP) {
    if (account && (account.plans?.plan_type || PLAN_TYPES.TWO_STEP) === PLAN_TYPES.ONE_STEP) return account.phase;
    return 'challenge';
  }
  return null; // TWO_STEP — caller supplies the selected phase explicitly
}

function rulesForView(programId, phaseKey, account) {
  const matches = account
    && (account.plans?.plan_type || PLAN_TYPES.TWO_STEP) === programId
    && account.phase === phaseKey;
  const planForRules = matches ? account.plans : { plan_type: programId };
  const rules = getRulesForAccount({ phase: phaseKey, status: phaseKey === 'funded' ? 'funded' : 'active' }, planForRules) || {};
  const fundedRules = getRulesForAccount({ phase: 'funded', status: 'funded' }, planForRules) || {};
  const capital = matches ? finN(account.plans?.capital) : null;
  return { rules, fundedRules, capital, isFundedView: phaseKey === 'funded' };
}

/* ---------------- rule content (single source used by both render + search) ---------------- */

function buildCategories({ rules, fundedRules, capital, isFundedView, trackLabel }) {
  const line = (label, value, sub) => ({ label, value, sub });
  const cat = (n, id, title, eyebrow, lede, items) => ({ n, id, title, eyebrow, lede, items });
  const item = (catN, i, title, lines, note, badge) => ({
    key: `${catN}.${i}`, num: `${catN}.${i}`, title, lines: (lines || []).filter(Boolean), note, badge,
  });

  const categories = [];

  categories.push(cat(1, 'instruments', 'Trading Instruments', 'Markets',
    'What can be traded, and when. Instrument coverage and exchange session are platform-wide facts — they do not vary by plan or phase.',
    [
      item(1, 1, 'Allowed Instruments', [
        line('Instruments', 'NIFTY · BANKNIFTY · FINNIFTY · SENSEX (index options)'),
        line('Order side', 'CE / PE · long or short'),
      ], 'Options only, across the four Indian indices the platform quotes live. Direction and instrument are unrestricted unless a restriction below applies.'),
      item(1, 2, 'Instrument Restrictions', [
        line('Position stacking limit', finN(rules.positionStackingLimit) == null ? NS : `${rules.positionStackingLimit} per instrument / direction`),
      ], rules.positionStackingLimit != null
        ? (rules.softBreachOnFourthTrade ? 'Exceeding the limit on one instrument/direction records a soft breach, not an instant failure.' : undefined)
        : undefined),
      item(1, 3, 'Trading Hours', [
        line('Session', '09:15–15:30 IST'),
        line('Days', 'Monday to Friday'),
      ], 'Fixed by the exchange session the live terminal uses — not a plan-specific rule, and it does not change with program or phase.'),
    ]));

  categories.push(cat(2, 'conditions', 'Trading Conditions', 'Mechanics',
    `How positions are opened, held and closed on a ${trackLabel} account.`,
    [
      item(2, 1, 'Order Mechanics', [line('Contract type', 'CE / PE, long or short, exchange lot sizes')]),
      item(2, 2, 'Minimum Hold Time', [
        line('Minimum duration', secStr(rules.minimumTradeDurationSeconds)),
      ], finN(rules.maxSoftViolationsForDuration) != null ? `Entry to exit must span at least this duration. Repeated breaches accumulate — up to ${rules.maxSoftViolationsForDuration} soft violations.` : 'Entry to exit must span at least this duration.'),
      item(2, 3, 'Stop-Loss Window', [
        line('Requirement', boolStr(rules.stopLossRequired, 'Required', 'Not required')),
        rules.stopLossRequired ? line('Window', secStr(rules.stopLossWindowSeconds)) : null,
      ], rules.stopLossRequired ? 'A stop-loss must be attached within this window after entry.' : undefined),
      item(2, 4, 'Drawdown Basis', [
        line('Basis', rules.dailyDrawdownIsTrailing || rules.maximumDrawdownIsTrailing
          ? 'Trailing (highest equity)'
          : (rules.dailyDrawdownPct != null || rules.maximumDrawdownPct != null ? 'From starting balance' : NS)),
      ], rules.dailyDrawdownIncludesUnrealized || rules.maximumDrawdownIncludesOpenAndClosed
        ? 'Drawdown includes unrealised P&L on open positions.' : undefined),
    ]));

  const reqItems = [];
  let ri = 0;
  if (!isFundedView) {
    ri += 1;
    reqItems.push(item(3, ri, 'Profit Target', [
      line('Target', pctStr(rules.profitTargetPct), rupeesFromPct(rules.profitTargetPct, capital) || undefined),
    ], 'Equity gain over the starting balance required to clear this stage.'));
    ri += 1;
    reqItems.push(item(3, ri, 'Minimum Profitable Days', [
      line('Days required', countStr(rules.profitableTradingDays)),
    ], finN(rules.profitableDayThresholdPct) != null
      ? `A day counts when net P&L is at least ${rules.profitableDayThresholdPct}% of the account balance.` : undefined));
  }
  ri += 1;
  reqItems.push(item(3, ri, 'Daily Drawdown', [
    line('Limit', pctStr(rules.dailyDrawdownPct), rupeesFromPct(rules.dailyDrawdownPct, capital) || undefined),
  ], rules.dailyDrawdownIsTrailing ? 'Trailing from the highest equity reached during the day.' : undefined));
  ri += 1;
  reqItems.push(item(3, ri, 'Maximum Drawdown', [
    line('Limit', pctStr(rules.maximumDrawdownPct), rupeesFromPct(rules.maximumDrawdownPct, capital) || undefined),
  ], rules.maximumDrawdownIsTrailing ? 'Trailing from the highest equity since the account was created.' : undefined));
  if (finN(rules.floatingLossLimitPct) != null) {
    ri += 1;
    reqItems.push(item(3, ri, 'Floating Loss Limit', [
      line('Limit', pctStr(rules.floatingLossLimitPct), rupeesFromPct(rules.floatingLossLimitPct, capital) || undefined),
    ], 'Maximum unrealised loss allowed on open positions at any moment.'));
  }
  ri += 1;
  reqItems.push(item(3, ri, 'Weekend Trading', [
    line('Weekend positions', boolStr(rules.weekendTrading, 'Allowed', 'Not allowed')),
  ], 'Holding or opening a position across a weekend.'));
  ri += 1;
  reqItems.push(item(3, ri, 'News-Event Trading', [
    line('Around Tier-1 events', rules.newsTrading === undefined ? NS : rules.newsTrading ? `Allowed, outside ±${finN(rules.newsTradingWindowMinutes) ?? '?'} min` : 'Not allowed'),
  ], 'Tier-1 scheduled economic events (e.g. RBI policy). Window is measured either side of the scheduled time.'));
  ri += 1;
  reqItems.push(item(3, ri, 'Maximum Time Limit', [
    line('Time limit', rules.maximumTimeLimit === undefined ? NS : rules.maximumTimeLimit ? 'Applies' : 'No time limit'),
  ], 'Whether the evaluation expires after a fixed period.'));
  categories.push(cat(3, 'requirements', 'Trading Rules & Requirements', 'Pass Criteria',
    `What clears this stage on a ${trackLabel} account, and the loss limits that apply while doing it.`, reqItems));

  categories.push(cat(4, 'inactivity', 'Inactivity', 'Account Activity',
    'How long an account can go without a trade before it is closed for inactivity.',
    [item(4, 1, 'Inactivity Limit', [line('Limit', daysStr(rules.inactivityDays))], 'Consecutive calendar days with zero trades before the account is closed for inactivity.')]));

  categories.push(cat(5, 'funded', 'Funded Account Rules', 'Funded Stage',
    `Terms that apply once a ${trackLabel} account is funded — shown here regardless of which phase is currently selected.`,
    [
      item(5, 1, 'Profit Split', [line('Split', fundedRules.profitSplitPct != null ? `Up to ${fundedRules.profitSplitPct}%` : NS)], 'The trader’s share of profit on a funded account.'),
      item(5, 2, 'Funded Risk Limits', [
        line('Daily drawdown', pctStr(fundedRules.dailyDrawdownPct), rupeesFromPct(fundedRules.dailyDrawdownPct, capital) || undefined),
        line('Maximum drawdown', pctStr(fundedRules.maximumDrawdownPct), rupeesFromPct(fundedRules.maximumDrawdownPct, capital) || undefined),
      ], fundedRules.dailyDrawdownIsTrailing || fundedRules.maximumDrawdownIsTrailing ? 'Trailing from the highest equity reached.' : undefined),
      item(5, 3, 'Funded Trading Mechanics', [
        line('Position stacking limit', finN(fundedRules.positionStackingLimit) == null ? NS : `${fundedRules.positionStackingLimit} trades`),
        line('Stop-loss requirement', boolStr(fundedRules.stopLossRequired, 'Required', 'Not required')),
        line('Inactivity limit', daysStr(fundedRules.inactivityDays)),
      ]),
    ]));

  categories.push(cat(6, 'payout', 'Payout Rules', 'Withdrawals',
    'Withdrawal terms for a funded account. Requests are reviewed and paid manually — there is no automated payout gateway.',
    [
      item(6, 1, 'Profit Split', [line('Split', fundedRules.profitSplitPct != null ? `Up to ${fundedRules.profitSplitPct}%` : NS)], 'Share of net profit paid to the trader.'),
      item(6, 2, 'Payout Cycle', [
        line('Cycle', daysStr(fundedRules.payoutCycleDays)),
        line('Profitable days required', countStr(fundedRules.payoutProfitableDays)),
      ]),
      item(6, 3, 'Withdrawal Limits', [
        line('Minimum withdrawal', fundedRules.minimumWithdrawalPct != null ? `${fundedRules.minimumWithdrawalPct}% of account size` : NS, rupeesFromPct(fundedRules.minimumWithdrawalPct, capital) || undefined),
        line('Cap per cycle', fundedRules.withdrawalCapPct != null ? `Up to ${fundedRules.withdrawalCapPct}% of account size` : NS, rupeesFromPct(fundedRules.withdrawalCapPct, capital) || undefined),
      ]),
    ]));

  const maxSoft = finN(rules.maxSoftBreachesBeforeClosure);
  const slSoft = finN(rules.maxSoftBreaches);
  const durSoft = finN(rules.maxSoftViolationsForDuration);
  categories.push(cat(7, 'restrictions', 'Restrictions', 'Enforcement',
    'Breaches fall into two kinds. A hard rule ends the account immediately when crossed. A soft breach is recorded and accumulates — the account is closed only once the configured count is reached.',
    [
      item(7, 1, 'Daily Drawdown', [line('Enforcement', rules.dailyDrawdownPct != null ? 'Hard' : NS, rules.dailyDrawdownPct != null ? pctStr(rules.dailyDrawdownPct) : undefined)], 'Account closed the moment the daily limit is hit.', rules.dailyDrawdownPct != null ? 'hard' : undefined),
      item(7, 2, 'Maximum Drawdown', [line('Enforcement', rules.maximumDrawdownPct != null ? 'Hard' : NS, rules.maximumDrawdownPct != null ? pctStr(rules.maximumDrawdownPct) : undefined)], 'Account closed the moment the overall limit is hit.', rules.maximumDrawdownPct != null ? 'hard' : undefined),
      item(7, 3, 'Position Stacking', [line('Enforcement', rules.positionStackingLimit != null ? 'Soft breach' : NS, maxSoft != null ? `closes at ${maxSoft} soft breaches` : undefined)], rules.positionStackingLimit != null ? `Exceeding ${rules.positionStackingLimit} trades on one instrument/direction records a soft breach.` : undefined, rules.positionStackingLimit != null ? 'soft' : undefined),
      item(7, 4, 'Missing Stop-Loss', [line('Enforcement', rules.stopLossRequired ? 'Soft breach' : (rules.stopLossRequired === false ? 'Not enforced' : NS), slSoft != null ? `closes at ${slSoft} soft breaches` : undefined)], undefined, rules.stopLossRequired ? 'soft' : undefined),
      item(7, 5, 'Minimum Trade Duration', [line('Enforcement', rules.minimumTradeDurationSeconds != null ? 'Soft violation' : NS, durSoft != null ? `closes at ${durSoft} soft violations` : undefined)], undefined, rules.minimumTradeDurationSeconds != null ? 'soft' : undefined),
      item(7, 6, 'News & Weekend Trading', [
        line('News-event trading', rules.newsTrading === undefined ? NS : rules.newsTrading ? 'Restricted window' : 'Not allowed', finN(rules.newsTradingWindowMinutes) != null ? `±${rules.newsTradingWindowMinutes} min` : undefined),
        line('Weekend trading', boolStr(rules.weekendTrading, 'Restricted', 'Not allowed')),
      ]),
    ]));

  categories.push(cat(8, 'refund', 'Refund', 'Policy', 'Whether an evaluation fee can be refunded.',
    [item(8, 1, 'Refund Policy', [], 'A structured refund policy is not published in the platform, so no refund terms are shown here. Current evaluation-fee terms are summarised in the FAQ. This section will show the policy once it is configured. Not specified.')]));

  categories.push(cat(9, 'disclaimer', 'Disclaimer', 'Risk Disclosure', 'The risk and simulated-capital disclosure every account is subject to.',
    [
      item(9, 1, 'Risk Disclosure', [], 'FundedDesk offers skill-based trader evaluations on simulated accounts using live market data; orders are not placed on any exchange, and funded-stage capital remains simulated. Trading involves risk and is not suitable for everyone. Past performance does not guarantee future results. Rewards, payouts, and account access are subject to this Rulebook and the program terms.'),
      item(9, 2, 'Regulatory Status', [], 'FundedDesk is not a broker, exchange, or investment adviser and makes no claim of regulatory registration or exchange affiliation. Nothing here is financial advice or a guarantee of profit or payout.'),
    ]));

  return categories;
}

/* ---------------- quick nav cards (only routes that actually exist) ---------------- */

const QUICK_LINKS = [
  { eyebrow: 'Documentation', title: 'Trading Rules', href: '#workspace', desc: 'Program rules, risk limits and restrictions — the documentation on this page.', Icon: BookOpen },
  { eyebrow: 'Support', title: 'Frequently Asked Questions', href: '/faq', desc: 'Common questions about evaluations, payouts and how funded accounts work.', Icon: HelpCircle },
  { eyebrow: 'Legal', title: 'Terms & Conditions', href: '/terms', desc: 'The platform terms that govern your evaluation and funded account.', Icon: FileText },
  { eyebrow: 'Compliance', title: 'Risk Disclosure', href: '/risk-disclosure', desc: 'The risk and simulated-capital disclosure every account is subject to.', Icon: ShieldAlert },
];

function QuickNavCards() {
  return (
    <section className={styles.quickNav}>
      <div className="wrap">
        <div className={styles.quickGrid}>
          {QUICK_LINKS.map((c) => (
            <Link key={c.title} href={c.href} className={styles.quickCard}>
              <span className={styles.quickIcon}><c.Icon size={28} strokeWidth={1.7} /></span>
              <span className={styles.quickEyebrow}>{c.eyebrow}</span>
              <h3 className={styles.quickTitle}>{c.title}</h3>
              <p className={styles.quickDesc}>{c.desc}</p>
              <span className={styles.quickArrow}>Explore <span aria-hidden="true">&rarr;</span></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- program selector: three distinct program "paths" ---------------- */

function ProgramSelector({ track, tracksWithPlan, onSelect }) {
  return (
    <section className={styles.programSelector} aria-label="Choose your trading program">
      <div className="wrap">
        <div className={styles.programSelectorHead}>
          <div className={styles.programSelectorEyebrow}>Trading Rules</div>
          <h2 className={styles.programSelectorTitle}>Choose Your Program</h2>
        </div>
        <div className={styles.programGrid} role="group" aria-label="Trading program">
          {TRACKS.map((t) => {
            const meta = PROGRAM_META[t.id];
            const active = track === t.id;
            const hasPlan = tracksWithPlan.has(t.id);
            return (
              <button
                key={t.id}
                type="button"
                data-program={t.id}
                className={`${styles.programCard} ${active ? styles.programCardActive : ''}`}
                aria-pressed={active}
                onClick={() => onSelect(t.id)}
              >
                {active && <span className={styles.programCardTag}>Current Program</span>}
                <span className={styles.programCardIcon}><meta.Icon size={30} strokeWidth={1.7} /></span>
                <h3 className={styles.programCardName}>{meta.label}</h3>
                {!hasPlan && <div className={styles.programCardRefTag}>Reference</div>}
                <p className={styles.programCardDesc}>{meta.tagline}</p>
                <span className={styles.programCardMotif}>{meta.motif}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- program journey: stage stepper, varies per program ---------------- */

function ProgramJourney({ track, effectivePhase, uiPhase, onSelectPhase }) {
  if (track === PLAN_TYPES.TWO_STEP) {
    const order = ['phase1', 'phase2', 'funded'];
    const currentIdx = Math.max(0, order.indexOf(uiPhase));
    return (
      <div className={styles.journey} aria-label="Two-Step phase progression">
        {order.map((key, i) => {
          const state = i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'upcoming';
          return (
            <div className={styles.journeyStepWrap} key={key}>
              <button
                type="button"
                className={`${styles.journeyStep} ${styles[`journeyStep_${state}`]}`}
                aria-current={state === 'current' ? 'step' : undefined}
                onClick={() => onSelectPhase(key)}
              >
                <span className={styles.journeyStepIcon} aria-hidden="true">{state === 'done' ? <Check size={13} strokeWidth={3} /> : i + 1}</span>
                <span>{PHASE_LABELS[key]}</span>
              </button>
              {i < order.length - 1 && <span className={styles.journeyConnector} aria-hidden="true" />}
            </div>
          );
        })}
      </div>
    );
  }

  if (track === PLAN_TYPES.ONE_STEP) {
    const atFunded = effectivePhase === 'funded';
    const nodes = [
      { label: 'Start', state: 'done' },
      { label: 'Evaluation', state: atFunded ? 'done' : 'current' },
      { label: 'Funded', state: atFunded ? 'current' : 'upcoming' },
    ];
    return (
      <div className={styles.journey} aria-label="One-Step evaluation path">
        {nodes.map((n, i) => (
          <div className={styles.journeyStepWrap} key={n.label}>
            <span className={`${styles.journeyStep} ${styles.journeyStepStatic} ${styles[`journeyStep_${n.state}`]}`}>
              <span className={styles.journeyStepIcon} aria-hidden="true">{n.state === 'done' ? <Check size={13} strokeWidth={3} /> : i + 1}</span>
              <span>{n.label}</span>
            </span>
            {i < nodes.length - 1 && <span className={styles.journeyConnector} aria-hidden="true" />}
          </div>
        ))}
      </div>
    );
  }

  // INSTANT — no evaluation stage, direct access only.
  return (
    <div className={styles.journey} aria-label="Instant direct funded access">
      <div className={styles.journeyStepWrap}>
        <span className={`${styles.journeyStep} ${styles.journeyStepStatic} ${styles.journeyStep_current}`}>
          <span className={styles.journeyStepIcon} aria-hidden="true"><Zap size={12} strokeWidth={2.6} /></span>
          <span>Instant</span>
        </span>
        <span className={styles.journeyConnector} aria-hidden="true" />
      </div>
      <div className={styles.journeyStepWrap}>
        <span className={`${styles.journeyStep} ${styles.journeyStepStatic} ${styles.journeyStep_upcoming}`}>
          <span className={styles.journeyStepIcon} aria-hidden="true">2</span>
          <span>Funded</span>
        </span>
      </div>
    </div>
  );
}

/* ---------------- program context header: "you are here", above the doc box ---------------- */

function ProgramContextHeader({ track, effectivePhase, uiPhase, onSelectPhase }) {
  const meta = PROGRAM_META[track];
  return (
    <div className={styles.programContext} data-program={track}>
      <div className={styles.programContextLeft}>
        <span className={styles.programContextIcon} aria-hidden="true"><meta.Icon size={30} strokeWidth={1.7} /></span>
        <div>
          <div className={styles.programContextTag}>{meta.tag}</div>
          <h1 className={styles.programContextName}>{meta.label}</h1>
          <p className={styles.programContextDesc}>{meta.tagline}</p>
        </div>
      </div>
      <ProgramJourney track={track} effectivePhase={effectivePhase} uiPhase={uiPhase} onSelectPhase={onSelectPhase} />
    </div>
  );
}

/* ---------------- mobile program/phase/category picker (replaces the tree on phones) ---------------- */

function MobilePicker({ track, uiPhase, categories, activeCategory, tracksWithPlan, onSelectProgram, onSelectPhase, onSelectCategory }) {
  return (
    <div className={styles.mobilePicker}>
      <label className={styles.mobilePickerField}>
        <span className={styles.mobilePickerLabel}>Current Program</span>
        <select
          className={styles.mobilePickerSelect}
          value={track}
          onChange={(e) => onSelectProgram(e.target.value)}
        >
          {TRACKS.map((t) => (
            <option key={t.id} value={t.id}>{t.label}{!tracksWithPlan.has(t.id) ? ' (Reference)' : ''}</option>
          ))}
        </select>
      </label>

      {track === PLAN_TYPES.TWO_STEP && (
        <label className={styles.mobilePickerField}>
          <span className={styles.mobilePickerLabel}>Current Phase</span>
          <select
            className={styles.mobilePickerSelect}
            value={uiPhase}
            onChange={(e) => onSelectPhase(e.target.value)}
          >
            <option value="phase1">Phase 1</option>
            <option value="phase2">Phase 2</option>
            <option value="funded">Funded</option>
          </select>
        </label>
      )}

      <label className={styles.mobilePickerField}>
        <span className={styles.mobilePickerLabel}>Category</span>
        <select
          className={styles.mobilePickerSelect}
          value={activeCategory}
          onChange={(e) => onSelectCategory(e.target.value)}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

/* ---------------- item accordion (detail pane content) ---------------- */

function CategoryItem({ id, num, title, lines, note, badge, open, onToggle }) {
  const hasBody = Boolean(note) || (lines && lines.length > 0);
  return (
    <div className={`${styles.itemAccordion} ${open ? styles.itemAccordionOpen : ''}`} id={id}>
      <button
        type="button" className={styles.accordionHeader} aria-expanded={open} aria-controls={`${id}-panel`} id={`${id}-header`}
        onClick={onToggle} disabled={!hasBody} style={!hasBody ? { cursor: 'default' } : undefined}
      >
        <span className={styles.accordionHeaderLeft}>
          {hasBody && (
            <span className={`${styles.accordionIcon} ${open ? styles.accordionIconOpen : ''}`} aria-hidden="true">
              <Plus size={18} strokeWidth={2.2} />
            </span>
          )}
          <span className={styles.accordionLabel}>{num} {title}</span>
          {badge === 'hard' && <span className={`${styles.badge} ${styles.badgeHard}`}>HARD</span>}
          {badge === 'soft' && <span className={`${styles.badge} ${styles.badgeSoft}`}>SOFT</span>}
        </span>
      </button>
      {hasBody && (
        <div className={`${styles.accordionPanel} ${open ? styles.accordionPanelOpen : ''}`} id={`${id}-panel`} role="region" aria-labelledby={`${id}-header`} style={open ? { maxHeight: 480 } : undefined}>
          {lines && lines.length > 0 && (
            <div className={styles.itemLines}>
              {lines.map((l, i) => {
                const ns = l.value === NS;
                return (
                  <div className={styles.itemLine} key={i}>
                    <span className={styles.itemLineLabel}>{l.label}</span>
                    <span className={styles.itemLineValueWrap}>
                      <span className={`${styles.itemLineValue} ${ns ? styles.itemLineValueNs : ''}`}>{l.value}</span>
                      {l.sub && !ns && <div className={styles.accordionSub}>{l.sub}</div>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {note && (
            <div className={styles.noteBox}>
              <div className={styles.noteBoxLabel}>Note</div>
              <p className={styles.noteBoxText}>{note}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CategoryPanel({ category, programLabel, phaseLabel, contextNote, openItems, onToggleItem, onExpandAll, onCollapseAll }) {
  const Icon = CATEGORY_ICONS[category.id];
  return (
    <section key={category.id} className={`${styles.section} ${styles.categoryFade}`} aria-labelledby={`${category.id}-h`}>
      {/* Sticky — stays pinned while the rule list scrolls beneath it, so the
          reader can never lose track of which program's rules they're reading. */}
      <div className={styles.contextBar}>
        <span className={styles.contextBarProgram}>{programLabel}</span>
        {phaseLabel && (
          <>
            <span className={styles.contextBarDot} aria-hidden="true">&middot;</span>
            <span className={styles.contextBarPhase}>{phaseLabel}</span>
          </>
        )}
        <span className={styles.contextBarDot} aria-hidden="true">&middot;</span>
        <span className={styles.contextBarCategory}>{category.title}</span>
        {contextNote && <span className={styles.contextBarNote}>({contextNote})</span>}
      </div>
      <div className={styles.panelHeaderRow}>
        <div className={styles.categoryTitleRow}>
          {Icon && <span className={styles.categoryIconBadge}><Icon size={26} strokeWidth={1.7} /></span>}
          <div className={styles.categoryPanelHead} style={{ marginBottom: 0 }}>
            <div className={styles.sectionEyebrow}>{category.eyebrow}</div>
            <h2 id={`${category.id}-h`} className={styles.sectionTitle}>{category.title}</h2>
            {category.lede && <p className={styles.sectionLede}>{category.lede}</p>}
          </div>
        </div>
      </div>
      <hr className={styles.panelDivider} />
      {category.items.length > 0 ? (
        <>
          <div className={styles.panelHeaderRow} style={{ marginBottom: 18, alignItems: 'center' }}>
            <span className={styles.ruleCount}>{category.items.length} rule{category.items.length === 1 ? '' : 's'}</span>
            <div className={styles.expandRow} style={{ padding: 0 }}>
              <button type="button" className={styles.expandBtn} onClick={onExpandAll}>Expand all</button>
              <button type="button" className={styles.expandBtn} onClick={onCollapseAll}>Collapse all</button>
            </div>
          </div>
          {category.id === 'restrictions' && (
            <div className={styles.badgeRow}>
              <span className={`${styles.badge} ${styles.badgeHard}`}>HARD — immediate closure</span>
              <span className={`${styles.badge} ${styles.badgeSoft}`}>SOFT — accumulates to a limit</span>
            </div>
          )}
          <div className={styles.accordion}>
            {category.items.map((it) => {
              const itemId = `${category.id}-item-${it.key.replace('.', '-')}`;
              return (
                <CategoryItem key={itemId} id={itemId} num={it.num} title={it.title} lines={it.lines} note={it.note} badge={it.badge}
                  open={openItems.has(itemId)} onToggle={() => onToggleItem(itemId)} />
              );
            })}
          </div>
        </>
      ) : (
        <p className={styles.plainText}>No rules are currently configured for this section.</p>
      )}
      {category.id === 'refund' && (
        <p className={styles.plainText} style={{ marginTop: 14 }}>
          See the <Link href="/faq" style={{ color: 'var(--brand)' }}>FAQ</Link> for current evaluation-fee terms.
        </p>
      )}
      {category.id === 'payout' && (
        <p className={styles.plainText} style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
          Payout requests are handled in the portal after you have a funded account.
        </p>
      )}
    </section>
  );
}

/* ---------------- support CTA ---------------- */

function SupportCTA({ loggedIn }) {
  return (
    <div className={styles.supportCta}>
      <h2 className={styles.supportTitle}>Need help understanding a rule?</h2>
      <p className={styles.supportSub}>Our support team can help clarify platform information — they cannot override a configured rule.</p>
      <div className={styles.supportBtns}>
        {loggedIn ? (
          <>
            <Link href="/portal/support" className="btn btn-primary btn-sm">Open a support request</Link>
            <Link href="/portal/suggest-feature" className="btn btn-secondary btn-sm">Suggest an improvement</Link>
          </>
        ) : (
          <>
            <Link href="/contact" className="btn btn-primary btn-sm">Contact us</Link>
            <Link href="/faq" className="btn btn-secondary btn-sm">Read the FAQ</Link>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- program tree (left nav) ---------------- */

function ChevronIcon({ open }) {
  return (
    <svg className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CategoryLeafList({ categories, active, onSelect }) {
  return (
    <div className={styles.categoryLeaves}>
      {categories.map((c) => {
        const on = active === c.id;
        const Icon = CATEGORY_ICONS[c.id];
        return (
          <button key={c.id} type="button" className={`${styles.categoryLeaf} ${on ? styles.categoryLeafActive : ''}`} aria-current={on ? 'true' : undefined} onClick={() => onSelect(c.id)}>
            {Icon && <span className={styles.leafIcon} aria-hidden="true"><Icon size={18} strokeWidth={1.8} /></span>}
            <span className={styles.leafTitle}>{c.title}</span>
            <span className={styles.categoryCount}>{c.items.length}</span>
          </button>
        );
      })}
    </div>
  );
}

function ProgramTree({ tracksWithPlan, expandedProgram, track, uiPhase, activeCategory, sidebarData, onSelectProgram, onSelectLeaf }) {
  return (
    <>
      {TRACKS.map((t) => {
        // Expanding a program now always means "make it the active program" — a program's
        // categories are visible if and only if it is the one currently being read, so the
        // other two are never showing a "mixed rules" tree at the same time.
        const isOpen = expandedProgram === t.id;
        const isActiveProgram = track === t.id;
        const hasPlan = tracksWithPlan.has(t.id);
        const data = isOpen ? sidebarData : null;
        return (
          <div className={styles.programGroup} key={t.id}>
            <button
              type="button"
              className={`${styles.programHeader} ${isOpen ? styles.programHeaderOpen : ''} ${isActiveProgram ? styles.programHeaderActive : ''}`}
              aria-expanded={isOpen}
              aria-current={isActiveProgram ? 'true' : undefined}
              onClick={() => onSelectProgram(t.id)}
            >
              <span className={styles.programHeaderLeft}>
                {isActiveProgram ? <span className={styles.programHeaderDot} aria-hidden="true" /> : <ChevronIcon open={isOpen} />}
                {t.label}
              </span>
              {!hasPlan && <span className={styles.refTag}>REFERENCE</span>}
            </button>

            {isOpen && data && data.hasPhases && (
              data.phases.map((ph) => (
                <div className={styles.phaseGroup} key={ph.key}>
                  <div className={styles.phaseGroupLabel}>
                    {ph.label}
                    {ph.isCurrentAccountPhase && <span className={styles.phaseTagCurrent}>CURRENT</span>}
                  </div>
                  <CategoryLeafList
                    categories={ph.categories}
                    active={isActiveProgram && uiPhase === ph.key ? activeCategory : null}
                    onSelect={(catId) => onSelectLeaf(t.id, ph.key, catId)}
                  />
                </div>
              ))
            )}
            {isOpen && data && !data.hasPhases && (
              <CategoryLeafList
                categories={data.categories}
                active={isActiveProgram ? activeCategory : null}
                onSelect={(catId) => onSelectLeaf(t.id, data.phaseKey, catId)}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

/* ================================================================== */

export default function RulesPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [activePlans, setActivePlans] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  // Soft failure only — the canonical rule documentation below never depends on Supabase (it
  // resolves from lib/rules.js against the selected program/phase), so a failed account/plan
  // fetch degrades to the public reference view rather than blocking the page.
  const [accountUnavailable, setAccountUnavailable] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  const [track, setTrack] = useState(PLAN_TYPES.ONE_STEP);
  const [uiPhase, setUiPhase] = useState('phase1'); // only meaningful while track === TWO_STEP
  const [expandedProgram, setExpandedProgram] = useState(PLAN_TYPES.ONE_STEP);
  const [activeCategory, setActiveCategory] = useState('instruments');
  const [openItems, setOpenItems] = useState(() => new Set());

  const urlHadParams = useRef(false);
  // Set right before a category switch that must land with one specific item pre-opened
  // (a search result); read once by the reset effect below, then cleared.
  const pendingOpenRef = useRef(null);
  // Set right before a deliberate, user-initiated navigation (sidebar click, search result) so
  // the URL-sync effect pushes a history entry instead of silently replacing the current one.
  const pendingPushRef = useRef(false);

  // ---- URL -> state: deep links AND browser Back/Forward ----
  // Runs on every searchParams change, not just on mount, so popstate navigation (Back/Forward)
  // actually updates what's on screen instead of only moving the address bar. Setting state to
  // its current value is a no-op in React, so this never fights with the state -> URL effect
  // below: after our own push/replace, the URL already matches state, so this is a harmless re-run.
  useEffect(() => {
    const p = searchParams.get('program');
    const ph = searchParams.get('phase');
    const c = searchParams.get('category');
    if (p && SLUG_PROGRAM[p]) {
      urlHadParams.current = true;
      const programId = SLUG_PROGRAM[p];
      setTrack(programId);
      setExpandedProgram(programId);
      if (programId === PLAN_TYPES.TWO_STEP && ph && SLUG_PHASE[ph]) setUiPhase(SLUG_PHASE[ph]);
    }
    const resolvedCategory = resolveCategoryParam(c);
    if (resolvedCategory) setActiveCategory(resolvedCategory);
  }, [searchParams]);

  // ---- data (self-fetched) ----
  useEffect(() => {
    let on = true;

    // Rules is public documentation and must render even when Supabase is
    // unreachable. Every supabase-js call - not just supabase.auth.getSession()
    // itself, but any supabase.from(...) query too, since the client's fetch
    // wrapper resolves the current session first to pick the auth header -
    // awaits GoTrue's internal session lock. That lock can stay held for up
    // to ~30s while it retries a stale/expired token against an unreachable
    // project. A fallback timer ends the loading state after a short window
    // so the public rule content always renders; if the real fetch resolves
    // afterwards, it upgrades the view with real account/plan data.
    const fallback = setTimeout(() => {
      if (!on) return;
      setAccountUnavailable(true);
      setLoading(false);
    }, 4000);

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const plansReq = supabase.from('plans').select('*').eq('active', true).order('capital', { ascending: true });

        if (session) {
          const [accRes, plansRes] = await Promise.all([
            supabase.from('accounts').select('*, plans(*)').eq('user_id', session.user.id).order('created_at', { ascending: false }),
            plansReq,
          ]);
          if (!on) return;
          clearTimeout(fallback);
          setLoggedIn(true);
          setAccountUnavailable(!!(accRes.error || plansRes.error));
          const accs = accRes.data || [];
          setAccounts(accs);
          setActivePlans(plansRes.data || []);
          if (!urlHadParams.current) {
            let stored = null;
            try { stored = localStorage.getItem(SELECTED_ACCOUNT_KEY); } catch (e) { /* storage unavailable */ }
            const chosen = accs.find((a) => a.id === stored) || accs[0] || null;
            setSelectedAccountId(chosen?.id || null);
          }
        } else {
          const plansRes = await plansReq;
          if (!on) return;
          clearTimeout(fallback);
          setAccountUnavailable(!!plansRes.error);
          setActivePlans(plansRes.data || []);
        }
        setLoading(false);
      } catch (err) {
        if (!on) return;
        clearTimeout(fallback);
        console.error('Rules: account context failed to load; showing public rule documentation only.', err);
        setAccountUnavailable(true);
        setLoading(false);
      }
    })();
    return () => { on = false; clearTimeout(fallback); };
  }, [retryToken]);

  function retryAccountLoad() {
    setAccountUnavailable(false);
    setRetryToken((n) => n + 1);
  }

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) || null,
    [accounts, selectedAccountId],
  );

  // Default the workspace to the selected account's own program/phase, unless the URL already
  // asked for a specific view.
  useEffect(() => {
    if (!selectedAccount || urlHadParams.current) return;
    const pt = selectedAccount.plans?.plan_type || PLAN_TYPES.TWO_STEP;
    setTrack(pt);
    setExpandedProgram(pt);
    if (pt === PLAN_TYPES.TWO_STEP) {
      const ph = selectedAccount.phase;
      setUiPhase(ph === 'funded' || ph === 'phase1' || ph === 'phase2' ? ph : 'phase1');
    }
  }, [selectedAccount]);

  const tracksWithPlan = useMemo(
    () => new Set(activePlans.map((p) => p.plan_type || PLAN_TYPES.TWO_STEP)),
    [activePlans],
  );

  // Only Two-Step carries a user-selectable phase in the URL.
  const effectivePhase = track === PLAN_TYPES.TWO_STEP ? uiPhase : defaultPhaseFor(track, selectedAccount);

  // ---- keep the URL in sync (shallow, no scroll jump) ----
  // Deliberate navigation (clicking a category, picking a search result) pushes a real history
  // entry so Back/Forward step through the categories a visitor actually chose to view.
  // Passive/automatic syncs (initial load, account-based defaulting, invalid-value normalization)
  // replace instead, so they never appear in browser history as something to "undo".
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('program', PROGRAM_SLUG[track]);
    if (track === PLAN_TYPES.TWO_STEP) params.set('phase', PHASE_SLUG[uiPhase] || 'phase-1');
    else params.delete('phase');
    params.set('category', activeCategory);
    const next = `${pathname}?${params.toString()}`;
    if (`${pathname}?${searchParams.toString()}` !== next) {
      if (pendingPushRef.current) {
        pendingPushRef.current = false;
        router.push(next, { scroll: false });
      } else {
        router.replace(next, { scroll: false });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track, uiPhase, activeCategory, loading]);

  const trackLabel = getPlanTypeLabel(track);
  const currentView = useMemo(
    () => rulesForView(track, effectivePhase, selectedAccount),
    [track, effectivePhase, selectedAccount],
  );
  const categories = useMemo(
    () => buildCategories({ ...currentView, trackLabel }),
    [currentView, trackLabel],
  );

  useEffect(() => {
    // Never leave category in an invalid state — the set is static, but guard anyway.
    if (!categories.some((c) => c.id === activeCategory)) setActiveCategory(categories[0]?.id || 'instruments');
  }, [categories, activeCategory]);

  // Accordion state belongs to whichever category is on screen — switching categories (by any
  // path: sidebar click, program/phase switch, or search) never leaves a stale item "open" from
  // a category that's no longer rendered. A search result can ask for one specific item to land
  // pre-opened via pendingOpenRef; everything else starts collapsed.
  useEffect(() => {
    setOpenItems(pendingOpenRef.current ? new Set([pendingOpenRef.current]) : new Set());
    pendingOpenRef.current = null;
  }, [activeCategory]);

  const currentCategory = categories.find((c) => c.id === activeCategory) || categories[0];

  // ---- sidebar tree data: computed ONLY for the expanded program (never all three) ----
  const sidebarData = useMemo(() => {
    if (!expandedProgram) return null;
    if (expandedProgram === PLAN_TYPES.TWO_STEP) {
      const phases = getPlanPhases(PLAN_TYPES.TWO_STEP).map((phaseKey) => ({
        key: phaseKey,
        label: PHASE_LABELS[phaseKey],
        isCurrentAccountPhase: Boolean(selectedAccount && (selectedAccount.plans?.plan_type || PLAN_TYPES.TWO_STEP) === PLAN_TYPES.TWO_STEP && selectedAccount.phase === phaseKey),
        categories: buildCategories({ ...rulesForView(PLAN_TYPES.TWO_STEP, phaseKey, selectedAccount), trackLabel: getPlanTypeLabel(PLAN_TYPES.TWO_STEP) }),
      }));
      return { hasPhases: true, phases };
    }
    const phaseKey = defaultPhaseFor(expandedProgram, selectedAccount);
    return {
      hasPhases: false,
      phaseKey,
      categories: buildCategories({ ...rulesForView(expandedProgram, phaseKey, selectedAccount), trackLabel: getPlanTypeLabel(expandedProgram) }),
    };
  }, [expandedProgram, selectedAccount]);

  // ---- search index across every program/phase leaf actually reachable in the tree ----
  const searchIndex = useMemo(() => {
    const items = [];
    const combos = [
      { programId: PLAN_TYPES.ONE_STEP, phaseKey: 'challenge', phaseLabel: null },
      { programId: PLAN_TYPES.TWO_STEP, phaseKey: 'phase1', phaseLabel: PHASE_LABELS.phase1 },
      { programId: PLAN_TYPES.TWO_STEP, phaseKey: 'phase2', phaseLabel: PHASE_LABELS.phase2 },
      { programId: PLAN_TYPES.TWO_STEP, phaseKey: 'funded', phaseLabel: PHASE_LABELS.funded },
      { programId: PLAN_TYPES.INSTANT, phaseKey: 'funded', phaseLabel: null },
    ];
    combos.forEach(({ programId, phaseKey, phaseLabel }) => {
      const cats = buildCategories({ ...rulesForView(programId, phaseKey, null), trackLabel: getPlanTypeLabel(programId) });
      cats.forEach((c) => {
        c.items.forEach((it) => {
          const lineText = (it.lines || []).map((l) => `${l.label} ${l.value}`).join(' ');
          items.push({
            programId, phaseKey, sectionId: c.id, sectionLabel: c.title,
            programLabel: getPlanTypeLabel(programId), phaseLabel,
            label: `${it.num} ${it.title}`, note: it.note,
            rowId: `${c.id}-item-${it.key.replace('.', '-')}`, hasPanel: Boolean(it.note) || (it.lines || []).length > 0,
            haystack: [c.title, it.title, lineText, it.note].filter(Boolean).join(' ').toLowerCase(),
          });
        });
      });
    });
    return items;
  }, []);

  function chooseAccount(id) {
    setSelectedAccountId(id);
    urlHadParams.current = false;
    try { if (id) localStorage.setItem(SELECTED_ACCOUNT_KEY, id); } catch (e) { /* storage unavailable */ }
  }

  // Selecting a program always makes it the active one — the sidebar tree, the program
  // selector cards, and the mobile picker all funnel through this, so "which program's
  // categories are showing" and "which program is active" can never disagree. The category
  // itself is left alone here; the "categories must be valid for this program" effect above
  // corrects it automatically (keeps it if the new program has a matching category, else
  // falls back to that program's first one) — never fabricated, always a real category.
  function selectProgram(programId) {
    if (programId === track) return;
    pendingPushRef.current = true;
    setTrack(programId);
    setExpandedProgram(programId);
    urlHadParams.current = false;
  }

  function selectPhase(phaseKey) {
    if (track !== PLAN_TYPES.TWO_STEP || phaseKey === uiPhase) return;
    pendingPushRef.current = true;
    setUiPhase(phaseKey);
    urlHadParams.current = false;
  }

  function selectCategory(categoryId) {
    if (categoryId === activeCategory) return;
    pendingPushRef.current = true;
    setActiveCategory(categoryId);
    urlHadParams.current = false;
  }

  function selectLeaf(programId, phaseKey, categoryId) {
    pendingPushRef.current = true;
    setTrack(programId);
    if (programId === PLAN_TYPES.TWO_STEP) setUiPhase(phaseKey);
    setActiveCategory(categoryId);
    setExpandedProgram(programId);
    urlHadParams.current = false;
  }

  function toggleItem(itemId) {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId); else next.add(itemId);
      return next;
    });
  }
  function expandAll() {
    if (!currentCategory) return;
    setOpenItems((prev) => {
      const next = new Set(prev);
      currentCategory.items.forEach((it) => {
        const id = `${currentCategory.id}-item-${it.key.replace('.', '-')}`;
        if (it.note || (it.lines || []).length > 0) next.add(id);
      });
      return next;
    });
  }
  function collapseAll() {
    if (!currentCategory) return;
    setOpenItems((prev) => {
      const next = new Set(prev);
      currentCategory.items.forEach((it) => next.delete(`${currentCategory.id}-item-${it.key.replace('.', '-')}`));
      return next;
    });
  }

  const handleSearchSelect = useCallback((item) => {
    const stayingInSameCategory = item.programId === track
      && (item.programId !== PLAN_TYPES.TWO_STEP || item.phaseKey === uiPhase)
      && item.sectionId === activeCategory;

    if (stayingInSameCategory) {
      // activeCategory won't change, so the category-switch reset effect never fires here —
      // just add this item to whatever's already open in the category being viewed.
      if (item.hasPanel) setOpenItems((prev) => new Set(prev).add(item.rowId));
    } else {
      pendingOpenRef.current = item.hasPanel ? item.rowId : null;
      pendingPushRef.current = true;
      setTrack(item.programId);
      if (item.programId === PLAN_TYPES.TWO_STEP) setUiPhase(item.phaseKey);
      setExpandedProgram(item.programId);
      setActiveCategory(item.sectionId);
      urlHadParams.current = false;
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById(item.rowId)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
    });
  }, [track, uiPhase, activeCategory]);

  if (loading) {
    return (
      <main className={styles.page} aria-busy="true" aria-label="Loading the knowledge base">
        <div className={styles.skeletonWrap}>
          <div className="wrap">
            <div className={`${styles.skeletonHeroBar} ${styles.shimmer}`} />
            <div className={`${styles.skeletonHeroTitle} ${styles.shimmer}`} />
            <div className={`${styles.skeletonSearch} ${styles.shimmer}`} />
            <div className={styles.skeletonGrid}>
              {[0, 1, 2, 3].map((i) => <div key={i} className={`${styles.skeletonCard} ${styles.shimmer}`} />)}
            </div>
            <div className={styles.skeletonBoxRow}>
              <div className={`${styles.skeletonNav} ${styles.shimmer}`} />
              <div className={styles.skeletonContent}>
                <div className={`${styles.skeletonLine} ${styles.skeletonLineShort} ${styles.shimmer}`} />
                <div className={`${styles.skeletonLine} ${styles.shimmer}`} style={{ height: 28, width: '60%' }} />
                <div className={`${styles.skeletonLine} ${styles.shimmer}`} />
                <div className={`${styles.skeletonCard} ${styles.shimmer}`} style={{ height: 56, marginTop: 16 }} />
                <div className={`${styles.skeletonCard} ${styles.shimmer}`} style={{ height: 56 }} />
                <div className={`${styles.skeletonCard} ${styles.shimmer}`} style={{ height: 56 }} />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const accountMatchesView = selectedAccount
    && (selectedAccount.plans?.plan_type || PLAN_TYPES.TWO_STEP) === track
    && selectedAccount.phase === effectivePhase;

  const phaseLabel = track === PLAN_TYPES.TWO_STEP ? PHASE_LABELS[uiPhase] : null;

  return (
    <main className={styles.page} data-program={track}>
      <RulesHero searchIndex={searchIndex} onSelect={handleSearchSelect} />
      <QuickNavCards />
      <ProgramSelector track={track} tracksWithPlan={tracksWithPlan} onSelect={selectProgram} />

      <section id="workspace" className={styles.workspaceSection}>
        <div className={styles.workspaceAmbient} aria-hidden="true" />
        <div className="wrap">
          {loggedIn && (
            <Link href="/portal" style={{ fontSize: 13, color: 'var(--muted)', display: 'inline-block', marginBottom: 16 }}>&larr; Back to portal</Link>
          )}

          {(loggedIn && accounts.length > 0) || accountUnavailable ? (
            <div className={styles.workspaceHeader}>
              {loggedIn && accounts.length > 0 && (
                <div className={styles.accountContextLine}>
                  <span className={styles.accountContextDot} aria-hidden="true" />
                  <span>Viewing your account</span>
                  <select className={styles.accountContextSelect} value={selectedAccountId || ''} onChange={(e) => chooseAccount(e.target.value)} aria-label="Account to view rules for">
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.login_id} · {getPlanTypeLabel(a.plans?.plan_type)} · {getPhaseDisplayLabel(a.plans?.plan_type, a.phase)}</option>
                    ))}
                  </select>
                </div>
              )}
              {accountUnavailable && (
                <div className={styles.accountNotice}>
                  Account details are temporarily unavailable — showing public program documentation.{' '}
                  <button type="button" onClick={retryAccountLoad} style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', font: 'inherit', padding: 0, marginLeft: 4 }}>Retry</button>
                </div>
              )}
            </div>
          ) : null}

          <ProgramContextHeader track={track} effectivePhase={effectivePhase} uiPhase={uiPhase} onSelectPhase={selectPhase} />

          <div className={styles.docBox}>
            <aside className={styles.navPane} aria-label="Program and rule navigation">
              <div className={styles.navPaneTitle}>Trading Rules</div>
              <div className={styles.navPaneSubLabel}>Programs</div>
              <ProgramTree
                tracksWithPlan={tracksWithPlan}
                expandedProgram={expandedProgram}
                track={track}
                uiPhase={uiPhase}
                activeCategory={activeCategory}
                sidebarData={sidebarData}
                onSelectProgram={selectProgram}
                onSelectLeaf={selectLeaf}
              />
            </aside>

            <MobilePicker
              track={track}
              uiPhase={uiPhase}
              categories={categories}
              activeCategory={activeCategory}
              tracksWithPlan={tracksWithPlan}
              onSelectProgram={selectProgram}
              onSelectPhase={selectPhase}
              onSelectCategory={selectCategory}
            />

            <div className={styles.contentPane}>
              {currentCategory && (
                <CategoryPanel
                  category={currentCategory}
                  programLabel={trackLabel}
                  phaseLabel={phaseLabel}
                  contextNote={accountMatchesView ? 'your account' : null}
                  openItems={openItems}
                  onToggleItem={toggleItem}
                  onExpandAll={expandAll}
                  onCollapseAll={collapseAll}
                />
              )}
            </div>
          </div>

          <div className={styles.content} style={{ marginTop: 20 }}>
            <SupportCTA loggedIn={loggedIn} />
          </div>
        </div>
      </section>
    </main>
  );
}
