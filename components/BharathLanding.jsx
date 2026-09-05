'use client';

import React, { useState, useEffect, useRef, useMemo, memo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ChevronDown,
  X,
  TrendingUp,
  TrendingDown,
  Shield,
  Activity,
  Zap,
  BarChart2,
  Award,
  FileText,
  Headphones,
  Sliders,
  Send,
  MessageCircle,
  Phone,
  Mail,
  Menu,
  CheckCircle2,
  Info,
  Layers,
} from 'lucide-react';

/* ==========================================================================
   SELF-CONTAINED CSS SPECIFICATION
   Directly matching landing-BTjvuT6y.css from bharathfundedtrader.com
   ========================================================================== */
const BFT_PAGE_CSS = `
:root {
  --bft-bg-white: #FFFFFF;
  --bft-bg-light: #FAFBFD;
  --bft-bg-dark: #0C0C1D;
  --bft-bg-dark-card: #141428;
  --bft-blue: #2B4EFF;
  --bft-blue-hover: #4B6AFF;
  --bft-blue-glow: rgba(43,78,255,0.15);
  --bft-text-dark: #0D0F1A;
  --bft-text-gray: #6B7080;
  --bft-text-muted: #9AA0B4;
  --bft-border-light: #E8EAF0;
  --bft-border-dark: rgba(255,255,255,0.08);
}

.bft-page {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #FFFFFF !important;
  color: #0D0F1A;
  overflow-x: hidden;
  position: relative;
  width: 100%;
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
}

.bft-container {
  max-width: 1160px;
  margin: 0 auto;
  padding: 0 24px;
  width: 100%;
  box-sizing: border-box;
}

.bft-heading-xl {
  font-family: 'Manrope', sans-serif;
  font-size: clamp(2.5rem, 5.5vw, 4.5rem);
  font-weight: 800;
  line-height: 1.08;
  letter-spacing: -0.03em;
  color: #0D0F1A;
}

.bft-heading-lg {
  font-family: 'Manrope', sans-serif;
  font-size: clamp(2rem, 4vw, 3.25rem);
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: #0D0F1A;
}

.bft-blue-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #2B4EFF;
  color: #FFFFFF !important;
  font-weight: 600;
  font-size: 14px;
  border-radius: 9999px;
  padding: 14px 32px;
  border: none;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 6px 20px rgba(43,78,255,0.3);
  text-decoration: none;
}
.bft-blue-btn:hover {
  background: #4B6AFF;
  box-shadow: 0 8px 28px rgba(43,78,255,0.45);
  transform: translateY(-1px);
}

.bft-outline-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #FFFFFF;
  color: #0D0F1A !important;
  font-weight: 600;
  font-size: 14px;
  border-radius: 9999px;
  padding: 14px 32px;
  border: 1px solid #E8EAF0;
  cursor: pointer;
  transition: all 0.25s ease;
  text-decoration: none;
}
.bft-outline-btn:hover {
  border-color: #2B4EFF;
  color: #2B4EFF !important;
  transform: translateY(-1px);
}

@keyframes grid-drift {
  from { background-position: 0 0, 0 0; }
  to { background-position: 40px 40px, 40px 40px; }
}

@keyframes marquee-smooth {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@keyframes ping-fab {
  0% { transform: scale(1); opacity: 0.6; }
  75%, 100% { transform: scale(1.75); opacity: 0; }
}

.bft-marquee-track {
  display: flex;
  width: max-content;
  animation: marquee-smooth 45s linear infinite;
}
.bft-marquee-track:hover {
  animation-play-state: paused;
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
`;

/* ==========================================================================
   DRIFTING GRID & FLASHLIGHT MOUSE SPOTLIGHT (HERO)
   ========================================================================== */
function GridBackground() {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (window.matchMedia('(max-width: 768px)').matches) return;

    let frame = 0;
    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (!frame) {
        frame = requestAnimationFrame(() => {
          el.style.setProperty('--mx', `${x}px`);
          el.style.setProperty('--my', `${y}px`);
          frame = 0;
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        '--mx': '50%',
        '--my': '50%',
      }}
    >
      {/* Drifting Grid Base */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(to right, rgba(43,78,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(43,78,255,0.08) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          animation: 'grid-drift 30s linear infinite',
        }}
      />
      {/* Mouse Flashlight Mask */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(to right, rgba(43,78,255,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(43,78,255,0.35) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          WebkitMaskImage: 'radial-gradient(420px circle at var(--mx) var(--my), black 0%, transparent 70%)',
          maskImage: 'radial-gradient(420px circle at var(--mx) var(--my), black 0%, transparent 70%)',
        }}
      />
      {/* Ambient Gradient Orbs */}
      <div
        style={{
          position: 'absolute',
          right: '-12%',
          top: '-20%',
          width: '65%',
          height: '65%',
          background: 'radial-gradient(circle, rgba(255,140,50,0.10) 0%, transparent 65%)',
          transform: 'translateZ(0)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '-10%',
          bottom: '-15%',
          width: '60%',
          height: '60%',
          background: 'radial-gradient(circle, rgba(43,78,255,0.11) 0%, transparent 65%)',
          transform: 'translateZ(0)',
        }}
      />
    </div>
  );
}

/* ==========================================================================
   LIVE INDIAN INDICES TICKER MARQUEE
   ========================================================================== */
const TICKER_DATA = [
  { symbol: 'NIFTY 50', base: 22456.8 },
  { symbol: 'BANKNIFTY', base: 48320.5 },
  { symbol: 'SENSEX', base: 73852.4 },
  { symbol: 'NIFTY CE', base: 245.6, prefix: '₹' },
  { symbol: 'NIFTY PE', base: 182.3, prefix: '₹' },
  { symbol: 'BANKNIFTY CE', base: 312.8, prefix: '₹' },
  { symbol: 'BANKNIFTY PE', base: 198.4, prefix: '₹' },
  { symbol: 'SENSEX FUT', base: 73910.0 },
];

function calcTickerItem(item) {
  const range = item.base > 1000 ? 0.0018 : 0.007;
  const delta = (Math.random() - 0.48) * range * item.base;
  const newPrice = item.base + delta;
  const pct = (delta / item.base) * 100;
  return {
    symbol: item.symbol,
    price: (item.prefix || '') + newPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    change: (pct >= 0 ? '+' : '') + pct.toFixed(2) + '%',
    up: pct >= 0,
  };
}

const LiveTicker = memo(function LiveTicker() {
  const [items, setItems] = useState(() => TICKER_DATA.map(calcTickerItem));

  useEffect(() => {
    const t = setInterval(() => {
      setItems(TICKER_DATA.map((s) => {
        s.base += (Math.random() - 0.48) * s.base * 0.0003;
        return calcTickerItem(s);
      }));
    }, 3800);
    return () => clearInterval(t);
  }, []);

  const doubleItems = [...items, ...items];

  return (
    <div
      style={{
        borderTop: '1px solid #E8EAF0',
        borderBottom: '1px solid #E8EAF0',
        background: '#FAFBFD',
        overflow: 'hidden',
        padding: '12px 0',
        position: 'relative',
        zIndex: 2,
      }}
    >
      <div className="bft-marquee-track">
        {doubleItems.map((s, idx) => (
          <div
            key={idx}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              marginRight: '36px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontWeight: 700, color: '#0D0F1A' }}>{s.symbol}</span>
            <span style={{ color: '#6B7080', fontVariantNumeric: 'tabular-nums' }}>{s.price}</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                color: s.up ? '#10B981' : '#EF4444',
              }}
            >
              {s.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {s.change}
            </span>
            <span style={{ color: '#E8EAF0', marginLeft: '12px' }}>|</span>
          </div>
        ))}
      </div>
    </div>
  );
});

/* ==========================================================================
   PRICING DATA MODELS
   ========================================================================== */
const TIERS_DATA = {
  Instant: {
    name: 'Instant',
    label: 'Instant',
    description: 'Skip the evaluation. Pay the fee, get your account. Simple.',
    rules: {
      profitTargetInstantPercent: null,
      maxDailyDrawdownPercent: 3,
      maxOverallDrawdownPercent: 6,
      maxOneDayProfitPercentOfTarget: null,
      profitSplitPercent: 80,
      tradingDaysRequired: 0,
      withdrawalFrequencyDays: 14,
    },
    phases: ['Live Funded Account'],
    tiers: [
      { fundSize: 50000, fee: 2999, popular: false },
      { fundSize: 100000, fee: 4999, popular: false },
      { fundSize: 200000, fee: 8999, popular: false },
      { fundSize: 500000, fee: 18999, popular: false },
      { fundSize: 1000000, fee: 34999, popular: true },
      { fundSize: 2500000, fee: 79999, popular: false },
      { fundSize: 5000000, fee: 149999, popular: false },
    ],
  },
  '1-Step': {
    name: '1-Step',
    label: '1 Step',
    description: "One evaluation phase. Hit the target without breaking the rules and you're funded. Most people pick this one.",
    rules: {
      profitTargetPhase1Percent: 10,
      maxDailyDrawdownPercent: 4,
      maxOverallDrawdownPercent: 6,
      maxOneDayProfitPercentOfTarget: 40,
      profitSplitPercent: 90,
      tradingDaysRequired: 3,
      withdrawalFrequencyDays: 14,
    },
    phases: ['Phase 1: Evaluation'],
    tiers: [
      { fundSize: 50000, fee: 1499, popular: false },
      { fundSize: 100000, fee: 2499, popular: false },
      { fundSize: 200000, fee: 3899, popular: false },
      { fundSize: 500000, fee: 6499, popular: false },
      { fundSize: 1000000, fee: 11999, popular: true },
      { fundSize: 2500000, fee: 26999, popular: false },
      { fundSize: 5000000, fee: 49999, popular: false },
    ],
  },
  '2-Step': {
    name: '2-Step',
    label: '2 Step',
    description: 'Two phases, lowest cost. Built for people who want to prove themselves without paying upfront for instant access.',
    rules: {
      profitTargetPhase1Percent: 8,
      profitTargetPhase2Percent: 5,
      maxDailyDrawdownPercent: 5,
      maxOverallDrawdownPercent: 10,
      maxOneDayProfitPercentOfTarget: 50,
      profitSplitPercent: 100,
      tradingDaysRequired: 5,
      withdrawalFrequencyDays: 14,
    },
    phases: ['Phase 1: Qualifier', 'Phase 2: Validator'],
    tiers: [
      { fundSize: 50000, fee: 999, popular: false },
      { fundSize: 100000, fee: 1799, popular: false },
      { fundSize: 200000, fee: 2999, popular: false },
      { fundSize: 500000, fee: 4999, popular: false },
      { fundSize: 1000000, fee: 8999, popular: true },
      { fundSize: 2500000, fee: 19999, popular: false },
      { fundSize: 5000000, fee: 37999, popular: false },
    ],
  },
};

function formatFundSizeShort(s) {
  if (s >= 10000000) return `${(s / 10000000).toFixed(0)}Cr`;
  if (s >= 100000) return `${(s / 100000).toFixed(0)}L`;
  if (s >= 1000) return `${(s / 1000).toFixed(0)}K`;
  return s.toLocaleString('en-IN');
}

function inrFormat(num) {
  return '₹' + Math.round(Number(num) || 0).toLocaleString('en-IN');
}

function StatBox({ label, value, sub, tone = 'default' }) {
  const color = tone === 'danger' ? '#D93A47' : tone === 'good' ? '#0F9D58' : '#0D0F1A';
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8EAF0',
        borderRadius: '12px',
        padding: '10px 14px',
      }}
    >
      <p
        style={{
          fontSize: '10px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#9AA0B4',
          marginBottom: '4px',
          lineHeight: 1.2,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: '15px',
          fontWeight: 800,
          lineHeight: 1,
          color: color,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: '10px', color: '#9AA0B4', marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function SpecRow({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid #E8EAF0',
      }}
    >
      <span style={{ fontSize: '13px', color: '#6B7080' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 700, color: '#0D0F1A', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}

/* ==========================================================================
   WHY CHOOSE US LIST
   ========================================================================== */
const WHY_CHOOSE_ITEMS = [
  {
    icon: Activity,
    title: 'Live Market Data',
    desc: 'Real-time NIFTY & BANKNIFTY feeds with fast tick updates inside a clean market terminal.',
  },
  {
    icon: Shield,
    title: 'Built-in Risk Rules',
    desc: 'Max Daily Loss and Max Drawdown enforced automatically — discipline by design.',
  },
  {
    icon: Zap,
    title: 'Instant Order Execution',
    desc: 'Fast simulated order execution with live PnL tracking and open position monitoring.',
  },
  {
    icon: Award,
    title: 'India-First Platform',
    desc: 'INR payments, Indian market hours, and instruments designed for Indian index people.',
  },
  {
    icon: BarChart2,
    title: 'Performance Analytics',
    desc: 'Daily session reports, behavior tracking, and consistency scores to help you improve.',
  },
  {
    icon: FileText,
    title: 'Transparent Payouts',
    desc: 'Clear reward eligibility, public proof of payouts, and no hidden conditions.',
  },
  {
    icon: Layers,
    title: 'Multiple Evaluation Plans',
    desc: '1-Step and 2-Step evaluation options designed for different learning styles.',
  },
  {
    icon: Headphones,
    title: 'Dedicated Support',
    desc: 'Expert assistance available via chat and email for all your queries.',
  },
  {
    icon: Sliders,
    title: 'Structured Rules',
    desc: 'Clear profit targets, drawdown limits, and intraday square-off rules for every plan.',
  },
];

/* ==========================================================================
   MAIN EXPORT COMPONENT
   ========================================================================== */
export default function BharathLanding() {
  const [showBanner, setShowBanner] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Pricing Model & Tier
  const [model, setModel] = useState('2-Step');
  const [tierIdx, setTierIdx] = useState(4); // default ₹10 Lakh

  // FAQ Accordion
  const [openFaq, setOpenFaq] = useState(0);

  // Contact Form
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [contactSent, setContactSent] = useState(false);

  // Scroll listener
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const currentModelData = TIERS_DATA[model] || TIERS_DATA['2-Step'];
  const currentTier = currentModelData.tiers[tierIdx] || currentModelData.tiers[0];
  const fundSize = currentTier.fundSize;
  const originalFee = currentTier.fee;
  const discountedFee = Math.round(originalFee * 0.9); // 10% OFF with WELCOME10

  const targets = useMemo(() => {
    const rules = currentModelData.rules;
    if (model === 'Instant') {
      return [
        {
          name: 'Live Funded Account',
          targetPct: null,
          targetAmt: null,
          dailyPct: rules.maxDailyDrawdownPercent,
          dailyAmt: (rules.maxDailyDrawdownPercent * fundSize) / 100,
          maxPct: rules.maxOverallDrawdownPercent,
          maxAmt: (rules.maxOverallDrawdownPercent * fundSize) / 100,
          oneDayAmt: null,
        },
      ];
    }
    if (model === '1-Step') {
      const tPct = rules.profitTargetPhase1Percent;
      const tAmt = (tPct * fundSize) / 100;
      const oneDayPct = rules.maxOneDayProfitPercentOfTarget;
      return [
        {
          name: 'Phase 1: Evaluation',
          targetPct: tPct,
          targetAmt: tAmt,
          dailyPct: rules.maxDailyDrawdownPercent,
          dailyAmt: (rules.maxDailyDrawdownPercent * fundSize) / 100,
          maxPct: rules.maxOverallDrawdownPercent,
          maxAmt: (rules.maxOverallDrawdownPercent * fundSize) / 100,
          oneDayPct: oneDayPct,
          oneDayAmt: (oneDayPct * tAmt) / 100,
        },
      ];
    }
    // 2-Step
    const p1Pct = rules.profitTargetPhase1Percent;
    const p1Amt = (p1Pct * fundSize) / 100;
    const p2Pct = rules.profitTargetPhase2Percent;
    const p2Amt = (p2Pct * fundSize) / 100;
    const oneDayPct = rules.maxOneDayProfitPercentOfTarget;
    return [
      {
        name: 'Phase 1: Qualifier',
        targetPct: p1Pct,
        targetAmt: p1Amt,
        dailyPct: rules.maxDailyDrawdownPercent,
        dailyAmt: (rules.maxDailyDrawdownPercent * fundSize) / 100,
        maxPct: rules.maxOverallDrawdownPercent,
        maxAmt: (rules.maxOverallDrawdownPercent * fundSize) / 100,
        oneDayPct: oneDayPct,
        oneDayAmt: (oneDayPct * p1Amt) / 100,
      },
      {
        name: 'Phase 2: Validator',
        targetPct: p2Pct,
        targetAmt: p2Amt,
        dailyPct: rules.maxDailyDrawdownPercent,
        dailyAmt: (rules.maxDailyDrawdownPercent * fundSize) / 100,
        maxPct: rules.maxOverallDrawdownPercent,
        maxAmt: (rules.maxOverallDrawdownPercent * fundSize) / 100,
        oneDayPct: oneDayPct,
        oneDayAmt: (oneDayPct * p2Amt) / 100,
      },
    ];
  }, [model, currentModelData, fundSize]);

  return (
    <div className="bft-page">
      <style dangerouslySetInnerHTML={{ __html: BFT_PAGE_CSS }} />

      {/* 1. TOP ANNOUNCEMENT BANNER */}
      {showBanner && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 70,
            background: '#2B4EFF',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 500,
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
            <span>🎉 Get 10% OFF on all Challenges (first-time users) — use code</span>
            <span
              style={{
                background: '#FFFFFF',
                color: '#2B4EFF',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '4px',
                letterSpacing: '0.05em',
                fontSize: '11px',
              }}
            >
              WELCOME10
            </span>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            aria-label="Close banner"
            style={{
              position: 'absolute',
              right: '16px',
              color: 'rgba(255,255,255,0.85)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2. HEADER / NAVBAR */}
      <header
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          top: showBanner ? '38px' : '0px',
          zIndex: 60,
          transition: 'all 0.3s ease',
          background: scrolled ? 'rgba(255,255,255,0.96)' : 'transparent',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          boxShadow: scrolled ? '0 1px 0 #E8EAF0, 0 4px 20px rgba(0,0,0,0.03)' : 'none',
        }}
      >
        <div
          className="bft-container"
          style={{
            height: '72px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          {/* Brand Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #2B4EFF 0%, #0C1E5B 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(43,78,255,0.3)',
              }}
            >
              <span style={{ color: '#FFFFFF', fontWeight: 900, fontSize: '18px', fontFamily: 'Manrope, sans-serif' }}>
                B
              </span>
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'Manrope, sans-serif',
                  fontWeight: 800,
                  fontSize: '17px',
                  color: '#0D0F1A',
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                }}
              >
                Bharath Funded Trader
              </div>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#2B4EFF', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                India&apos;s #1 Prop Firm
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '24px',
            }}
            className="lg-flex-nav"
          >
            <style>{`@media (min-width: 1024px) { .lg-flex-nav { display: flex !important; } }`}</style>
            {[
              { label: 'Home', href: '#home' },
              { label: 'How it works', href: '#account' },
              { label: 'Challenges', href: '#pricing' },
              { label: 'Instruments', href: '#markets' },
              { label: 'Pricing', href: '#pricing' },
              { label: 'FAQ', href: '#faq' },
              { label: 'Why Us', href: '#tools' },
              { label: 'Contact', href: '#contact' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: link.label === 'Home' ? '#2B4EFF' : '#0D0F1A',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#2B4EFF')}
                onMouseLeave={(e) => (e.currentTarget.style.color = link.label === 'Home' ? '#2B4EFF' : '#0D0F1A')}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              href="/login"
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#0D0F1A',
                textDecoration: 'none',
                padding: '8px 14px',
              }}
            >
              Login
            </Link>
            <Link
              href="#pricing"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 22px',
                borderRadius: '9999px',
                border: '2px solid #2B4EFF',
                color: '#2B4EFF',
                fontSize: '14px',
                fontWeight: 700,
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2B4EFF';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#2B4EFF';
              }}
            >
              Get Started <ArrowRight size={14} />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                background: 'none',
                border: 'none',
                color: '#0D0F1A',
                cursor: 'pointer',
              }}
              className="lg-hide-btn"
            >
              <style>{`@media (min-width: 1024px) { .lg-hide-btn { display: none !important; } }`}</style>
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div
            style={{
              background: '#FFFFFF',
              borderTop: '1px solid #E8EAF0',
              boxShadow: '0 12px 30px rgba(0,0,0,0.1)',
              padding: '20px 24px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { label: 'Home', href: '#home' },
                { label: 'How it works', href: '#account' },
                { label: 'Challenges', href: '#pricing' },
                { label: 'Instruments', href: '#markets' },
                { label: 'Pricing', href: '#pricing' },
                { label: 'FAQ', href: '#faq' },
                { label: 'Contact', href: '#contact' },
              ].map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: '#0D0F1A',
                    textDecoration: 'none',
                    padding: '8px 0',
                    borderBottom: '1px solid #E8EAF0',
                  }}
                >
                  {item.label}
                </a>
              ))}
              <div style={{ display: 'flex', gap: '12px', paddingTop: '10px' }}>
                <Link
                  href="/login"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '12px',
                    borderRadius: '9999px',
                    border: '1px solid #E8EAF0',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#0D0F1A',
                    textDecoration: 'none',
                  }}
                >
                  Login
                </Link>
                <Link
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '12px',
                    borderRadius: '9999px',
                    background: '#2B4EFF',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 3. HERO SECTION */}
      <section
        id="home"
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: '#FFFFFF',
          paddingTop: showBanner ? '150px' : '120px',
          paddingBottom: '80px',
        }}
      >
        <GridBackground />

        <div className="bft-container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ marginBottom: '20px' }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: '13px',
                fontWeight: 700,
                color: '#2B4EFF',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                background: 'rgba(43,78,255,0.08)',
                padding: '6px 18px',
                borderRadius: '9999px',
                border: '1px solid rgba(43,78,255,0.15)',
              }}
            >
              India&apos;s #1 Prop Firm
            </span>
          </div>

          <h1 className="bft-heading-xl" style={{ maxWidth: '900px', margin: '0 auto 24px' }}>
            India Ka Apna <span style={{ color: '#2B4EFF' }}>Funded</span>
            <br />
            <span style={{ color: '#2B4EFF' }}>Evaluation</span> Platform
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 1.8vw, 1.15rem)',
              color: '#6B7080',
              maxWidth: '680px',
              margin: '0 auto 36px',
              lineHeight: 1.7,
              fontWeight: 400,
            }}
          >
            Show your skills in NIFTY, BANKNIFTY & SENSEX in a structured simulated evaluation. Pass the challenge,
            follow risk rules, and earn real performance rewards.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              marginBottom: '48px',
            }}
          >
            <a href="#pricing" className="bft-blue-btn">
              Explore Plans <ArrowRight size={16} />
            </a>
            <Link href="/login" className="bft-outline-btn">
              Free Trial
            </Link>
          </div>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '28px',
              color: '#6B7080',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} color="#2B4EFF" /> 100% Direct INR Payouts
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} color="#2B4EFF" /> Live Simulated NSE Terminal
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} color="#2B4EFF" /> Zero Hidden Profit Limits
            </span>
          </div>
        </div>
      </section>

      {/* 4. LIVE TICKER */}
      <LiveTicker />

      {/* 5. MARKET COVERAGE */}
      <section
        id="markets"
        style={{
          background: '#FFFFFF',
          padding: '80px 0',
          borderBottom: '1px solid #E8EAF0',
        }}
      >
        <div className="bft-container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '48px',
              alignItems: 'start',
            }}
          >
            <div>
              <span
                style={{
                  display: 'inline-block',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#2B4EFF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: '12px',
                }}
              >
                Market Coverage
              </span>
              <h2 className="bft-heading-lg" style={{ marginBottom: '20px' }}>
                All Indian Indices on <span style={{ color: '#2B4EFF' }}>One Platform</span>
              </h2>
              <p
                style={{
                  fontSize: '16px',
                  color: '#6B7080',
                  lineHeight: 1.7,
                  marginBottom: '32px',
                }}
              >
                NIFTY, BANKNIFTY & SENSEX — all in one simulated evaluation platform. Trade standard weekly and monthly
                contracts with institutional-grade simulated liquidity.
              </p>
              <a href="#pricing" className="bft-blue-btn">
                Start Your Evaluation <ArrowRight size={16} />
              </a>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
              }}
            >
              {[
                {
                  title: 'NIFTY 50',
                  tag: 'NIFTY CE · NIFTY PE',
                  desc: 'Access NIFTY options in a simulated environment with real-time data feeds.',
                  stats: [
                    { label: 'Type', value: 'F&O' },
                    { label: 'Mode', value: 'Simulated' },
                  ],
                },
                {
                  title: 'BANKNIFTY',
                  tag: 'BANKNIFTY CE · PE',
                  desc: 'Access BANKNIFTY options with fast tick updates and live PnL tracking.',
                  stats: [
                    { label: 'Type', value: 'F&O' },
                    { label: 'Mode', value: 'Simulated' },
                  ],
                },
                {
                  title: 'SENSEX',
                  tag: 'SENSEX CE · PE',
                  desc: 'Access SENSEX options on the simulated evaluation platform.',
                  stats: [
                    { label: 'Type', value: 'F&O' },
                    { label: 'Mode', value: 'Simulated' },
                  ],
                },
                {
                  title: 'INR-Only Platform',
                  tag: '₹ INR Only',
                  desc: 'All payments, evaluations, and payouts in Indian Rupees — no FX conversion needed.',
                  stats: [
                    { label: 'Currency', value: '₹ INR' },
                    { label: 'Settlement', value: 'Direct UPI/Bank' },
                  ],
                },
              ].map((card) => (
                <div
                  key={card.title}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E8EAF0',
                    borderRadius: '20px',
                    padding: '24px',
                    boxShadow: '0 2px 16px rgba(0,0,0,0.04)',
                    transition: 'all 0.3s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        background: 'rgba(43,78,255,0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2B4EFF',
                      }}
                    >
                      <BarChart2 size={20} />
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          color: '#0D0F1A',
                          fontFamily: 'Manrope, sans-serif',
                          margin: 0,
                        }}
                      >
                        {card.title}
                      </h3>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.08em',
                          color: '#2B4EFF',
                        }}
                      >
                        {card.tag}
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '13px', color: '#6B7080', lineHeight: 1.6, marginBottom: '16px' }}>
                    {card.desc}
                  </p>
                  <div
                    style={{
                      display: 'flex',
                      gap: '24px',
                      borderTop: '1px solid #E8EAF0',
                      paddingTop: '12px',
                    }}
                  >
                    {card.stats.map((st) => (
                      <div key={st.label}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0D0F1A' }}>{st.value}</div>
                        <div style={{ fontSize: '10px', color: '#9AA0B4' }}>{st.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. WHY CHOOSE US (DARK NAVY) */}
      <section
        id="tools"
        style={{
          background: '#0C0C1D',
          padding: '90px 0',
          color: '#FFFFFF',
        }}
      >
        <div className="bft-container">
          <div style={{ maxWidth: '640px', marginBottom: '56px' }}>
            <h2
              style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: 'clamp(2rem, 4vw, 3.25rem)',
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                marginBottom: '16px',
                color: '#FFFFFF',
              }}
            >
              Why Choose <span style={{ color: '#2B4EFF' }}>Bharath Funded Trader</span>
            </h2>
            <p style={{ fontSize: '17px', color: '#9AA0B4', lineHeight: 1.7, fontWeight: 300 }}>
              Everything you need to prove your market skills — built into one powerful platform.
            </p>
          </div>

          <div>
            {WHY_CHOOSE_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  style={{
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    padding: '24px 0',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '20px',
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'rgba(43,78,255,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#2B4EFF',
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={20} />
                  </div>
                  <h3
                    style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      fontFamily: 'Manrope, sans-serif',
                      color: '#FFFFFF',
                      width: '260px',
                      flexShrink: 0,
                      margin: 0,
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '14px',
                      color: '#9AA0B4',
                      lineHeight: 1.6,
                      flex: 1,
                      minWidth: '240px',
                      margin: 0,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              );
            })}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
          </div>
        </div>
      </section>

      {/* 7. PRICING & EVALUATION CONFIGURATOR */}
      <section
        id="pricing"
        style={{
          background: '#FFFFFF',
          padding: '90px 0',
        }}
      >
        <div className="bft-container">
          <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 36px' }}>
            <p
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#2B4EFF',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                marginBottom: '12px',
              }}
            >
              Pricing
            </p>
            <h2 className="bft-heading-lg" style={{ margin: 0 }}>
              Pick your <span style={{ color: '#2B4EFF' }}>Evaluation</span>
            </h2>
          </div>

          {/* Model Selector Tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                width: '100%',
                maxWidth: '540px',
                background: '#F0F2F8',
                border: '1px solid #E8EAF0',
                borderRadius: '16px',
                padding: '6px',
                gap: '6px',
              }}
            >
              {['Instant', '1-Step', '2-Step'].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setModel(m);
                    setTierIdx(4); // default 10L
                  }}
                  style={{
                    padding: '10px',
                    borderRadius: '12px',
                    textAlign: 'center',
                    border: 'none',
                    cursor: 'pointer',
                    background: model === m ? '#FFFFFF' : 'transparent',
                    boxShadow: model === m ? '0 2px 10px rgba(13,15,26,0.08)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: 700,
                      color: model === m ? '#0D0F1A' : '#6B7080',
                    }}
                  >
                    {TIERS_DATA[m].label}
                  </span>
                  <span
                    style={{
                      display: 'block',
                      fontSize: '10px',
                      fontWeight: 600,
                      color: model === m ? '#2B4EFF' : '#9AA0B4',
                      marginTop: '2px',
                    }}
                  >
                    Evaluation
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Account Size Selector Pills */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '36px' }}>
            <div
              className="no-scrollbar"
              style={{
                display: 'flex',
                width: '100%',
                maxWidth: '540px',
                overflowX: 'auto',
                background: '#F0F2F8',
                border: '1px solid #E8EAF0',
                borderRadius: '9999px',
                padding: '6px',
                gap: '4px',
              }}
            >
              {currentModelData.tiers.map((t, idx) => (
                <button
                  key={t.fundSize}
                  onClick={() => setTierIdx(idx)}
                  style={{
                    flex: 1,
                    minWidth: '68px',
                    padding: '8px 12px',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    border: 'none',
                    cursor: 'pointer',
                    background: tierIdx === idx ? '#FFFFFF' : 'transparent',
                    color: tierIdx === idx ? '#0D0F1A' : '#6B7080',
                    boxShadow: tierIdx === idx ? '0 2px 10px rgba(13,15,26,0.08)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {formatFundSizeShort(t.fundSize)}
                </button>
              ))}
            </div>
          </div>

          {/* 2-Column Configurator Box */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
              alignItems: 'start',
            }}
          >
            {/* Left: Plan Card */}
            <div
              style={{
                borderRadius: '24px',
                border: '2px solid #2B4EFF',
                background: '#FFFFFF',
                padding: '32px',
                boxShadow: '0 8px 40px rgba(43,78,255,0.12)',
              }}
            >
              {currentTier.popular && (
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      background: 'rgba(43,78,255,0.1)',
                      color: '#2B4EFF',
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '4px 14px',
                      borderRadius: '9999px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                    }}
                  >
                    Most Chosen
                  </span>
                </div>
              )}

              <p
                style={{
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: '#9AA0B4',
                  marginBottom: '10px',
                }}
              >
                {model === 'Instant' ? 'Instant Evaluation' : `${model} Evaluation`}
              </p>

              {/* Pricing with 10% Discount */}
              <div style={{ textAlign: 'center', lineHeight: 1 }}>
                <span
                  style={{
                    fontSize: '20px',
                    color: '#9AA0B4',
                    textDecoration: 'line-through',
                    marginRight: '10px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {inrFormat(originalFee)}
                </span>
                <span
                  style={{
                    fontSize: 'clamp(2rem, 5vw, 2.5rem)',
                    fontWeight: 800,
                    fontFamily: 'Manrope, sans-serif',
                    color: '#0D0F1A',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {inrFormat(discountedFee)}
                </span>
              </div>

              <p
                style={{
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#2B4EFF',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginTop: '8px',
                }}
              >
                With code WELCOME10 (10% OFF)
              </p>

              <p style={{ textAlign: 'center', fontSize: '14px', color: '#6B7080', marginTop: '10px' }}>
                for a {fundSize.toLocaleString('en-IN')} account
              </p>
              <p style={{ textAlign: 'center', fontSize: '12px', color: '#9AA0B4', marginTop: '2px' }}>
                One-time fee · 100% Refunded upon pass
              </p>

              <Link
                href={`/login?plan=${model}&tier=${fundSize}`}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '14px',
                  borderRadius: '9999px',
                  background: '#0C1E5B',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '15px',
                  textDecoration: 'none',
                  marginTop: '20px',
                  boxShadow: '0 6px 20px rgba(12,30,91,0.25)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#2B4EFF')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#0C1E5B')}
              >
                Buy Challenge
              </Link>

              <Link
                href="#tools"
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '12px',
                  borderRadius: '9999px',
                  border: '1px solid #E8EAF0',
                  color: '#0D0F1A',
                  fontWeight: 600,
                  fontSize: '14px',
                  textDecoration: 'none',
                  marginTop: '10px',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#2B4EFF';
                  e.currentTarget.style.color = '#2B4EFF';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E8EAF0';
                  e.currentTarget.style.color = '#0D0F1A';
                }}
              >
                Funded Rules
              </Link>

              <div style={{ marginTop: '24px', paddingTop: '8px' }}>
                <SpecRow label="Account Balance" value={'₹' + fundSize.toLocaleString('en-IN')} />
                <SpecRow label="Profit Split" value={`${currentModelData.rules.profitSplitPercent}%`} />
                <SpecRow label="Min Active Days" value={`${currentModelData.rules.tradingDaysRequired} Days`} />
                <SpecRow label="Evaluation Period" value="Unlimited" />
                <SpecRow label="Payout Cycle" value={`Every ${currentModelData.rules.withdrawalFrequencyDays} days`} />
              </div>
            </div>

            {/* Right: Targets Box */}
            <div
              style={{
                borderRadius: '24px',
                border: '1px solid #E8EAF0',
                background: '#FAFBFD',
                padding: '28px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '16px',
                  marginBottom: '16px',
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: '20px',
                      fontWeight: 800,
                      color: '#0D0F1A',
                      fontFamily: 'Manrope, sans-serif',
                      margin: 0,
                    }}
                  >
                    {model === 'Instant' ? 'Your Account Rules' : 'Evaluation Targets'}
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6B7080', marginTop: '6px' }}>
                    {currentModelData.description}
                  </p>
                </div>
                <span
                  style={{
                    display: 'inline-block',
                    fontSize: '11px',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#2B4EFF',
                    background: 'rgba(43,78,255,0.08)',
                    padding: '6px 14px',
                    borderRadius: '9999px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatFundSizeShort(fundSize)} Account
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                {targets.map((phase) => (
                  <div
                    key={phase.name}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E8EAF0',
                      borderRadius: '18px',
                      padding: '20px',
                    }}
                  >
                    <p style={{ fontSize: '14px', fontWeight: 800, color: '#0D0F1A', marginBottom: '14px' }}>
                      {phase.name}
                    </p>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '10px',
                      }}
                    >
                      <StatBox
                        label="Profit Target"
                        value={phase.targetPct != null ? inrFormat(phase.targetAmt) : '—'}
                        sub={phase.targetPct != null ? `${phase.targetPct}% of balance` : 'No target'}
                        tone="good"
                      />
                      <StatBox
                        label="Daily Drawdown"
                        value={phase.dailyPct != null ? inrFormat(phase.dailyAmt) : '—'}
                        sub={phase.dailyPct != null ? `${phase.dailyPct}% of balance` : undefined}
                        tone="danger"
                      />
                      <StatBox
                        label="Max Drawdown"
                        value={phase.maxPct != null ? inrFormat(phase.maxAmt) : '—'}
                        sub={phase.maxPct != null ? `${phase.maxPct}% of balance` : undefined}
                        tone="danger"
                      />
                      <StatBox
                        label="Max 1-Day Profit"
                        value={phase.oneDayAmt != null ? inrFormat(phase.oneDayAmt) : 'No limit'}
                        sub={phase.oneDayPct != null ? `${phase.oneDayPct}% of target` : undefined}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <p
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '12px',
                  color: '#6B7080',
                  marginTop: '20px',
                  lineHeight: 1.6,
                }}
              >
                <Info size={14} color="#9AA0B4" style={{ flexShrink: 0, marginTop: '2px' }} />
                All amounts are calculated on your ₹{fundSize.toLocaleString('en-IN')} starting balance. Drawdown
                limits stay the same in every phase — nothing changes once you&apos;re funded.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. TRADING PLATFORM */}
      <section
        id="platform"
        style={{
          background: '#FFFFFF',
          padding: '90px 0',
          borderTop: '1px solid #E8EAF0',
          borderBottom: '1px solid #E8EAF0',
        }}
      >
        <div className="bft-container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '56px',
              alignItems: 'center',
            }}
          >
            {/* Left: Interactive Simulated Platform Mockup */}
            <div>
              <h2 className="bft-heading-lg" style={{ marginBottom: '24px' }}>
                A Powerful Platform <span style={{ color: '#2B4EFF' }}>Built for Performance</span>
              </h2>

              <div
                style={{
                  borderRadius: '24px',
                  background: '#0C0C1D',
                  border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 16px 50px rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                  padding: '24px',
                  color: '#FFFFFF',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    paddingBottom: '14px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444' }} />
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B' }} />
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981' }} />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#9AA0B4', marginLeft: '8px' }}>
                      NIFTY 24550 CE · 1m Live Terminal
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'rgba(16,185,129,0.15)',
                      color: '#10B981',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontWeight: 700,
                    }}
                  >
                    ● Market Open
                  </span>
                </div>

                {/* Candles */}
                <div
                  style={{
                    height: '180px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '10px',
                    padding: '10px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {[45, 60, 52, 75, 88, 70, 95, 110, 105, 130, 122, 145, 160].map((h, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${h}px`,
                        background: i % 3 === 0 ? '#EF4444' : '#10B981',
                        borderRadius: '3px',
                        position: 'relative',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '-8px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '1px',
                          height: `${h + 16}px`,
                          background: i % 3 === 0 ? '#EF4444' : '#10B981',
                          zIndex: -1,
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '16px',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '11px', color: '#9AA0B4', textTransform: 'uppercase' }}>Unrealized PnL</span>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#10B981', fontVariantNumeric: 'tabular-nums' }}>
                      +₹24,850.00
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '11px', color: '#9AA0B4', textTransform: 'uppercase' }}>Drawdown Buffer</span>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#FFFFFF' }}>₹48,200 Safe</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Platform Features */}
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  background: 'rgba(43,78,255,0.08)',
                  border: '1px solid rgba(43,78,255,0.15)',
                  marginBottom: '20px',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2B4EFF' }} />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#2B4EFF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  Platform
                </span>
              </div>

              <p style={{ fontSize: '17px', color: '#6B7080', lineHeight: 1.7, marginBottom: '32px' }}>
                Access the markets anytime, anywhere with our fully integrated web and mobile platform. Monitor
                markets in real time and execute orders with precision.
              </p>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 36px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  'Real-time market data & live charts',
                  'One-click order placement',
                  'Advanced technical indicators',
                  'Portfolio tracking & P&L reports',
                  'Price alerts & push notifications',
                  'Multi-account management',
                ].map((feat) => (
                  <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'rgba(43,78,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#2B4EFF',
                        flexShrink: 0,
                      }}
                    >
                      <Check size={14} />
                    </div>
                    <span style={{ fontSize: '15px', color: '#0D0F1A', fontWeight: 500 }}>{feat}</span>
                  </li>
                ))}
              </ul>

              <a href="#pricing" className="bft-blue-btn">
                Get Started Free <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 9. PERFORMANCE REWARDS / CERTIFICATES */}
      <section
        style={{
          background: '#0C0C1D',
          padding: '90px 0',
          color: '#FFFFFF',
        }}
      >
        <div className="bft-container">
          <div style={{ textAlign: 'center', maxWidth: '650px', margin: '0 auto 48px' }}>
            <h2
              style={{
                fontFamily: 'Manrope, sans-serif',
                fontSize: 'clamp(2rem, 4vw, 3rem)',
                fontWeight: 800,
                letterSpacing: '-0.02em',
                marginBottom: '12px',
                color: '#FFFFFF',
              }}
            >
              Performance <span style={{ color: '#2B4EFF' }}>Rewards</span>
            </h2>
            <p style={{ fontSize: '16px', color: '#9AA0B4', fontWeight: 300 }}>
              Real results from real people on our platform.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
            }}
          >
            {[
              { name: 'Aditya Sharma', city: 'Surat, Gujarat', amount: '₹1,45,200', date: 'August 2026', id: 'BFT-8921' },
              { name: 'Rohan Deshmukh', city: 'Pune, Maharashtra', amount: '₹88,500', date: 'August 2026', id: 'BFT-7714' },
              { name: 'Priya Sundaram', city: 'Bengaluru, Karnataka', amount: '₹3,20,000', date: 'July 2026', id: 'BFT-9042' },
              { name: 'Vikram Mehta', city: 'Mumbai, Maharashtra', amount: '₹2,15,400', date: 'July 2026', id: 'BFT-6512' },
              { name: 'Ankit Verma', city: 'Jaipur, Rajasthan', amount: '₹1,12,000', date: 'June 2026', id: 'BFT-5401' },
              { name: 'Deepak Patel', city: 'Ahmedabad, Gujarat', amount: '₹4,50,000', date: 'June 2026', id: 'BFT-4980' },
            ].map((cert) => (
              <div
                key={cert.id}
                style={{
                  background: '#141428',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '20px',
                  padding: '24px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#2B4EFF',
                      background: 'rgba(43,78,255,0.12)',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      fontWeight: 700,
                    }}
                  >
                    Verified INR Settlement
                  </span>
                  <span style={{ fontSize: '11px', color: '#9AA0B4' }}>{cert.id}</span>
                </div>
                <div style={{ fontSize: '13px', color: '#9AA0B4', marginBottom: '4px' }}>Payout Recipient</div>
                <div style={{ fontSize: '17px', fontWeight: 700, color: '#FFFFFF', fontFamily: 'Manrope, sans-serif' }}>
                  {cert.name}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7080', marginBottom: '18px' }}>{cert.city}</div>

                <div
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10px', color: '#9AA0B4', textTransform: 'uppercase' }}>Profit Amount</div>
                    <div
                      style={{
                        fontSize: '22px',
                        fontWeight: 800,
                        color: '#10B981',
                        fontFamily: 'Manrope, sans-serif',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {cert.amount}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: '#9AA0B4', textTransform: 'uppercase' }}>Cleared Date</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#FFFFFF' }}>{cert.date}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. FAQ ACCORDION */}
      <section
        id="faq"
        style={{
          background: '#FFFFFF',
          padding: '90px 0',
        }}
      >
        <div className="bft-container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '48px',
              alignItems: 'start',
            }}
          >
            <div>
              <h2 className="bft-heading-lg" style={{ marginBottom: '16px' }}>
                Frequently Asked <span style={{ color: '#2B4EFF' }}>Questions</span>
              </h2>
              <p style={{ fontSize: '17px', color: '#6B7080', lineHeight: 1.7 }}>
                Everything you need to know before you start your funded trader evaluation.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                {
                  q: 'What is Bharath Funded Trader?',
                  a: 'Bharath Funded Trader is a simulated prop firm evaluation platform built for Indian intraday people. You participate with virtual capital under defined rules and earn rewards upon successful completion.',
                },
                {
                  q: 'Is this legal in India?',
                  a: 'Yes. Bharath Funded Trader operates as a simulated evaluation platform. It is not a broker or SEBI-registered intermediary. Simulated participation is legal in India.',
                },
                {
                  q: 'Which instruments can I be assessed on?',
                  a: 'You can participate on NIFTY, BANKNIFTY, and SENSEX options — both buying and selling are supported. Futures, overnight positions, copy execution and algo execution are not allowed.',
                },
                {
                  q: 'What are the risk rules?',
                  a: 'Each plan has a Max Daily Loss limit, a Max Total Drawdown limit, and intraday square-off at 3:15 PM. Breaking any rule disqualifies the current evaluation.',
                },
                {
                  q: 'How do I get paid?',
                  a: 'After passing the evaluation and completing KYC verification, you become eligible for performance-based rewards paid directly to your verified Indian bank account.',
                },
                {
                  q: 'Is my evaluation fee refundable?',
                  a: 'Yes! Upon passing your evaluation and reaching your first payout, 100% of your evaluation challenge fee is fully refunded to you.',
                },
              ].map((faq, idx) => {
                const isOpen = openFaq === idx;
                return (
                  <div
                    key={faq.q}
                    style={{
                      border: isOpen ? '1px solid #2B4EFF' : '1px solid #E8EAF0',
                      background: isOpen ? 'rgba(43,78,255,0.02)' : '#FFFFFF',
                      borderRadius: '16px',
                      overflow: 'hidden',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <button
                      onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '18px 20px',
                        textAlign: 'left',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        gap: '16px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '15px',
                          fontWeight: 700,
                          fontFamily: 'Manrope, sans-serif',
                          color: isOpen ? '#2B4EFF' : '#0D0F1A',
                          transition: 'color 0.2s',
                        }}
                      >
                        {faq.q}
                      </span>
                      <ChevronDown
                        size={18}
                        color={isOpen ? '#2B4EFF' : '#6B7080'}
                        style={{
                          transform: isOpen ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.3s ease',
                          flexShrink: 0,
                        }}
                      />
                    </button>
                    {isOpen && (
                      <div style={{ padding: '0 20px 20px' }}>
                        <div style={{ height: '1px', background: 'rgba(43,78,255,0.12)', marginBottom: '12px' }} />
                        <p style={{ fontSize: '14px', color: '#6B7080', lineHeight: 1.7, margin: 0 }}>
                          {faq.a}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 11. ACCOUNT OPENING & ONBOARDING */}
      <section
        id="account"
        style={{
          background: '#FAFBFD',
          padding: '90px 0',
          borderTop: '1px solid #E8EAF0',
        }}
      >
        <div className="bft-container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '48px',
              alignItems: 'center',
              marginBottom: '72px',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  background: 'rgba(43,78,255,0.08)',
                  border: '1px solid rgba(43,78,255,0.15)',
                  marginBottom: '20px',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2B4EFF' }} />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#2B4EFF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  Get Started
                </span>
              </div>
              <h2 className="bft-heading-lg" style={{ marginBottom: '16px' }}>
                Open Your Account in <span style={{ color: '#2B4EFF' }}>Under 10 Seconds</span>
              </h2>
              <p style={{ fontSize: '16px', color: '#6B7080', lineHeight: 1.7 }}>
                Simple digital onboarding with instant verification and secure KYC process. No paperwork, no branch
                visits — 100% online.
              </p>
            </div>

            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E8EAF0',
                borderRadius: '24px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
                padding: '32px',
              }}
            >
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0D0F1A', fontFamily: 'Manrope, sans-serif' }}>
                  Create Free Account
                </div>
                <div style={{ fontSize: '13px', color: '#6B7080', marginTop: '4px' }}>Join 50,000+ traders today</div>
              </div>

              <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#6B7080', display: 'block', marginBottom: '6px' }}>
                      First Name
                    </label>
                    <input
                      type="text"
                      placeholder="Rahul"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid #E8EAF0',
                        background: '#FAFBFD',
                        fontSize: '14px',
                        color: '#0D0F1A',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#6B7080', display: 'block', marginBottom: '6px' }}>
                      Last Name
                    </label>
                    <input
                      type="text"
                      placeholder="Sharma"
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid #E8EAF0',
                        background: '#FAFBFD',
                        fontSize: '14px',
                        color: '#0D0F1A',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#6B7080', display: 'block', marginBottom: '6px' }}>
                    Mobile Number
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid #E8EAF0',
                        background: '#FAFBFD',
                        fontSize: '14px',
                        color: '#6B7080',
                        fontWeight: 600,
                      }}
                    >
                      +91
                    </div>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      style={{
                        flex: 1,
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid #E8EAF0',
                        background: '#FAFBFD',
                        fontSize: '14px',
                        color: '#0D0F1A',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#6B7080', display: 'block', marginBottom: '6px' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="rahul@example.com"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid #E8EAF0',
                      background: '#FAFBFD',
                      fontSize: '14px',
                      color: '#0D0F1A',
                      outline: 'none',
                    }}
                  />
                </div>

                <Link
                  href="/login"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '14px',
                    borderRadius: '9999px',
                    background: '#2B4EFF',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '15px',
                    textDecoration: 'none',
                    marginTop: '8px',
                    boxShadow: '0 6px 20px rgba(43,78,255,0.3)',
                  }}
                >
                  Open Free Account
                </Link>
                <p style={{ textAlign: 'center', fontSize: '11px', color: '#9AA0B4', margin: 0 }}>
                  By registering, you agree to our Terms &amp; Conditions and Privacy Policy
                </p>
              </form>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 className="bft-heading-lg" style={{ marginBottom: '12px' }}>
              Start Evaluation in <span style={{ color: '#2B4EFF' }}>3 Easy Steps</span>
            </h2>
            <p style={{ fontSize: '16px', color: '#6B7080' }}>Simple, fast, and completely digital.</p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '24px',
            }}
          >
            {[
              {
                step: '01',
                title: 'Register Your Account',
                desc: 'Enter your mobile number, email, and basic details. Verify with OTP in seconds.',
              },
              {
                step: '02',
                title: 'Purchase desired challenge',
                desc: 'Purchase via UPI, Net Banking or Card with instant challenge activation.',
              },
              {
                step: '03',
                title: 'Start Evaluation Instantly',
                desc: 'Enter the simulated terminal, manage your positions, and qualify for payouts.',
              },
            ].map((st, i) => (
              <div
                key={st.step}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E8EAF0',
                  borderRadius: '20px',
                  padding: '32px 24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '14px',
                  boxShadow: '0 2px 14px rgba(0,0,0,0.03)',
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '16px',
                    background: i === 2 ? '#2B4EFF' : 'rgba(43,78,255,0.08)',
                    color: i === 2 ? '#FFFFFF' : '#2B4EFF',
                    border: '1px solid rgba(43,78,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    fontWeight: 800,
                    fontFamily: 'Manrope, sans-serif',
                  }}
                >
                  {st.step}
                </div>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    color: '#0D0F1A',
                    fontFamily: 'Manrope, sans-serif',
                    margin: 0,
                  }}
                >
                  {st.title}
                </h3>
                <p style={{ fontSize: '14px', color: '#6B7080', lineHeight: 1.6, margin: 0 }}>
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 12. CONTACT US (DARK NAVY) */}
      <section
        id="contact"
        style={{
          background: '#0C0C1D',
          padding: '90px 0',
          color: '#FFFFFF',
        }}
      >
        <div className="bft-container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '48px',
              alignItems: 'center',
            }}
          >
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  background: 'rgba(43,78,255,0.1)',
                  border: '1px solid rgba(43,78,255,0.2)',
                  marginBottom: '20px',
                }}
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2B4EFF' }} />
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#2B4EFF',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  Contact Us
                </span>
              </div>
              <h2
                style={{
                  fontFamily: 'Manrope, sans-serif',
                  fontSize: 'clamp(2rem, 4vw, 3rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  marginBottom: '16px',
                  color: '#FFFFFF',
                }}
              >
                Contact Our <span style={{ color: '#2B4EFF' }}>Support</span> Team
              </h2>
              <p style={{ fontSize: '16px', color: '#9AA0B4', lineHeight: 1.7, marginBottom: '36px' }}>
                We&apos;re here to help you 24/7. Reach out through any channel that works best for you.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  {
                    icon: Phone,
                    label: 'Phone Support',
                    value: '+91 91114 44555',
                    sub: 'Mon-Fri, 9:00 AM - 6:00 PM IST',
                  },
                  {
                    icon: Mail,
                    label: 'Email Support',
                    value: 'support@bharathfundedtrader.com',
                    sub: 'Typically responds within 2 hours',
                  },
                  {
                    icon: MessageCircle,
                    label: 'WhatsApp VIP Desk',
                    value: '+91 91114 44555',
                    sub: 'Instant 24/7 support',
                  },
                ].map((ch) => {
                  const Icon = ch.icon;
                  return (
                    <div key={ch.label} style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          background: 'rgba(43,78,255,0.12)',
                          border: '1px solid rgba(43,78,255,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#2B4EFF',
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>{ch.label}</div>
                        <div style={{ fontSize: '14px', color: '#2B4EFF', fontWeight: 600 }}>{ch.value}</div>
                        <div style={{ fontSize: '11px', color: '#9AA0B4' }}>{ch.sub}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                background: '#141428',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '24px',
                padding: '36px',
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF', marginBottom: '20px' }}>
                Send Us a Message
              </div>

              {contactSent ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'rgba(16,185,129,0.15)',
                      border: '1px solid rgba(16,185,129,0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10B981',
                      margin: '0 auto 16px',
                    }}
                  >
                    <Check size={28} />
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#FFFFFF' }}>Message Sent!</div>
                  <p style={{ fontSize: '14px', color: '#9AA0B4', marginTop: '6px' }}>
                    We will get back to you within 2 hours.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setContactSent(true);
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: '#9AA0B4', display: 'block', marginBottom: '6px' }}>
                        Your Name
                      </label>
                      <input
                        type="text"
                        placeholder="Rahul Sharma"
                        required
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.05)',
                          color: '#FFFFFF',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: '#9AA0B4', display: 'block', marginBottom: '6px' }}>
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="rahul@example.com"
                        required
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          borderRadius: '12px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          background: 'rgba(255,255,255,0.05)',
                          color: '#FFFFFF',
                          fontSize: '14px',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#9AA0B4', display: 'block', marginBottom: '6px' }}>
                      Subject
                    </label>
                    <select
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: '#141428',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    >
                      <option value="">Select a topic</option>
                      <option value="account">Account Opening</option>
                      <option value="deposit">Challenge Purchase / Payout</option>
                      <option value="rules">Trading Rules &amp; Targets</option>
                      <option value="tech">Technical Issue</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', color: '#9AA0B4', display: 'block', marginBottom: '6px' }}>
                      Message
                    </label>
                    <textarea
                      rows={4}
                      placeholder="Describe your query..."
                      required
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.05)',
                        color: '#FFFFFF',
                        fontSize: '14px',
                        outline: 'none',
                        resize: 'none',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    style={{
                      width: '100%',
                      padding: '14px',
                      borderRadius: '9999px',
                      background: '#2B4EFF',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '15px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      boxShadow: '0 6px 20px rgba(43,78,255,0.3)',
                    }}
                  >
                    <Send size={16} /> Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 13. FOOTER */}
      <footer
        style={{
          background: '#0C0C1D',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '64px 0 36px',
          color: '#9AA0B4',
        }}
      >
        <div className="bft-container">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '40px',
              marginBottom: '48px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#2B4EFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '16px',
                  }}
                >
                  B
                </div>
                <span
                  style={{
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '17px',
                    fontFamily: 'Manrope, sans-serif',
                  }}
                >
                  Bharath Funded Trader
                </span>
              </div>
              <p style={{ fontSize: '13px', lineHeight: 1.7, marginBottom: '20px' }}>
                India Ka Apna Funded Platform. Simulated evaluations for serious Indian intraday people.
              </p>
            </div>

            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', marginBottom: '16px' }}>
                Platform
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <li><a href="#home" style={{ color: '#9AA0B4', textDecoration: 'none' }}>Home</a></li>
                <li><a href="#account" style={{ color: '#9AA0B4', textDecoration: 'none' }}>How it works</a></li>
                <li><a href="#pricing" style={{ color: '#9AA0B4', textDecoration: 'none' }}>Challenges</a></li>
                <li><a href="#markets" style={{ color: '#9AA0B4', textDecoration: 'none' }}>Instruments</a></li>
                <li><a href="#pricing" style={{ color: '#9AA0B4', textDecoration: 'none' }}>Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', marginBottom: '16px' }}>
                Resources
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <li><a href="#faq" style={{ color: '#9AA0B4', textDecoration: 'none' }}>FAQ</a></li>
                <li><a href="#tools" style={{ color: '#9AA0B4', textDecoration: 'none' }}>Rules</a></li>
                <li><a href="#contact" style={{ color: '#9AA0B4', textDecoration: 'none' }}>Contact Us</a></li>
                <li><a href="/login" style={{ color: '#9AA0B4', textDecoration: 'none' }}>Trader Login</a></li>
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', textTransform: 'uppercase', marginBottom: '16px' }}>
                Legal
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                <li><span style={{ color: '#9AA0B4' }}>Privacy Policy</span></li>
                <li><span style={{ color: '#9AA0B4' }}>Terms &amp; Conditions</span></li>
                <li><span style={{ color: '#9AA0B4' }}>Refund Policy</span></li>
                <li><span style={{ color: '#9AA0B4' }}>Risk Disclaimer</span></li>
              </ul>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '28px' }}>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              <span>© 2026 Bharath Funded Trader. All rights reserved.</span>
              <div style={{ display: 'flex', gap: '20px' }}>
                <span>Terms &amp; Conditions</span>
                <span>Privacy Policy</span>
                <span>Refund Policy</span>
              </div>
            </div>

            <p style={{ fontSize: '11px', color: '#6B7080', lineHeight: 1.7 }}>
              <strong style={{ color: '#9AA0B4' }}>Disclaimer:</strong> Bharath Funded Trader is an evaluation
              platform and is not a stock broker, exchange, investment advisor, or portfolio manager. The platform
              does not facilitate or execute live orders on the NSE, BSE, or any other exchange. All activities are
              conducted in a simulated environment designed to assess participants&apos; skills and consistency. Rewards
              are based on the terms of the evaluation and funding programme. Participation involves risk, and past
              performance does not guarantee future results.
            </p>
          </div>
        </div>
      </footer>

      {/* 14. FLOATING WHATSAPP FAB WIDGET */}
      <a
        href="https://wa.me/919111444555?text=Hi!%20I%20have%20a%20question%20about%20Bharath%20Funded%20Trader."
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          textDecoration: 'none',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: '#25D366',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(37,211,102,0.4)',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '50%',
              background: '#25D366',
              animation: 'ping-fab 2.4s cubic-bezier(0, 0, 0.2, 1) infinite',
              zIndex: -1,
            }}
          />
          <svg viewBox="0 0 32 32" style={{ width: '32px', height: '32px', fill: '#FFFFFF' }}>
            <path d="M16.001 3.2c-7.07 0-12.8 5.73-12.8 12.8 0 2.27.6 4.42 1.65 6.27L3.2 28.8l6.7-1.62c1.78.97 3.81 1.49 5.97 1.49h.01c7.07 0 12.8-5.73 12.8-12.8 0-3.42-1.33-6.63-3.75-9.05a12.74 12.74 0 0 0-9.04-3.62zm0 23.31h-.01a10.5 10.5 0 0 1-5.34-1.46l-.38-.23-3.97.96 1.06-3.87-.25-.4a10.49 10.49 0 0 1-1.61-5.6c0-5.8 4.72-10.51 10.52-10.51 2.81 0 5.45 1.09 7.43 3.08a10.43 10.43 0 0 1 3.07 7.43c0 5.8-4.72 10.6-10.52 10.6zm5.78-7.87c-.32-.16-1.87-.92-2.16-1.03-.29-.11-.5-.16-.71.16-.21.32-.81 1.03-.99 1.24-.18.21-.36.24-.68.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.88-1.76-2.2-.18-.32-.02-.49.14-.65.14-.14.32-.36.48-.55.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.55-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.53-.71-.54-.18-.01-.4-.01-.62-.01-.21 0-.55.08-.84.4-.29.32-1.1 1.07-1.1 2.62 0 1.55 1.13 3.04 1.29 3.25.16.21 2.22 3.39 5.39 4.76.75.32 1.34.52 1.8.66.76.24 1.45.21 1.99.13.61-.09 1.87-.76 2.13-1.5.26-.74.26-1.37.18-1.5-.08-.13-.29-.21-.61-.37z" />
          </svg>
        </div>
      </a>
    </div>
  );
}
