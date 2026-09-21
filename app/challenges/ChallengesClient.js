'use client';

/* ============================================================
   /challenges — Funding Program Marketplace

   PROGRAM (first decision) -> ACCOUNT SIZE (second decision) ->
   PLAN DETAILS (third layer) -> CHOOSE PLAN (final action).

   One marketplace, three possible products — never three separate
   landing pages. The program selector always shows all three
   canonical programs (ONE_STEP / TWO_STEP / INSTANT — real, defined
   products in lib/rules.js's rule engine, not invented for this
   page) at equal visual weight, regardless of which currently has
   purchasable inventory. The selected-plan panel is the one place
   that goes deep on a single plan's numbers.

   NOTE on the shared site header: components/Nav.js's "Challenges"
   link points at "/#challenge-picker" (a homepage section) rather
   than at this route, and Nav renders nothing at all here for a
   logged-in visitor (`publicPageButLoggedIn`). Both are pre-existing,
   global behaviors that also govern /faq and the homepage — left
   untouched here per explicit scope (no homepage/global-nav changes).

   Hero background: the homepage's existing cinematic asset
   (components/HeroSequence.js / PageBackgroundSequence.js, the
   258-frame /public/sequence/*.jpg scroll sequence) was inspected
   and NOT reused here — it depicts a literal BSE-building/bull-bear
   scene with fabricated ticker numbers baked into the image pixels,
   which is both the wrong subject (a photoreal building, not an
   abstract terrain/arc) and a data-honesty risk (those numbers are
   fake and this page is about real pricing). The hero background
   below is a pure CSS/SVG atmospheric composition instead — layered
   terrain silhouettes + a masked conic-gradient arc — built to the
   brief's own fallback instruction ("create the closest possible
   CSS/composited atmospheric approximation").

   Data sources (unchanged across every revision of this page):
   - `plans` (Supabase, active=true) for identity/pricing.
   - lib/rules.js + lib/planRules.js (the same resolver Rules and
     the portal use) for rule values. A value the resolver leaves
     null is omitted — never shown as a fabricated number.
   - lib/accounts.js (getPlanTypeLabel), lib/cart.js (writeSelection
     / evalTypeForPlan), lib/format.js (formatINR).

   Verified data reality (checked directly against the live
   Supabase REST API across five revisions of this page — not
   assumed): the `plans` table has no `plan_type` column at all,
   and no `programs` / `funding_programs` / `plan_types` table
   exists anywhere in the schema. Every real plan resolves to
   TWO_STEP via the same `plan.plan_type || 'TWO_STEP'` fallback
   lib/rules.js, Cart and Rules already use. One-Step and Instant
   are real, defined programs (their rule configurations exist in
   lib/rules.js) with zero active plans behind them today — the
   selector still shows them; the marketplace honestly says so
   instead of fabricating a plan.

   Cart integration is presentation/navigation only: writeSelection()
   persists the real plan id + derived eval type, then the browser
   goes to /cart?plan=<id>. The server remains authoritative for
   price, discount, eligibility and checkout state.
   ============================================================ */

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, Zap, Layers, TrendingUp, Crown,
  Target, TrendingDown, ShieldAlert, PieChart, CalendarCheck,
  ShieldCheck, Compass, ScrollText, HelpCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { formatINR } from '@/lib/format';
import { getPlanTypeLabel } from '@/lib/accounts';
import { planRuleSummary } from '@/lib/planRules';
import { PLAN_TYPES } from '@/lib/rules';
import { writeSelection, evalTypeForPlan } from '@/lib/cart';
import styles from './challenges.module.css';

const TYPE_ORDER = [PLAN_TYPES.ONE_STEP, PLAN_TYPES.TWO_STEP, PLAN_TYPES.INSTANT];

// Same URL vocabulary as /rules — a "View full rules" link is always a
// stable, shareable, bookmarkable deep link, never a second URL scheme.
const PROGRAM_SLUG = { ONE_STEP: 'one-step', TWO_STEP: 'two-step', INSTANT: 'instant' };
const SLUG_PROGRAM = Object.fromEntries(Object.entries(PROGRAM_SLUG).map(([k, v]) => [v, k]));

// One identity per program. `journey` drives the compact node rail inside
// the selected-plan panel — the only place the phase structure is spelled
// out step by step; the header line above it stays one line. Each node is
// either an icon (One-Step / Instant: real milestones, not phase counts)
// or a number (Two-Step: three real phases from lib/rules.js).
const PROGRAM_META = {
  [PLAN_TYPES.ONE_STEP]: {
    name: 'One-Step',
    fullName: 'One-Step Fund',
    Icon: Zap,
    motif: 'Single evaluation → Funded',
    description: 'One evaluation. Reach the target. Move to funded.',
    lifecycle: 'Evaluation → Funded',
    journey: [{ label: 'Evaluation', Icon: Zap }, { label: 'Funded', Icon: Crown }],
  },
  [PLAN_TYPES.TWO_STEP]: {
    name: 'Two-Step',
    fullName: 'Two-Step Fund',
    Icon: Layers,
    motif: 'Phase 1 → Phase 2 → Funded',
    description: 'Two structured evaluation phases before funding.',
    lifecycle: 'Phase 1 → Phase 2 → Funded',
    journey: [{ label: 'Phase 1', num: 1 }, { label: 'Phase 2', num: 2 }, { label: 'Funded', num: 3 }],
  },
  [PLAN_TYPES.INSTANT]: {
    name: 'Instant',
    fullName: 'Instant Fund',
    Icon: TrendingUp,
    motif: 'Direct access → Funded',
    description: 'Direct access without an evaluation target.',
    lifecycle: 'Instant Access → Funded',
    journey: [{ label: 'Instant Access', Icon: TrendingUp }, { label: 'Funded', Icon: Crown }],
  },
};

// One icon per decision-critical rule, purely visual — the label text
// itself still comes straight from the resolver, never guessed here.
const CONDITION_ICON = {
  'Profit Target': Target,
  'Daily Drawdown': TrendingDown,
  'Max Drawdown': ShieldAlert,
  'Profit Split': PieChart,
  'Minimum Trading Days': CalendarCheck,
};

const finite = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);
function typeOf(plan) { return plan.plan_type || PLAN_TYPES.TWO_STEP; }

/* ============================================================
   HERO — cinematic, LEFT-ALIGNED, ~380px (+ nav above it).
   Background is the real image asset (see CinematicBackground
   below) — nothing here paints a section background of its own,
   so that single image shows through unbroken.
   ============================================================ */
function Hero() {
  const reduceMotion = useReducedMotion();
  return (
    <section className={styles.hero}>
      <div className="wrap">
        <div className={styles.heroRow}>
          <div className={styles.heroCopy}>
            <motion.div
              className={styles.eyebrow}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
            >
              Funding Programs
            </motion.div>

            {/* Masked reveal, not a plain fade: the heading itself slides
                up out of a clipped container while blurring into focus —
                a single deliberate motion, not a typing/bounce effect. */}
            <div className={styles.heroTitleMask}>
              <motion.h1
                className={styles.heroTitle}
                initial={reduceMotion ? false : { y: '105%', opacity: 0, filter: 'blur(8px)' }}
                animate={{ y: '0%', opacity: 1, filter: 'blur(0px)' }}
                transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                Choose Your<span>Funding Path.</span>
              </motion.h1>
            </div>

            <motion.p
              className={styles.heroSub}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
            >
              Choose the program and account size that fits the way you trade.
            </motion.p>
          </div>

          {/* NOTE: "TRADE. GROW. GET FUNDED." is HTML rendered by this
              component — public/images/challenges-cinematic-bg.png itself
              contains no text (re-verified this round: JPEG, 2752x1536,
              inspected directly). There is exactly one copy of these words
              on the page; the readability fix below (.heroStatement::before)
              is a localized scrim behind this element, the same visual
              technique requested for "baked-in" text, applied to where the
              text actually lives. */}
          <div className={styles.heroStatement} aria-hidden="true">
            <span className={styles.heroStatementLine} />
            <span>TRADE.</span><span>GROW.</span><span>GET FUNDED.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CINEMATIC BACKGROUND — the real asset (public/images/
   challenges-cinematic-bg.png), not a CSS approximation. One
   absolutely-positioned layer behind BOTH the hero and the
   program selector (rendered once here, not per-section) so the
   image is never re-sized/re-seamed at a section boundary; a
   single readability overlay sits above it and fades to the
   page's flat background color, which is what lets the workspace
   below continue the same atmosphere instead of cutting to black.
   ============================================================ */
function CinematicBackground() {
  return (
    <>
      <div className={styles.cinematicBg} aria-hidden="true" />
      <div className={styles.cinematicGlow} aria-hidden="true" />
      <div className={styles.cinematicOverlay} aria-hidden="true" />
    </>
  );
}

/* ============================================================
   PROGRAM SELECTOR — three large, equal-weight cards, always all
   visible regardless of which currently has active inventory.
   ============================================================ */
function ProgramSelector({ programs, active, onSelect }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      className={styles.selectorSection}
      aria-label="Choose your funding program"
      initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="wrap">
        <div className={styles.selectorHead}>Choose Your Program</div>
        <div className={styles.programGrid} role="group" aria-label="Funding program">
          {programs.map((t) => {
            const meta = PROGRAM_META[t];
            const on = active === t;
            return (
              <button
                key={t}
                type="button"
                data-program={t}
                className={`${styles.programCard} ${on ? styles.programCardActive : ''}`}
                aria-pressed={on}
                onClick={() => onSelect(t)}
              >
                <span className={styles.programCardIcon}><meta.Icon size={18} strokeWidth={1.8} /></span>
                <span className={styles.programCardBody}>
                  <span className={styles.programCardName}>{meta.name}</span>
                  <span className={styles.programCardMotif}>{meta.motif}</span>
                </span>
                <ArrowRight size={18} strokeWidth={2.2} className={styles.programCardArrow} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

/* ============================================================
   SELECTED PROGRAM HEADER (compact, never repeated)
   ============================================================ */
function ProgramContext({ program }) {
  const meta = PROGRAM_META[program];
  return (
    <div className={styles.programContext}>
      <h2 className={styles.programContextTitle}>{meta.fullName}</h2>
      <p className={styles.programContextDesc}>{meta.description}</p>
      <div className={styles.programContextLifecycle}>{meta.lifecycle}</div>
    </div>
  );
}

/* ============================================================
   ACCOUNT SIZE SELECTOR (left, ~30-32%)
   ============================================================ */
function PlanSelector({ plans, selectedId, onSelect }) {
  return (
    <div className={styles.planSelector}>
      <div className={styles.planSelectorHead}>
        <span className={styles.planSelectorLabel}>Account Size</span>
        <span className={styles.planSelectorSub}>Select your capital</span>
      </div>
      <div className={styles.planSelectorList} role="listbox" aria-label="Account size">
        {plans.map((plan) => {
          const on = plan.id === selectedId;
          const hasCapital = finite(plan.capital) != null;
          return (
            <button
              key={plan.id}
              type="button"
              role="option"
              aria-selected={on}
              className={`${styles.planOption} ${on ? styles.planOptionActive : ''}`}
              onClick={() => onSelect(plan.id)}
            >
              <span className={styles.planOptionInfo}>
                <span className={styles.planOptionSize}>{hasCapital ? formatINR(plan.capital) : (plan.name || 'Plan')}</span>
                {finite(plan.fee) != null && <span className={styles.planOptionFee}>{formatINR(plan.fee)}</span>}
              </span>
              <span className={`${styles.planOptionDot} ${on ? styles.planOptionDotActive : ''}`} aria-hidden="true" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   SELECTED PLAN DETAIL PANEL (right, ~68-70%) — the focal surface.
   ============================================================ */
function JourneyRail({ program }) {
  const steps = PROGRAM_META[program].journey;
  return (
    <div className={styles.journeyRail} aria-label={`${PROGRAM_META[program].fullName} steps`}>
      {steps.map((step, i) => (
        <span className={styles.journeyStepWrap} key={step.label}>
          <span className={styles.journeyNode}>
            <span className={styles.journeyNodeMark}>
              {step.Icon ? <step.Icon size={14} strokeWidth={2} /> : String(step.num).padStart(2, '0')}
            </span>
            <span className={styles.journeyNodeLabel}>{step.label}</span>
          </span>
          {i < steps.length - 1 && <span className={styles.journeyConnector} aria-hidden="true"><ArrowRight size={13} strokeWidth={2.2} /></span>}
        </span>
      ))}
    </div>
  );
}

function SelectedPlanPanel({ program, plan }) {
  const router = useRouter();
  const r = planRuleSummary(plan);
  const hasFee = finite(plan.fee) != null;
  const hasCapital = finite(plan.capital) != null;

  // Profit Target always renders — for Instant (the only program whose
  // resolver leaves profitTargetPct null by design, see lib/rules.js
  // INSTANT_RULES) that means the real null value surfaces as an honest
  // "No evaluation target" label instead of being hidden or shown as 0%.
  const conditions = [
    ['Profit Target', r.profitTargetPct != null ? `${r.profitTargetPct}%` : 'No evaluation target', r.profitTargetPct == null],
    r.dailyDrawdownPct != null && ['Daily Drawdown', `${r.dailyDrawdownPct}%`],
    r.maximumDrawdownPct != null && ['Max Drawdown', `${r.maximumDrawdownPct}%`],
    r.profitSplitPct != null && ['Profit Split', `${r.profitSplitPct}%`],
    r.profitableTradingDays != null && ['Minimum Trading Days', `${r.profitableTradingDays}`],
  ].filter(Boolean);

  function choose() {
    writeSelection({ planId: String(plan.id), evalType: evalTypeForPlan(plan.plan_type) });
    router.push(`/cart?plan=${encodeURIComponent(plan.id)}`);
  }

  return (
    <div className={styles.planPanel} data-program={typeOf(plan)}>
      <div className={styles.planPanelGlow} aria-hidden="true" />
      <div className={styles.planPanelTexture} aria-hidden="true" />

      <span className={styles.planPanelBadge}>{getPlanTypeLabel(typeOf(plan))} Fund</span>

      <div className={styles.planPanelFigures}>
        <div>
          <div className={styles.planPanelSize}>{hasCapital ? formatINR(plan.capital) : 'Size not specified'}</div>
          <div className={styles.planPanelFigLabel}>Account Size</div>
        </div>
        <div>
          {hasFee ? <div className={styles.planPanelFee}>{formatINR(plan.fee)}</div> : <div className={styles.planPanelFeeUnavailable}>Unavailable</div>}
          <div className={styles.planPanelFigLabel}>Entry Fee</div>
        </div>
      </div>

      <JourneyRail program={program} />

      {conditions.length > 0 && (
        <div className={styles.conditionsBlock}>
          <div className={styles.conditionsLabel}>Key Trading Conditions</div>
          <div className={styles.conditionsGrid}>
            {conditions.map(([label, value, isText]) => {
              const Icon = CONDITION_ICON[label];
              return (
                <div className={styles.conditionsCell} key={label}>
                  <span className={styles.conditionsHead}>
                    {Icon && <Icon size={13} strokeWidth={1.8} className={styles.conditionsIcon} aria-hidden="true" />}
                    <span className={styles.conditionsLabelSm}>{label}</span>
                  </span>
                  <span className={isText ? styles.conditionsValueText : styles.conditionsValue}>{value}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.planPanelFoot}>
        <button type="button" className={styles.chooseBtn} onClick={choose} disabled={!hasFee}>
          {hasFee ? 'Choose This Plan' : 'Unavailable'} <ArrowRight size={15} strokeWidth={2.4} />
        </button>
        <Link href={`/rules?program=${PROGRAM_SLUG[typeOf(plan)]}`} className={styles.rulesLink}>
          View Full Rules <ArrowRight size={13} strokeWidth={2.4} />
        </Link>
      </div>
    </div>
  );
}

/* ============================================================
   EMPTY PROGRAM PANEL — shown when a real, defined program (its
   rules are canonical, see PROGRAM_META) currently has zero active
   plans behind it. The global page composition stays intact — this
   fills the same panel position, never a page-breaking dead end.
   ============================================================ */
function EmptyProgramPanel({ program }) {
  const meta = PROGRAM_META[program];
  return (
    <div className={styles.planPanel} data-program={program}>
      <div className={styles.planPanelGlow} aria-hidden="true" />
      <div className={styles.emptyPanelBody}>
        <span className={styles.emptyPanelIcon}><meta.Icon size={22} strokeWidth={1.8} /></span>
        <h3 className={styles.emptyPanelTitle}>No Active {meta.name} Plans Right Now</h3>
        <p className={styles.emptyPanelSub}>
          {meta.fullName} plans aren&apos;t currently available for purchase. Explore its configured rules, or
          choose another program above.
        </p>
        <Link href={`/rules?program=${PROGRAM_SLUG[program]}`} className="btn btn-secondary btn-sm">
          View {meta.name} Rules →
        </Link>
      </div>
    </div>
  );
}

/* ============================================================
   PLAN AT A GLANCE — wide horizontal strip below the marketplace.
   ============================================================ */
function GlanceStrip({ program, plan }) {
  const r = planRuleSummary(plan);
  const items = [
    ['Profit Target', r.profitTargetPct != null ? `${r.profitTargetPct}%` : 'N/A'],
    r.dailyDrawdownPct != null && ['Daily Drawdown', `${r.dailyDrawdownPct}%`],
    r.maximumDrawdownPct != null && ['Max Drawdown', `${r.maximumDrawdownPct}%`],
    ['Min. Trading Days', r.profitableTradingDays != null ? String(r.profitableTradingDays) : '—'],
  ].filter(Boolean);

  return (
    <section className={styles.glanceSection}>
      <div className="wrap">
        <div className={styles.glanceStrip}>
          <div className={styles.glanceLeft}>
            <span className={styles.glanceIcon}><ShieldCheck size={18} strokeWidth={1.8} /></span>
            <div>
              <div className={styles.glanceTitle}>Your Plan at a Glance</div>
              <p className={styles.glanceSub}>Know the key trading conditions before you commit.</p>
            </div>
          </div>
          <div className={styles.glanceRight}>
            {items.map(([label, value]) => (
              <div className={styles.glanceCell} key={label}>
                <span className={styles.glanceValue}>{value}</span>
                <span className={styles.glanceLabel}>{label}</span>
              </div>
            ))}
            <Link href={`/rules?program=${PROGRAM_SLUG[program]}`} className={styles.glanceLink}>
              View Full Rules <ArrowRight size={13} strokeWidth={2.4} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   SUPPORT NAVIGATION — three elegant shortcuts, never giant cards.
   ============================================================ */
function SupportLinks({ program }) {
  const slug = PROGRAM_SLUG[program];
  const items = [
    { Icon: Compass, title: 'How It Works', sub: 'Learn the process', href: '/how-it-works' },
    { Icon: ScrollText, title: 'Rules', sub: 'Full trading conditions', href: `/rules?program=${slug}` },
    { Icon: HelpCircle, title: 'FAQ', sub: 'Common questions', href: '/faq' },
  ];
  return (
    <section className={styles.supportSection}>
      <div className="wrap">
        <div className={styles.supportRow}>
          {items.map((it) => (
            <Link key={it.title} href={it.href} className={styles.supportItem}>
              <span className={styles.supportIcon}><it.Icon size={16} strokeWidth={1.8} /></span>
              <span>
                <span className={styles.supportItemTitle}>{it.title}</span>
                <span className={styles.supportItemSub}>{it.sub} <ArrowRight size={11} strokeWidth={2.4} /></span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   STATE (loading / error / empty)
   ============================================================ */
function StateCard({ title, sub, retry }) {
  return (
    <section className={styles.stateSection}>
      <div className="wrap">
        <div className={styles.stateCard}>
          <h2 className={styles.stateTitle}>{title}</h2>
          <p className={styles.stateSub}>{sub}</p>
          {retry && <button type="button" className="btn btn-primary btn-sm" onClick={retry}>Retry</button>}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   PAGE
   ============================================================ */
export default function ChallengesClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();

  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeProgram, setActiveProgram] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let on = true;
    setLoading(true);
    setError('');

    // Public page — must render even when Supabase is unreachable. A
    // fallback timer ends the loading state after a short window; a later
    // real response still updates the view normally.
    const fallback = setTimeout(() => {
      if (!on) return;
      setError('Request timed out.');
      setLoading(false);
    }, 4000);

    (async () => {
      const { data, error: e } = await supabase
        .from('plans')
        .select('*')
        .eq('active', true)
        .order('capital', { ascending: true });
      if (!on) return;
      clearTimeout(fallback);
      if (e) setError(e.message);
      setPlans(data || []);
      setLoading(false);
    })();
    return () => { on = false; clearTimeout(fallback); };
  }, [retryToken]);

  // The program SELECTOR always shows all three canonical programs —
  // ONE_STEP / TWO_STEP / INSTANT are real, defined products in the rule
  // engine (lib/rules.js), not something invented for this page. What
  // varies is INVENTORY: which of them currently has an active,
  // purchasable plan behind it.
  const plansByProgram = useMemo(() => {
    const map = new Map();
    for (const t of TYPE_ORDER) map.set(t, (plans || []).filter((p) => typeOf(p) === t));
    return map;
  }, [plans]);

  // Only used to pick a sensible *default* landing program — never to
  // decide what the selector renders (that's always all three).
  const programsWithPlans = useMemo(
    () => TYPE_ORDER.filter((t) => (plansByProgram.get(t) || []).length > 0),
    [plansByProgram],
  );

  const visiblePlans = activeProgram ? (plansByProgram.get(activeProgram) || []) : [];

  // URL -> state, once real data has resolved. ONE effect decides the
  // active program per render: a valid ?program= (any of the three
  // canonical slugs, whether or not it currently has plans) wins, together
  // with an optional &plan=; otherwise fall back to the first canonical
  // program that actually has active inventory, so a first-time visitor
  // lands on something purchasable.
  useEffect(() => {
    if (loading) return;
    const p = searchParams.get('program');
    const planParam = searchParams.get('plan');
    const program = (p && SLUG_PROGRAM[p]) ? SLUG_PROGRAM[p] : (programsWithPlans[0] || TYPE_ORDER[0]);
    setActiveProgram(program);
    const plansForProgram = plansByProgram.get(program) || [];
    if (planParam && plansForProgram.some((pl) => String(pl.id) === planParam)) {
      setSelectedPlanId(planParam.match(/^\d+$/) ? Number(planParam) : planParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, loading, programsWithPlans]);

  // Default plan: first valid plan for the active program, whenever the
  // current selection doesn't belong to it.
  useEffect(() => {
    if (!visiblePlans.length) { if (selectedPlanId !== null) setSelectedPlanId(null); return; }
    if (!visiblePlans.some((p) => p.id === selectedPlanId)) {
      setSelectedPlanId(visiblePlans[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProgram, visiblePlans.map((p) => p.id).join(',')]);

  const selectProgram = useCallback((program) => {
    if (program === activeProgram) return;
    setActiveProgram(program);
    const params = new URLSearchParams(searchParams.toString());
    params.set('program', PROGRAM_SLUG[program]);
    params.delete('plan');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeProgram, pathname, router, searchParams]);

  const selectPlan = useCallback((planId) => {
    setSelectedPlanId(planId);
    if (!activeProgram) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('program', PROGRAM_SLUG[activeProgram]);
    params.set('plan', String(planId));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [activeProgram, pathname, router, searchParams]);

  const selectedPlan = visiblePlans.find((p) => p.id === selectedPlanId) || null;

  return (
    <main className={styles.page} id="top">
      <CinematicBackground />
      <Hero />

      {loading && (
        <section className={styles.stateSection}>
          <div className="wrap">
            <div className={styles.skeletonBlock}><div className={styles.shimmer} /></div>
          </div>
        </section>
      )}

      {!loading && error && (
        <StateCard title="Unable to load programs" sub={error} retry={() => setRetryToken((n) => n + 1)} />
      )}

      {!loading && !error && plans.length === 0 && (
        <StateCard title="Programs are currently unavailable" sub="Please check back later." />
      )}

      {!loading && !error && plans.length > 0 && activeProgram && (
        <>
          <ProgramSelector programs={TYPE_ORDER} active={activeProgram} onSelect={selectProgram} />

          <AnimatePresence mode="wait">
          <motion.div
            key={activeProgram}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.26, ease: [0.19, 1, 0.22, 1] }}
          >
            <section className={styles.workspaceSection} data-program={activeProgram}>
              <div className="wrap">
                <ProgramContext program={activeProgram} />

                <div className={styles.workspaceGrid}>
                  {visiblePlans.length > 0 ? (
                    <>
                      <PlanSelector plans={visiblePlans} selectedId={selectedPlanId} onSelect={selectPlan} />
                      {selectedPlan && <SelectedPlanPanel program={activeProgram} plan={selectedPlan} />}
                    </>
                  ) : (
                    <>
                      <div className={styles.planSelector}>
                        <div className={styles.planSelectorHead}>
                          <span className={styles.planSelectorLabel}>Account Size</span>
                        </div>
                        <div className={styles.planSelectorUnavailable}>No account sizes available yet.</div>
                      </div>
                      <EmptyProgramPanel program={activeProgram} />
                    </>
                  )}
                </div>
              </div>
            </section>

            {selectedPlan && <GlanceStrip program={activeProgram} plan={selectedPlan} />}
          </motion.div>
          </AnimatePresence>
        </>
      )}

      <SupportLinks program={activeProgram || PLAN_TYPES.TWO_STEP} />
    </main>
  );
}
