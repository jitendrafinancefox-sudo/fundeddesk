'use client';
/* ================================================================
   FundedDesk Landing — Premium Indian Prop Trading Platform
   Sections: hero, live ticker, challenge picker, comparison, steps, testimonials, CTA
   ================================================================ */
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useScrollReveal, useStaggeredReveal } from '@/hooks/useScrollReveal';
import LiveTicker from '@/components/LiveTicker';
import PageBackgroundSequence from '@/components/PageBackgroundSequence';
import ScrollPath from '@/components/ScrollPath';
import PayoutFeed from '@/components/PayoutFeed';
import DocumentsSection from '@/components/DocumentsSection';
import MarketTicker from '@/components/MarketTicker';

const SIZES = [
  { cap: '₹2 Lakh',  capN: 200000,  fee2: '₹2,999',  fee1: '₹3,899'  },
  { cap: '₹5 Lakh',  capN: 500000,  fee2: '₹4,999',  fee1: '₹6,499'  },
  { cap: '₹10 Lakh', capN: 1000000, fee2: '₹8,999',  fee1: '₹11,999' },
];
const ANNOUNCE = [
  '🚀 Working Model 2.0 — Live Indian Options Terminal',
  '📜 Every rule public. Zero hidden conditions.',
  '⚡ Payouts processed within 24 hours',
];
const inr = (n) => '₹' + n.toLocaleString('en-IN');

/* ================================================================
   Counter — count-up number, triggers once when scrolled into view
   ================================================================ */
function Counter({ prefix = '', value, suffix = '', duration = 1300 }) {
  const [n, setN] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    let raf, start, started = false;
    function run(ts) {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(run);
    }
    const el = ref.current;
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started) { started = true; raf = requestAnimationFrame(run); io.disconnect(); }
    }, { threshold: 0.4 });
    if (el) io.observe(el);
    return () => { if (raf) cancelAnimationFrame(raf); io.disconnect(); };
  }, [value, duration]);
  return <span ref={ref}>{prefix}{n}{suffix}</span>;
}

/* ================================================================
   Dot — Yes/No indicator for comparison table
   ================================================================ */
function Dot({ yes }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700,
      color: yes ? 'var(--brand)' : 'var(--red)',
    }}>
      {yes ? 'Yes' : 'No'}
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: yes ? 'var(--brand)' : 'var(--red)', boxShadow: yes ? '0 0 8px rgba(34,197,139,.7)' : '0 0 8px rgba(240,82,95,.6)' }} />
    </span>
  );
}

/* ================================================================
   PinnedSteps — scroll-driven story: section stays pinned while you
   scroll through it, content cross-fades per step. Falls back to a
   static grid on mobile / reduced-motion for accessibility.
   ================================================================ */
function PinnedSteps({ steps }) {
  const wrapRef = useRef(null);
  const [active, setActive] = useState(0);
  const [fallback, setFallback] = useState(true);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setFallback(reduce || window.innerWidth < 860);
  }, []);

  useEffect(() => {
    if (fallback) return;
    function onScroll() {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      const idx = Math.min(steps.length - 1, Math.floor(progress * steps.length));
      setActive(idx);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [fallback, steps.length]);

  if (fallback) {
    return (
      <div className="wrap" style={{ paddingTop: 12 }}>
        <div className="grid3">
          {steps.map(([n, t, d]) => (
            <div className="card" data-reveal key={n} style={{ position: 'relative' }}>
              <div className="stepnum">{n}</div>
              <div className="label" style={{ marginBottom: 12 }}>STEP {n}</div>
              <h3 style={{ marginBottom: 8 }}>{t}</h3>
              <p className="body-sm" style={{ fontSize: 14 }}>{d}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ height: (steps.length * 100) + 'vh', position: 'relative' }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="wrap" style={{ maxWidth: 720, textAlign: 'center', position: 'relative' }}>
          <div className="label" style={{ marginBottom: 22 }}>
            STEP {steps[active][0]} OF {String(steps.length).padStart(2, '0')}
          </div>
          <div style={{ position: 'relative', minHeight: 190 }}>
            {steps.map(([n, t, d], i) => (
              <div key={n} style={{
                position: i === active ? 'relative' : 'absolute', inset: 0,
                opacity: i === active ? 1 : 0,
                transform: i === active ? 'translateY(0) scale(1)' : 'translateY(22px) scale(.97)',
                transition: 'opacity .55s cubic-bezier(.19,1,.22,1), transform .55s cubic-bezier(.19,1,.22,1)',
                pointerEvents: i === active ? 'auto' : 'none',
              }}>
                <h2 style={{ marginBottom: 16 }}>{t}</h2>
                <p className="body-muted" style={{ maxWidth: 540, margin: '0 auto' }}>{d}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 40 }}>
            {steps.map((_, i) => <span key={i} className={'pin-dot' + (i === active ? ' on' : '')} />)}
          </div>
          <div className="label-muted" style={{ fontSize: 11, marginTop: 18 }}>Keep scrolling ↓</div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [step, setStep] = useState('2step');
  const [size, setSize] = useState(1);
  const [ann, setAnn] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setAnn((a) => (a + 1) % ANNOUNCE.length), 3500);
    return () => clearInterval(t);
  }, []);

  const s = SIZES[size];
  const fee = step === '2step' ? s.fee2 : s.fee1;
  const t1 = step === '2step' ? 8 : 10;

  return (
    <main className="landing" style={{
      // green theme override (scoped to landing only)
      ['--grad']: 'linear-gradient(96deg,#16C784,#7CF29C)',
      ['--blue']: '#22C58B',
    }}>
      {/* Page-wide fixed background image sequence */}
      <PageBackgroundSequence />

      {/* Announcement bar */}
      <div className="eyebrow" style={{ 
        background: 'rgba(34,197,139,0.12)', 
        border: '1px solid rgba(34,197,139,0.2)', 
        borderRadius: '99px',
        padding: '8px 16px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        margin: '16px auto',
        maxWidth: 'fit-content'
      }}>
        {ANNOUNCE[ann]}
      </div>

      {/* Landing-only scroll progress bar */}
      <ScrollPath />

      {/* HERO */}
      <header className="hero" style={{
        position: 'relative', textAlign: 'center', overflow: 'hidden',
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '100px 0',
        background: 'transparent',
        zIndex: 1,
      }}>
        <div className="wrap" style={{ position: 'relative', zIndex: 2 }}>
          <span className="eyebrow" style={{ background: 'rgba(34,197,139,0.12)', border: '1px solid rgba(34,197,139,0.2)', borderRadius: '99px', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            🇮🇳 Built for Indian traders · Options · Simulated capital
          </span>
          <h1 style={{ maxWidth: 980, margin: '0 auto 24px', position: 'relative', zIndex: 2 }}>
            {"Prove Your Skill.".split(' ').map((w, i) => (
              <span key={'a' + i} className="hero-word" style={{ animationDelay: (i * 80) + 'ms' }}>{w}{' '}</span>
            ))}
            <br />
            {"Trade Our Capital.".split(' ').map((w, i) => (
              <span key={'b' + i} className="hero-word grad-text" style={{ animationDelay: (300 + i * 80) + 'ms' }}>{w}{' '}</span>
            ))}
          </h1>
          <p className="body-lg hero-fade" style={{ maxWidth: 680, margin: '0 auto 48px', animationDelay: '620ms' }}>
            Pass a transparent evaluation on our simulated NIFTY & BANKNIFTY options terminal.
            Keep up to 90% of the rewards — with every rule published before you pay.
          </p>
          <div className="hero-fade" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', animationDelay: '740ms', marginBottom: '64px' }}>
            <Link className="btn btn-primary btn-lg" href="/challenges">Buy Challenge →</Link>
            <Link className="btn btn-secondary btn-lg" href="/rules">Read the Rulebook</Link>
          </div>
          
          {/* Metrics Row - Institutional Stats */}
          <div className="hm-row" style={{ animationDelay: '860ms' }}>
            <div className="hm" style={{ textAlign: 'center' }}>
              <div className="stat-num"><Counter prefix="₹" value={50} suffix="L" /></div>
              <div className="stat-label">Max Account Size</div>
            </div>
            <div className="hm" style={{ textAlign: 'center' }}>
              <div className="stat-num grad-text"><Counter value={90} suffix="%" /></div>
              <div className="stat-label">Top Reward Split</div>
            </div>
            <div className="hm" style={{ textAlign: 'center' }}>
              <div className="stat-num"><Counter value={24} suffix="h" /></div>
              <div className="stat-label">Payout Processing</div>
            </div>
            <div className="hm" style={{ textAlign: 'center' }}>
              <div className="stat-num"><Counter value={0} /></div>
              <div className="stat-label">Hidden Rules</div>
            </div>
          </div>
          
          {/* Scroll Indicator */}
          <motion.div
            className="label-muted"
            style={{ 
              marginTop: '80px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              gap: '12px',
              animationDelay: '1000ms'
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2, ease: [0.19, 1, 0.22, 1] }}
          >
            Scroll to explore
            <motion.svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <path d="M12 5v14M19 12l-7 7-7-7"/>
            </motion.svg>
          </motion.div>
        </div>
      </header>

      {/* TRUST STRIP */}
      <section className="trust-strip" style={{ padding: '32px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'rgba(34,197,139,0.02)' }}>
        <div className="wrap" style={{ display: 'flex', justifyContent: 'center', gap: '48px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand)', boxShadow: '0 0 12px var(--brand-glow)' }} />
            <span className="body-sm" style={{ color: 'var(--text-dim)' }}>Built for serious Indian traders</span>
          </div>
          <div style={{ width: '1px', height: '32px', background: 'var(--border)', opacity: 0.5 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="label" style={{ fontSize: 11 }}>INDIAN OPTIONS</span>
          </div>
          <div style={{ width: '1px', height: '32px', background: 'var(--border)', opacity: 0.5 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="label" style={{ fontSize: 11 }}>NIFTY 50</span>
          </div>
          <div style={{ width: '1px', height: '32px', background: 'var(--border)', opacity: 0.5 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="label" style={{ fontSize: 11 }}>BANKNIFTY</span>
          </div>
          <div style={{ width: '1px', height: '32px', background: 'var(--border)', opacity: 0.5 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="label" style={{ fontSize: 11 }}>FAST PAYOUTS</span>
          </div>
          <div style={{ width: '1px', height: '32px', background: 'var(--border)', opacity: 0.5 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="label" style={{ fontSize: 11 }}>TRANSPARENT RULES</span>
          </div>
        </div>
      </section>

      <LiveTicker />

      {/* CHALLENGE PICKER */}
      <section id="challenge-picker" style={{ paddingTop: 24, paddingBottom: 32, scrollMarginTop: 90, zIndex: 1, position: 'relative' }}>
        <div className="wrap">
          <motion.div className="sec-head" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "0px 0px -10% 0px" }} transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}>
            <h2>Funded Account <span className="grad-text">Challenges</span></h2>
            <p className="body-muted">Pick your path and your size. Same public rules for everyone.</p>
          </motion.div>

          {/* tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {[['1step', '1 Step'], ['2step', '2 Step']].map(([k, label]) => (
              <button key={k} onClick={() => setStep(k)} className="btn btn-sm"
                style={step === k
                  ? { background: 'var(--grad)', color: '#040806', fontWeight: 800, boxShadow: 'var(--shadow-glow)' }
                  : { border: '1px solid var(--border)', color: 'var(--fg-muted)' }}>{label}</button>
            ))}
            <span style={{ width: 18 }} />
            {SIZES.map((x, i) => (
              <button key={x.cap} onClick={() => setSize(i)} className="btn btn-sm"
                style={size === i
                  ? { background: 'rgba(34,197,139,.16)', color: 'var(--fg-accent)', border: '1px solid rgba(34,197,139,.45)', fontWeight: 800 }
                  : { border: '1px solid var(--border)', color: 'var(--fg-muted)' }}>
                {x.cap}{i === 1 ? ' ★' : ''}
              </button>
            ))}
          </div>

          {/* pricing card */}
          <div className="card pricecard" style={{ maxWidth: 620, margin: '0 auto', padding: 0, overflow: 'hidden', borderColor: 'rgba(34,197,139,.35)', background: 'linear-gradient(180deg,rgba(34,197,139,.06),var(--bg-card))' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div className="label-muted" style={{ fontSize: 13 }}>{step === '2step' ? '2 Step Evaluation' : '1 Step Evaluation'} · {s.cap} account</div>
                <div className="num" style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 34, fontVariantNumeric: 'tabular-nums' }}>
                  {fee} <span className="label-muted" style={{ fontSize: 13, fontWeight: 500 }}>one-time fee</span>
                </div>
              </div>
              <span className="tag tag-brand">FEE REFUNDED WITH 1ST PAYOUT</span>
            </div>
            <table className="tbl num">
              <tbody>
                {[
                  { label: `Profit target ${step === '2step' ? '(Phase 1)' : ''}`, value: `${t1}% · <span class="muted">${inr(s.capN * t1 / 100)}</span>` },
                  ...(step === '2step' ? [{ label: 'Profit target (Phase 2)', value: `5% · <span class="muted">${inr(s.capN * 5 / 100)}</span>` }] : []),
                  { label: 'Maximum loss', value: `10% · <span class="muted">${inr(s.capN * 10 / 100)}</span>` },
                  { label: 'Maximum daily loss', value: `5% · <span class="muted">${inr(s.capN * 5 / 100)}</span>` },
                  { label: 'Time limit', value: '<span style="color:var(--fg-accent);font-weight:700">Unlimited</span>' },
                  { label: 'Reward split', value: '<span style="color:var(--fg-accent);font-weight:700">Up to 90%</span>' },
                ].map((row, i) => (
                  <motion.tr
                    key={row.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                    transition={{ duration: 0.5, delay: 0.15 + i * 0.06, ease: [0.19, 1, 0.22, 1] }}
                  >
                    <td style={{ paddingLeft: 28 }}>{row.label}</td>
                    <td style={{ textAlign: 'right', paddingRight: 28 }} dangerouslySetInnerHTML={{ __html: row.value }} />
                  </motion.tr>
                ))}
              </tbody>
            </table>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -10% 0px" }}
              transition={{ duration: 0.5, delay: 0.15 + 6 * 0.06, ease: [0.19, 1, 0.22, 1] }}
              style={{ padding: '18px 28px' }}
            >
              <Link className="btn btn-primary" href="/challenges" style={{ width: '100%' }}>
                Start {s.cap} Challenge →
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section style={{ paddingTop: 80, paddingBottom: 80, zIndex: 1, position: 'relative' }}>
        <div className="wrap" style={{ maxWidth: 880 }}>
          <motion.div className="sec-head" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "0px 0px -10% 0px" }} transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}>
            <h2>Why traders pick <span className="grad-text">FundedDesk</span></h2>
          </motion.div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="tbl" style={{ fontSize: 15 }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 26 }}>Feature</th>
                  <th style={{ textAlign: 'center' }}>FundedDesk</th>
                  <th style={{ textAlign: 'center' }}>Typical firms</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Every breach rule published upfront', true, false],
                  ['Timestamped breach evidence snapshots', true, false],
                  ['Indian options terminal (NIFTY/BANKNIFTY)', true, false],
                  ['Unlimited time to pass', true, false],
                  ['Free retry (profit, no breach)', true, false],
                  ['Hindi + English human support', true, false],
                  ['Hidden consistency rules', false, true],
                  ['Fee hidden in fine print', false, true],
                ].map(([f, us, them], i) => (
                  <motion.tr
                    key={f}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.05, ease: [0.19, 1, 0.22, 1] }}
                  >
                    <td style={{ paddingLeft: 26 }} className="body">{f}</td>
                    <td style={{ textAlign: 'center' }}>
                      <Dot yes={us} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Dot yes={them} />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* WHY US / ADVANTAGES */}
      <section style={{ paddingTop: 80, paddingBottom: 80, zIndex: 1, position: 'relative' }}>
        <div className="wrap" style={{ maxWidth: 1000 }}>
          <motion.div className="sec-head" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "0px 0px -10% 0px" }} transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}>
            <h2>Why traders choose <span className="grad-text">FundedDesk</span></h2>
            <p className="body-muted">Every advantage is designed around the Indian options trader.</p>
          </motion.div>
          <div className="grid3" style={{ gap: '24px' }}>
            {[
              ['transparent', 'Transparent Rules', 'Every breach rule published upfront. No hidden clauses, no retrospective changes.'],
              ['speed', 'Fast Processing', 'Payouts processed within 24 hours. No waiting periods, no bureaucratic delays.'],
              ['design', 'Trader-First Design', 'Built by traders, for traders. Every feature solves a real workflow problem.'],
              ['india', 'Indian Market Focus', 'NIFTY & BANKNIFTY options terminal with live market data and Indian market hours.'],
              ['risk', 'Risk-Based Trading', 'Dynamic risk engine adapts to your style. No one-size-fits-all limits.'],
              ['simple', 'Simple Evaluation', 'Clear targets, clear limits, unlimited time. Pass at your own pace.'],
            ].map(([icon, title, desc], i) => (
              <motion.div
                key={icon}
                className="card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: [0.19, 1, 0.22, 1] }}
                style={{ position: 'relative', overflow: 'hidden' }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'var(--grad)', opacity: 0.8 }} />
                <div className="label" style={{ marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.12em' }}>{icon.toUpperCase()}</div>
                <h3 style={{ marginBottom: 10, fontSize: 18 }}>{title}</h3>
                <p className="body-sm" style={{ color: 'var(--muted)' }}>{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — improved with premium visual language */}
      <section style={{ paddingTop: 80, paddingBottom: 80, zIndex: 1, position: 'relative' }}>
        <div className="wrap">
          <motion.div className="sec-head" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "0px 0px -10% 0px" }} transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}>
            <h2>How it works</h2>
            <p className="body-muted">Three steps from evaluation to funded trading.</p>
          </motion.div>
        </div>
        <div className="grid3" style={{ gap: '24px' }}>
          {[
            ['01', 'Choose Challenge', 'Pick your evaluation size (₹2L–₹10L) and step type (1-step or 2-step). Same transparent rules for every path.'],
            ['02', 'Prove Your Edge', 'Trade our live NIFTY & BANKNIFTY options terminal. Hit the profit target, respect the risk limits. Unlimited time to pass.'],
            ['03', 'Get Funded', 'Complete KYC, receive your funded simulated account. Request payouts after 5 trading days — processed within 24 hours.'],
          ].map(([num, title, desc], i) => (
            <motion.div
              key={num}
              className="card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "0px 0px -10% 0px" }}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.1, ease: [0.19, 1, 0.22, 1] }}
              style={{ position: 'relative', minHeight: '280px', display: 'flex', flexDirection: 'column' }}
            >
              <div className="label" style={{ marginBottom: 8, fontSize: 11 }}>{num}</div>
              <div style={{ fontSize: 56, fontWeight: 800, fontFamily: 'Unbounded, Manrope, sans-serif', color: 'var(--brand)', opacity: 0.12, lineHeight: 1, marginBottom: 16 }}>{num}</div>
              <h3 style={{ marginBottom: 12, fontSize: 20 }}>{title}</h3>
              <p className="body-sm" style={{ color: 'var(--muted)', flex: 1 }}>{desc}</p>
              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: '24px', height: '2px', background: 'var(--grad)', borderRadius: '1px' }} />
                <span className="label-muted" style={{ fontSize: 11 }}>STEP {num}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* PAYOUT ACTIVITY FEED */}
      <section style={{ paddingTop: 80, paddingBottom: 80, zIndex: 1, position: 'relative' }}>
        <div className="wrap" style={{ maxWidth: 1000 }}>
          <motion.div className="sec-head" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "0px 0px -10% 0px" }} transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}>
            <h2>Recent payout activity</h2>
            <p className="body-muted">Real traders getting paid. Sample data shown — connect your backend for live feed.</p>
          </motion.div>
          <PayoutFeed />
        </div>
      </section>

      {/* LEGAL DOCUMENTS — links to the in-app working drafts (Batch 18/23).
          No fabricated corporate/regulatory certificates. */}
      <section style={{ paddingTop: 80, paddingBottom: 80, zIndex: 1, position: 'relative' }}>
        <div className="wrap" style={{ maxWidth: 1000 }}>
          <motion.div className="sec-head" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "0px 0px -10% 0px" }} transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}>
            <h2>Our terms and policies</h2>
            <p className="body-muted">The legal documents that govern using FundedDesk. These are working drafts under review. Corporate and regulatory documents will be published here once the operating entity is finalised.</p>
          </motion.div>
          <DocumentsSection />
        </div>
      </section>

      {/* MARKET TICKER */}
      <section style={{ paddingTop: 40, paddingBottom: 40, borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'rgba(34,197,139,0.02)' }}>
        <MarketTicker />
      </section>

      {/* TESTIMONIALS (sample-labeled) */}
      <section style={{ paddingTop: 80, paddingBottom: 80 }}>
        <div className="wrap">
          <motion.div className="sec-head" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "0px 0px -10% 0px" }} transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}>
            <h2>Traders who read the rules first</h2>
          </motion.div>
          <div className="grid3">
            {[
              ['RS', 'Rohan S. · Jaipur', 'Pehli baar kisi platform ne breach par exact timestamp aur equity snapshot diya — maine khud verify kiya. Yahi transparency chahiye thi.'],
              ['PK', 'Priya K. · Mumbai', 'The live drawdown meter changed how I manage risk. I always know my distance from the limit before I take a trade.'],
              ['AM', 'Arjun M. · Indore', 'Support replied in Hindi at 11pm and fixed my KYC in one go. Reward hit my bank the next morning.'],
            ].map(([av, who, txt], i) => (
              <motion.div
                key={av}
                className="card"
                initial={{ opacity: 0, scale: 0.96, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                transition={{ duration: 0.6, delay: 0.1 + i * 0.1, ease: [0.19, 1, 0.22, 1] }}
              >
                <div className="label" style={{ color: 'var(--gold)', marginBottom: 12 }}>★★★★★</div>
                <p className="body" style={{ fontSize: 15, marginBottom: 18 }}>&ldquo;{txt}&rdquo;</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, color: 'var(--fg-accent)', fontFamily: 'Manrope, sans-serif' }}>{av}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{who}</div>
                    <div className="label-muted" style={{ fontSize: 11 }}>Sample testimonial (prototype)</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section style={{ paddingTop: 80, paddingBottom: 80 }}>
        <div className="wrap">
          <motion.div
            className="ctaband"
            style={{ textAlign: 'center', padding: 64, borderRadius: 'var(--r-lg)' }}
            initial={{ opacity: 0, scale: 0.98, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -10% 0px" }}
            transition={{ duration: 0.6, ease: [0.19, 1, 0.22, 1] }}
          >
            <motion.h2 style={{ marginBottom: 16 }}>
              Ready when the rules are this clear?
            </motion.h2>
            <motion.p className="body" style={{ marginBottom: 40, maxWidth: 560, margin: '0 auto 40px' }}>
              Create your free account, read every rule, then pick your size.
            </motion.p>
            <motion.div
              style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.26, ease: [0.19, 1, 0.22, 1] }}
            >
              <Link className="btn btn-primary btn-lg" href="/signup">Get Funded →</Link>
              <Link className="btn btn-secondary btn-lg" href="/india">See the Live Terminal</Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="foot" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)', padding: '64px 0 32px', marginTop: 0 }}>
        <div className="wrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '48px', marginBottom: '48px' }}>
            <div style={{ maxWidth: '320px' }}>
              <div className="logo" style={{ marginBottom: '16px' }}><span className="logo-mark">◆</span>FundedDesk</div>
              <p className="body-sm" style={{ color: 'var(--muted)', lineHeight: 1.7 }}>India\'s premier options trading prop firm. Transparent rules. Fast payouts. Built for serious traders.</p>
            </div>
            <div style={{ display: 'flex', gap: '64px', flexWrap: 'wrap' }}>
              <div>
                <h4 className="label" style={{ marginBottom: '16px' }}>Product</h4>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <li><Link href="/challenges" className="body-sm" style={{ color: 'var(--text-dim)', transition: 'color var(--fast) var(--ease)' }}>Challenges</Link></li>
                  <li><Link href="/rules" className="body-sm" style={{ color: 'var(--text-dim)', transition: 'color var(--fast) var(--ease)' }}>Trading Rules</Link></li>
                  <li><Link href="/faq" className="body-sm" style={{ color: 'var(--text-dim)', transition: 'color var(--fast) var(--ease)' }}>FAQ</Link></li>
                  <li><Link href="/india" className="body-sm" style={{ color: 'var(--text-dim)', transition: 'color var(--fast) var(--ease)' }}>Live Terminal</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="label" style={{ marginBottom: '16px' }}>Company</h4>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <li><Link href="/about" className="body-sm" style={{ color: 'var(--text-dim)', transition: 'color var(--fast) var(--ease)' }}>About Us</Link></li>
                  <li><Link href="/blog" className="body-sm" style={{ color: 'var(--text-dim)', transition: 'color var(--fast) var(--ease)' }}>Blog</Link></li>
                  <li><Link href="/contact" className="body-sm" style={{ color: 'var(--text-dim)', transition: 'color var(--fast) var(--ease)' }}>Contact</Link></li>
                  <li><Link href="/careers" className="body-sm" style={{ color: 'var(--text-dim)', transition: 'color var(--fast) var(--ease)' }}>Careers</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="label" style={{ marginBottom: '16px' }}>Legal</h4>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <li><Link href="/privacy" className="body-sm" style={{ color: 'var(--text-dim)', transition: 'color var(--fast) var(--ease)' }}>Privacy Policy</Link></li>
                  <li><Link href="/terms" className="body-sm" style={{ color: 'var(--text-dim)', transition: 'color var(--fast) var(--ease)' }}>Terms of Service</Link></li>
                  <li><Link href="/disclaimer" className="body-sm" style={{ color: 'var(--text-dim)', transition: 'color var(--fast) var(--ease)' }}>Risk Disclaimer</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <p className="disc" style={{ fontSize: 12.5 }}>© {new Date().getFullYear()} FundedDesk. All rights reserved.</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span className="label-muted" style={{ fontSize: 11 }}>Trading involves risk. Past performance ≠ future results.</span>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', transition: 'color var(--fast) var(--ease)' }}>Twitter</a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', transition: 'color var(--fast) var(--ease)' }}>LinkedIn</a>
                <a href="https://discord.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--muted)', transition: 'color var(--fast) var(--ease)' }}>Discord</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}