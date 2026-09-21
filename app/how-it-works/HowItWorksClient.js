'use client';

/* ============================================================
   /how-it-works — public journey explainer (no account state required)

   Every claim about the journey is sourced from the actual application:
     - program/phase lifecycle: lib/rules.js (PLAN_TYPES, getPlanPhases,
       getPhaseDisplayLabel) — the same resolver /rules uses. No second
       progression engine is created here.
     - checkout flow (UPI + UTR + manual verification, no gateway yet):
       matches app/cart/page.js exactly — this page does not invent
       "instant activation".
     - phase/funded transitions and order verification are admin-applied
       (app/admin/page.js updateAccountField), not automatic — described
       as reviewed, never as automatic.
     - payout eligibility (funded + profit above the configured minimum):
       matches lib/payouts.js computeEligibility.
     - instruments (NIFTY/BANKNIFTY/FINNIFTY/SENSEX, CE/PE) and the
       simulated-capital/live-data terminal model: matches the copy
       already published on /risk-disclosure and /terms.

   The only Supabase read here is which plan types currently have an
   active plan, purely to label a program "Reference" the same way
   /rules and /challenges already do — no account or user data.
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useScrollReveal, useStaggeredReveal } from '@/hooks/useScrollReveal';
import { supabase } from '@/lib/supabaseClient';
import { getPlanPhases, getPhaseDisplayLabel, PLAN_TYPES } from '@/lib/rules';
import { getPlanTypeLabel } from '@/lib/accounts';
import styles from './how-it-works.module.css';

const TRACKS = [PLAN_TYPES.ONE_STEP, PLAN_TYPES.TWO_STEP, PLAN_TYPES.INSTANT];
const PROGRAM_SLUG = { ONE_STEP: 'one-step', TWO_STEP: 'two-step', INSTANT: 'instant' };

const JOURNEY_NODES = ['Challenge', 'Trade', 'Evaluate', 'Funded'];

const STEPS = [
  {
    n: '01',
    title: 'Choose Your Program',
    desc: 'Compare the One-Step, Two-Step and Instant programs and pick an account size. Every plan shown on the catalogue is a real, active listing — sizes and fees are never hardcoded on that page.',
    cta: { label: 'Explore Programs', href: '/challenges' },
  },
  {
    n: '02',
    title: 'Understand Your Rules',
    desc: 'Before you pay, read what your program actually requires: profit targets, drawdown limits, trading restrictions and payout terms. These come from the platform’s live rule configuration, not marketing copy — anything not configured is shown honestly as not specified.',
    cta: { label: 'Read Trading Rules', href: '/rules' },
  },
  {
    n: '03',
    title: 'Start Your Challenge',
    desc: (
      <>
        Complete checkout, then transfer the fee by UPI and submit your transaction reference (UTR). There is no
        payment gateway yet, so <b>submitting a UTR is not the same as an activated account</b> — the team verifies
        the payment manually, and the challenge account is created only once that&rsquo;s done (usually within an hour).
      </>
    ),
    cta: { label: 'Go to Checkout', href: '/cart' },
    note: 'You can track verification status from Orders inside the portal once you’re logged in.',
  },
  {
    n: '04',
    title: 'Trade',
    desc: 'Once your account is active, trade Indian index options — NIFTY, BANKNIFTY, FINNIFTY and SENSEX — as CE or PE, long or short, against real-time market data in the terminal. Trading capital is simulated: orders are not placed on any exchange.',
    cta: { label: 'Open the Terminal', href: '/portal/terminal' },
  },
  {
    n: '05',
    title: 'Progress Through Your Stages',
    desc: (
      <>
        Two-Step accounts move Phase 1 → Phase 2 → Funded; One-Step accounts move Evaluation → Funded; Instant
        accounts start funded. Phase changes and funded-stage upgrades are <b>reviewed and applied by the team</b> based
        on your account&rsquo;s performance against the configured criteria — this is not an automatic transition.
      </>
    ),
    cta: { label: 'See Program Rules', href: '/rules' },
  },
  {
    n: '06',
    title: 'Request a Payout',
    desc: 'Once an account is funded and its profit meets the minimum configured for that program, a payout can be requested from the portal. Requests are reviewed and paid manually according to the payout rules configured for your program.',
    cta: { label: 'Payouts Workspace', href: '/portal/payouts' },
  },
];

const RULE_LINKS = [
  { title: 'Trading Conditions', href: '/rules?category=conditions', desc: 'How positions are opened, held and closed.' },
  { title: 'Trading Rules & Requirements', href: '/rules?category=requirements', desc: 'Targets and drawdown limits for your stage.' },
  { title: 'Restrictions', href: '/rules?category=restrictions', desc: 'What triggers a hard or soft breach.' },
  { title: 'Payout Rules', href: '/rules?category=payout', desc: 'Split, cycle and withdrawal limits.' },
];

function JourneyNodes() {
  const { ref, isInView, delays } = useStaggeredReveal(JOURNEY_NODES.length, { staggerDelay: 0.12 });
  return (
    <div className={styles.journey} ref={ref}>
      <div className={styles.journeyTrack}>
        {JOURNEY_NODES.map((label, i) => (
          <div key={label} style={{ display: 'contents' }}>
            <div className={`${styles.journeyNode} ${isInView ? styles.lit : ''}`} style={{ transitionDelay: `${delays[i]}s` }}>
              <div className={styles.journeyDot}>{i + 1}</div>
              <div className={styles.journeyLabel}>{label}</div>
            </div>
            {i < JOURNEY_NODES.length - 1 && (
              <div className={`${styles.journeyLine} ${isInView ? styles.lit : ''}`} style={{ transitionDelay: `${delays[i]}s` }} aria-hidden="true" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={styles.heroVignette} aria-hidden="true" />
      <div className="wrap">
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>How It Works</div>
          <h1 className={styles.heroTitle}>
            From Challenge
            <span>to Funded Trading.</span>
          </h1>
          <p className={styles.heroSub}>
            Choose a program, understand its rules, and trade within the configured conditions. Every stage below is
            described as it actually works on FundedDesk today — including the parts that are reviewed by our team
            rather than automated.
          </p>
        </div>
        <JourneyNodes />
      </div>
    </section>
  );
}

function Step({ step }) {
  const { ref, isInView } = useScrollReveal();
  return (
    <div ref={ref} className={`${styles.step} ${isInView ? styles.revealed : ''}`}>
      <div className={styles.stepNum}>{step.n}</div>
      <div>
        <h3 className={styles.stepTitle}>{step.title}</h3>
        <p className={styles.stepDesc}>{step.desc}</p>
        <Link href={step.cta.href} className={styles.stepCta}>{step.cta.label} <span aria-hidden="true">&rarr;</span></Link>
        {step.note && <div className={styles.stepNote}>{step.note}</div>}
      </div>
    </div>
  );
}

function StepsSection() {
  return (
    <section className={styles.section} aria-labelledby="steps-h">
      <div className="wrap">
        <div className={styles.sectionHead}>
          <div className={styles.sectionEyebrow}>The Process</div>
          <h2 id="steps-h" className={styles.sectionTitle}>How the Process Works</h2>
          <p className={styles.sectionSub}>Only the stages FundedDesk actually supports today — nothing implied, nothing skipped.</p>
        </div>
        <div className={styles.steps}>
          {STEPS.map((s) => <Step key={s.n} step={s} />)}
        </div>
      </div>
    </section>
  );
}

function ProgressionCard({ planType, hasPlan }) {
  const phases = getPlanPhases(planType);
  const labels = phases.map((p) => getPhaseDisplayLabel(planType, p));
  return (
    <div className={styles.progCard}>
      <div className={styles.progHead}>
        <h3 className={styles.progTitle}>{getPlanTypeLabel(planType)}</h3>
        {!hasPlan && <span className={styles.refBadge}>REFERENCE</span>}
      </div>
      <div className={styles.progChain}>
        {labels.map((label, i) => (
          <div key={label}>
            <div className={styles.progStage}>
              <span className={styles.progStageDot} aria-hidden="true" />
              <span className={styles.progStageLabel}>{label}</span>
            </div>
            {i < labels.length - 1 && <div className={styles.progConnector} aria-hidden="true" />}
          </div>
        ))}
      </div>
      <div className={styles.progFoot}>
        Transitions between stages are reviewed by the team, not automatic.{' '}
        <Link href={`/rules?program=${PROGRAM_SLUG[planType]}`}>See {getPlanTypeLabel(planType)} rules &rarr;</Link>
      </div>
    </div>
  );
}

function ProgressionSection({ tracksWithPlan }) {
  return (
    <section className={styles.section} aria-labelledby="progression-h">
      <div className="wrap">
        <div className={styles.sectionHead}>
          <div className={styles.sectionEyebrow}>Account Lifecycle</div>
          <h2 id="progression-h" className={styles.sectionTitle}>Where Your Account Can Go</h2>
          <p className={styles.sectionSub}>
            The actual stage sequence for each program, from the same rule engine the Rules page uses. Specific
            profit targets and drawdown limits for each stage are configured per program — see the Rules page rather
            than a number repeated here.
          </p>
        </div>
        <div className={styles.progressionGrid}>
          {TRACKS.map((t) => <ProgressionCard key={t} planType={t} hasPlan={tracksWithPlan.has(t)} />)}
        </div>
      </div>
    </section>
  );
}

function RulesPreviewSection() {
  return (
    <section className={styles.section} aria-labelledby="rules-preview-h">
      <div className="wrap">
        <div className={styles.sectionHead}>
          <div className={styles.sectionEyebrow}>Documentation</div>
          <h2 id="rules-preview-h" className={styles.sectionTitle}>Know What You&apos;re Trading Under</h2>
          <p className={styles.sectionSub}>Four categories from the Rulebook — open any one to see the configured values for your program.</p>
        </div>
        <div className={styles.ruleGrid}>
          {RULE_LINKS.map((r) => (
            <Link key={r.title} href={r.href} className={styles.ruleCard}>
              <h3 className={styles.ruleTitle}>{r.title}</h3>
              <p className={styles.ruleDesc}>{r.desc}</p>
              <span className={styles.ruleArrow}>Open &rarr;</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function PayoutSection() {
  return (
    <section className={styles.section} aria-labelledby="payout-h">
      <div className="wrap">
        <div className={styles.payoutCard}>
          <div className={styles.sectionEyebrow}>Getting Paid</div>
          <h2 id="payout-h" className={styles.sectionTitle}>Payouts</h2>
          <p className={styles.payoutText}>
            Once an account reaches the funded phase and its profit meets the minimum configured for that program, a
            payout can be requested from the portal. Requests are reviewed and paid manually — there is no automated
            payout gateway. Split, minimum and cycle values are set per program and shown on the Rules page.
          </p>
          <div className={styles.payoutBtns}>
            <Link href="/portal/payouts" className="btn btn-primary btn-sm">Payouts Workspace</Link>
            <Link href="/rules?category=payout" className="btn btn-secondary btn-sm">Payout Rules</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className={styles.section} aria-labelledby="faq-connect-h">
      <div className="wrap">
        <div className={styles.faqCard}>
          <h2 id="faq-connect-h" className={styles.sectionTitle}>Still Have Questions?</h2>
          <div className={styles.faqTags}>
            {['Programs', 'Trading', 'Rules', 'Payouts'].map((t) => <span key={t} className={styles.faqTag}>{t}</span>)}
          </div>
          <Link href="/faq" className="btn btn-secondary btn-sm">Visit the FAQ</Link>
        </div>
      </div>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className={styles.ctaSection}>
      <div className={styles.ctaGlow} aria-hidden="true" />
      <div className="wrap">
        <h2 className={styles.ctaTitle}>Ready to Start?</h2>
        <p className={styles.ctaSub}>Pick a program, read what it actually requires, and decide with full information.</p>
        <div className={styles.ctaBtns}>
          <Link href="/challenges" className="btn btn-primary">Explore Programs &rarr;</Link>
          <Link href="/rules" className="btn btn-secondary">Read the Rules &rarr;</Link>
        </div>
      </div>
    </section>
  );
}

export default function HowItWorksClient() {
  const [tracksWithPlan, setTracksWithPlan] = useState(() => new Set());

  useEffect(() => {
    let on = true;
    (async () => {
      const { data } = await supabase.from('plans').select('*').eq('active', true);
      if (!on) return;
      setTracksWithPlan(new Set((data || []).map((p) => p.plan_type || 'TWO_STEP')));
    })();
    return () => { on = false; };
  }, []);

  return (
    <main className={styles.page}>
      <Hero />
      <StepsSection />
      <ProgressionSection tracksWithPlan={tracksWithPlan} />
      <RulesPreviewSection />
      <PayoutSection />
      <FinalCTA />
      <FaqSection />
    </main>
  );
}
