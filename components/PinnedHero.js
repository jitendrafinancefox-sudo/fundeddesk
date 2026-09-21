'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import HeroSequence from './HeroSequence';
import Link from 'next/link';

function HeroCounter({ prefix = '', value, suffix = '', duration = 1300 }) {
  const [n, setN] = useState(0);
  const [mounted, setMounted] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    setMounted(true);
    let raf, start, started = false;
    function run(ts) {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(run);
    }
    const el = ref.current;
    if (typeof IntersectionObserver !== 'undefined') {
      const io = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !started) { started = true; raf = requestAnimationFrame(run); io.disconnect(); }
      }, { threshold: 0.4 });
      if (el) io.observe(el);
      return () => { if (raf) cancelAnimationFrame(raf); io.disconnect(); };
    }
  }, [value, duration]);
  if (!mounted) return <span ref={ref}>{prefix}{value}{suffix}</span>;
  return <span ref={ref}>{prefix}{n}{suffix}</span>;
}

const ANNOUNCE = [
  '🚀 Working Model 2.0 — Live Indian Options Terminal',
  '📜 Every rule public. Zero hidden conditions.',
  '⚡ Payouts processed within 24 hours',
];

export default function PinnedHero({ onComplete }) {
  const wrapRef = useRef(null);
  const [progress, setProgress] = useState(0);
  const [fallback, setFallback] = useState(true);
  const [ann, setAnn] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setFallback(reduce || window.innerWidth < 860);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setAnn((a) => (a + 1) % ANNOUNCE.length), 3500);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (fallback) return;
    function onScroll() {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      setProgress(p);
      if (p >= 1 && onComplete) onComplete();
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [fallback, onComplete]);

  // Scroll progress milestones for content reveal
  const showBadge = progress > 0.05;
  const showHeadline = progress > 0.15;
  const showSubhead = progress > 0.3;
  const showCTAs = progress > 0.45;
  const showStats = progress > 0.6;

  if (fallback) {
    return (
      <section style={{ minHeight: '100vh', padding: '60px 0' }}>
        <div className="wrap" style={{ textAlign: 'center' }}>
          <span className="pill" style={{ color: '#22C58B', background: 'rgba(34,197,139,.1)', borderColor: 'rgba(34,197,139,.3)' }}>
            🇮🇳 Built for Indian traders · Options · Simulated capital
          </span>
          <h1 style={{ fontWeight: 800, maxWidth: 980, margin: '0 auto 20px', fontSize: 'clamp(30px,4.4vw,54px)', lineHeight: 1.14, fontFamily: "'Unbounded','Manrope',sans-serif", letterSpacing: '-.01em' }}>
            Prove Your Skill. <br />
            <span className="grad-text">Trade Our Capital.</span>
          </h1>
          <p className="muted" style={{ fontSize: 18, maxWidth: 580, margin: '0 auto 32px' }}>
            Pass a transparent evaluation on our simulated NIFTY & BANKNIFTY options terminal.
            Keep up to 90% of the rewards — with every rule published before you pay.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="btn btn-grad" href="/challenges" style={{ background: 'linear-gradient(96deg,#16C784,#0E9F68)', boxShadow: '0 6px 24px rgba(34,197,139,.35)' }}>Buy Challenge →</Link>
            <Link className="btn btn-line" href="/rules">Read the Rulebook</Link>
          </div>
          <div className="hm-row num" style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', marginTop: 52 }}>
            <div className="hm"><div className="v"><HeroCounter prefix="₹" value={50} suffix="L" /></div><div className="k">Max account size</div></div>
            <div className="hm"><div className="v grad-text"><HeroCounter value={90} suffix="%" /></div><div className="k">Top reward split</div></div>
            <div className="hm"><div className="v"><HeroCounter value={24} suffix="h" /></div><div className="k">Payout processing</div></div>
            <div className="hm"><div className="v"><HeroCounter value={0} /></div><div className="k">Hidden rules</div></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div ref={wrapRef} style={{ height: '350vh', position: 'relative' }}>
      <div style={{ position: 'sticky', top: 0, height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="wrap" style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
          {/* HeroSequence as background */}
          <HeroSequence progress={progress} />

          {/* Hero content - revealed based on scroll progress */}
          <motion.span
            className="pill"
            style={{ color: '#22C58B', background: 'rgba(34,197,139,.15)', borderColor: 'rgba(34,197,139,.4)', zIndex: 3 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: showBadge ? 1 : 0, y: showBadge ? 0 : 10 }}
            transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
          >
            🇮🇳 Built for Indian traders · Options · Simulated capital
          </motion.span>

          <motion.h1
            style={{
              fontWeight: 800,
              maxWidth: 980,
              margin: '0 auto 20px',
              fontSize: 'clamp(30px,4.4vw,54px)',
              lineHeight: 1.14,
              fontFamily: "'Unbounded','Manrope',sans-serif",
              letterSpacing: '-.01em',
              color: '#F2FAF5',
              zIndex: 3,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: showHeadline ? 1 : 0, y: showHeadline ? 0 : 20 }}
            transition={{ duration: 0.7, ease: [0.19, 1, 0.22, 1] }}
          >
            {"Prove Your Skill.".split(' ').map((w, i) => (
              <span key={'a' + i} style={{ display: 'inline-block' }}>{w}&nbsp;</span>
            ))}
            <br />
            {"Trade Our Capital.".split(' ').map((w, i) => (
              <span key={'b' + i} className="grad-text" style={{ display: 'inline-block' }}>{w}&nbsp;</span>
            ))}
          </motion.h1>

          <motion.p
            className="muted"
            style={{ fontSize: 18, maxWidth: 580, margin: '0 auto 32px', color: '#A6BBAF', zIndex: 3 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: showSubhead ? 1 : 0, y: showSubhead ? 0 : 16 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.19, 1, 0.22, 1] }}
          >
            Pass a transparent evaluation on our simulated NIFTY & BANKNIFTY options terminal.
            Keep up to 90% of the rewards — with every rule published before you pay.
          </motion.p>

          <motion.div
            style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', zIndex: 3 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: showCTAs ? 1 : 0, y: showCTAs ? 0 : 16 }}
            transition={{ duration: 0.5, delay: 0.2, ease: [0.19, 1, 0.22, 1] }}
          >
            <Link className="btn btn-grad" href="/challenges" style={{ background: 'linear-gradient(96deg,#16C784,#0E9F68)', boxShadow: '0 6px 24px rgba(34,197,139,.35)' }}>Buy Challenge →</Link>
            <Link className="btn btn-line" href="/rules">Read the Rulebook</Link>
          </motion.div>

          <motion.div
            className="hm-row num"
            style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', marginTop: 52, zIndex: 3 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: showStats ? 1 : 0, y: showStats ? 0 : 20 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.19, 1, 0.22, 1] }}
          >
            <div className="hm"><div className="v"><HeroCounter prefix="₹" value={50} suffix="L" /></div><div className="k">Max account size</div></div>
            <div className="hm"><div className="v grad-text"><HeroCounter value={90} suffix="%" /></div><div className="k">Top reward split</div></div>
            <div className="hm"><div className="v"><HeroCounter value={24} suffix="h" /></div><div className="k">Payout processing</div></div>
            <div className="hm"><div className="v"><HeroCounter value={0} /></div><div className="k">Hidden rules</div></div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            style={{ position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)', zIndex: 3 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: progress > 0.8 ? 1 : 0, y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22C58B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M19 12l-7 7-7-7"/>
            </svg>
          </motion.div>
        </div>
      </div>
    </div>
  );
}