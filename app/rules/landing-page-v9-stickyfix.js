'use client';
/* ================================================================
   FundedDesk Landing v2 — FundedFirm-style structure, green theme
   Sections: announce bar, hero, stats, challenge picker (1/2-step
   + sizes), comparison table, steps, testimonials, CTA band
   ================================================================ */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const SIZES = [
  { cap: '₹5 Lakh',  capN: 500000,  fee2: '₹4,999',  fee1: '₹6,499'  },
  { cap: '₹10 Lakh', capN: 1000000, fee2: '₹8,999',  fee1: '₹11,999' },
  { cap: '₹25 Lakh', capN: 2500000, fee2: '₹19,999', fee1: '₹24,999' },
  { cap: '₹50 Lakh', capN: 5000000, fee2: '₹34,999', fee1: '₹42,999' },
];
const ANNOUNCE = [
  '🚀 Working Model 2.0 — Live Indian Options Terminal',
  '📜 Every rule public. Zero hidden conditions.',
  '⚡ Payouts processed within 24 hours',
];
const inr = (n) => '₹' + n.toLocaleString('en-IN');

const LANDING_CSS = `
.landing .hero-word{display:inline-block;opacity:0;transform:translateY(30px);filter:blur(7px);
  animation:heroWordIn .85s cubic-bezier(.19,1,.22,1) forwards}
@keyframes heroWordIn{to{opacity:1;transform:none;filter:blur(0)}}
.landing .hero-fade{opacity:0;animation:heroFadeIn .8s cubic-bezier(.19,1,.22,1) forwards}
@keyframes heroFadeIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}

.pin-dot{width:8px;height:8px;border-radius:99px;background:rgba(255,255,255,.15);transition:all .35s cubic-bezier(.19,1,.22,1)}
.pin-dot.on{width:28px;background:linear-gradient(96deg,#16C784,#7CF29C)}
.sphere-canvas{opacity:0;transform:scale(.88);animation:sphereIn 1.3s cubic-bezier(.19,1,.22,1) .1s forwards}
@keyframes sphereIn{to{opacity:1;transform:scale(1)}}

/* ---- v5 theme: rich emerald bg, glass cards, display type ---- */
.landing{--text:#F2FAF5;--muted:#A6BBAF;--dim:#6E8578}
.landing h1,.landing h2,.landing h3{font-family:'Unbounded','Manrope',sans-serif;letter-spacing:-.01em}
.landing h1{font-size:clamp(30px,4.3vw,50px)!important;line-height:1.14!important}
.landing .hero h1{font-size:clamp(46px,9.2vw,112px)!important;line-height:1.0!important;letter-spacing:-.02em!important}
.landing h2{font-size:clamp(23px,2.8vw,34px)!important}
.landing h3{font-size:16px!important}

.bg-base{position:fixed;inset:0;z-index:-2;background:
 radial-gradient(1100px 700px at 12% -10%,rgba(34,197,139,.17),transparent 60%),
 radial-gradient(900px 620px at 96% 14%,rgba(45,212,191,.11),transparent 60%),
 radial-gradient(1050px 820px at 50% 116%,rgba(34,197,139,.13),transparent 62%),
 linear-gradient(180deg,#0A140F 0%,#08110D 45%,#060D0A 100%)}
.bg-grid{position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.55;
 background-image:linear-gradient(rgba(124,242,156,.05) 1px,transparent 1px),
 linear-gradient(90deg,rgba(124,242,156,.05) 1px,transparent 1px);
 background-size:44px 44px;
 -webkit-mask-image:radial-gradient(1200px 820px at 50% 0%,black,transparent 78%);
 mask-image:radial-gradient(1200px 820px at 50% 0%,black,transparent 78%)}
.bg-noise{position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.045;
 background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.7'/></svg>")}

.landing .card{background:linear-gradient(180deg,rgba(28,46,37,.72),rgba(15,26,21,.86));
 -webkit-backdrop-filter:blur(9px);backdrop-filter:blur(9px);
 border-color:rgba(124,242,156,.15);
 box-shadow:inset 0 1px 0 rgba(180,255,214,.07)}
.landing .tbl th{color:#7E9788}
.landing .grad-text{background:linear-gradient(96deg,#2CE08E,#B9F7CD);
 -webkit-background-clip:text;background-clip:text;color:transparent}

.landing section{position:relative;overflow:hidden}
.landing section::before{content:"";position:absolute;width:680px;height:680px;border-radius:50%;
  filter:blur(90px);pointer-events:none;
  background:radial-gradient(circle,rgba(34,197,139,.13),transparent 65%)}
.landing section:nth-of-type(odd)::before{top:-180px;left:-220px}
.landing section:nth-of-type(even)::before{bottom:-200px;right:-240px;
  background:radial-gradient(circle,rgba(124,242,156,.09),transparent 65%)}

.landing [data-reveal]{opacity:0;transform:translateY(28px);
  transition:opacity .7s cubic-bezier(.2,.7,.3,1),transform .7s cubic-bezier(.2,.7,.3,1)}
.landing .in{opacity:1;transform:none}
.landing .grid3 > .card:nth-child(2){transition-delay:.12s}
.landing .grid3 > .card:nth-child(3){transition-delay:.24s}

.landing .card{transition:transform .25s ease,border-color .25s ease,box-shadow .25s ease}
.landing .card:hover{transform:translateY(-5px);border-color:rgba(34,197,139,.4);
  box-shadow:0 16px 46px rgba(34,197,139,.13)}
.landing tbody tr{transition:background .15s}
.landing tbody tr:hover{background:rgba(34,197,139,.05)}

.pricecard{animation:pulseGlow 3.4s ease-in-out infinite}
@keyframes pulseGlow{0%,100%{box-shadow:0 0 0 rgba(34,197,139,0)}
  50%{box-shadow:0 0 48px rgba(34,197,139,.17)}}

.ctaband{position:relative;overflow:hidden}
.ctaband::after{content:"";position:absolute;top:0;left:-60%;width:40%;height:100%;
  background:linear-gradient(105deg,transparent,rgba(124,242,156,.12),transparent);
  animation:sheen 4.6s ease-in-out infinite;pointer-events:none}
@keyframes sheen{0%{left:-60%}55%,100%{left:130%}}

.stepnum{position:absolute;top:6px;right:16px;font-family:Manrope,sans-serif;font-weight:800;
  font-size:74px;color:rgba(34,197,139,.07);line-height:1;pointer-events:none}
`;


export default function Home() {
  const [step, setStep] = useState('2step');
  const [size, setSize] = useState(1);
  const [ann, setAnn] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setAnn((a) => (a + 1) % ANNOUNCE.length), 3500);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }),
      { threshold: 0.15 }
    );
    document.querySelectorAll('[data-reveal]').forEach((el) => io.observe(el));
    return () => io.disconnect();
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
      <style dangerouslySetInnerHTML={{ __html: LANDING_CSS }} />
      <div className="bg-base" />
      <div className="bg-grid" />
      <div className="bg-noise" />
      {/* announcement bar */}
      <div style={{ background: 'linear-gradient(90deg,#0B3D2A,#0E5C3C)', color: '#B9F5D8', textAlign: 'center', fontSize: 12.5, fontWeight: 600, padding: '7px 12px', letterSpacing: '.02em' }}>
        {ANNOUNCE[ann]}
      </div>

      {/* full-page drifting star dust */}
      <StarField />
      <MouseTrail />
      <ScrollPath />

      {/* HERO */}
      <header className="hero" style={{
        position: 'relative', textAlign: 'center', overflow: 'hidden',
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '90px 0',
      }}>
        <div style={{ position: 'absolute', inset: '-120px 0 0', background: 'radial-gradient(720px 400px at 50% -8%, rgba(34,197,139,.20), transparent 65%), radial-gradient(520px 300px at 82% 22%, rgba(124,242,156,.08), transparent 60%)', pointerEvents: 'none' }} />
        <NeuralSphere scale={1.55} blend="screen" />
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(120% 85% at 50% 42%, transparent 42%, rgba(6,7,12,.6) 100%)',
        }} />
        <div className="wrap" style={{ position: 'relative' }}>
          <span className="pill" style={{ color: '#22C58B', background: 'rgba(34,197,139,.1)', borderColor: 'rgba(34,197,139,.3)' }}>
            🇮🇳 Built for Indian traders · Options · Simulated capital
          </span>
          <h1 style={{ fontWeight: 800, maxWidth: 980, margin: '0 auto 20px', position: 'relative', zIndex: 2 }}>
            {"Prove Your Skill.".split(' ').map((w, i) => (
              <span key={'a' + i} className="hero-word" style={{ animationDelay: (i * 80) + 'ms' }}>{w}&nbsp;</span>
            ))}
            <br />
            {"Trade Our Capital.".split(' ').map((w, i) => (
              <span key={'b' + i} className="hero-word grad-text" style={{ animationDelay: (300 + i * 80) + 'ms' }}>{w}&nbsp;</span>
            ))}
          </h1>
          <p className="muted hero-fade" style={{ fontSize: 18, maxWidth: 580, margin: '0 auto 32px', animationDelay: '620ms' }}>
            Pass a transparent evaluation on our simulated NIFTY &amp; BANKNIFTY options terminal.
            Keep up to 90% of the rewards — with every rule published before you pay.
          </p>
          <div className="hero-fade" style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', animationDelay: '740ms' }}>
            <Link className="btn btn-grad" href="/challenges" style={{ background: 'linear-gradient(96deg,#16C784,#0E9F68)', boxShadow: '0 6px 24px rgba(34,197,139,.35)' }}>Buy Challenge →</Link>
            <Link className="btn btn-line" href="/rules">Read the Rulebook</Link>
          </div>
          <div className="hm-row num hero-fade" style={{ animationDelay: '860ms' }}>
            <div className="hm"><div className="v"><Counter prefix="₹" value={50} suffix="L" /></div><div className="k">Max account size</div></div>
            <div className="hm"><div className="v grad-text"><Counter value={90} suffix="%" /></div><div className="k">Top reward split</div></div>
            <div className="hm"><div className="v"><Counter value={24} suffix="h" /></div><div className="k">Payout processing</div></div>
            <div className="hm"><div className="v"><Counter value={0} /></div><div className="k">Hidden rules</div></div>
          </div>
        </div>
      </header>

      {/* CHALLENGE PICKER */}
      <section style={{ paddingTop: 24 }}>
        <div className="wrap">
          <div className="sec-head" data-reveal>
            <h2>Funded Account <span className="grad-text">Challenges</span></h2>
            <p>Pick your path and your size. Same public rules for everyone.</p>
          </div>

          {/* tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {[['1step', '1 Step'], ['2step', '2 Step']].map(([k, label]) => (
              <button key={k} onClick={() => setStep(k)} className="btn btn-sm"
                style={step === k
                  ? { background: 'linear-gradient(96deg,#16C784,#0E9F68)', color: '#04150D', fontWeight: 800 }
                  : { border: '1px solid var(--line2)', color: 'var(--muted)' }}>{label}</button>
            ))}
            <span style={{ width: 18 }} />
            {SIZES.map((x, i) => (
              <button key={x.cap} onClick={() => setSize(i)} className="btn btn-sm"
                style={size === i
                  ? { background: 'rgba(34,197,139,.16)', color: '#22C58B', border: '1px solid rgba(34,197,139,.45)', fontWeight: 800 }
                  : { border: '1px solid var(--line2)', color: 'var(--muted)' }}>
                {x.cap}{i === 1 ? ' ★' : ''}
              </button>
            ))}
          </div>

          {/* pricing card */}
          <div className="card pricecard" data-reveal style={{ maxWidth: 620, margin: '0 auto', padding: 0, overflow: 'hidden', borderColor: 'rgba(34,197,139,.35)', background: 'linear-gradient(180deg,rgba(34,197,139,.06),var(--card))' }}>
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <div className="muted" style={{ fontSize: 13 }}>{step === '2step' ? '2 Step Evaluation' : '1 Step Evaluation'} · {s.cap} account</div>
                <div className="num" style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 34 }}>
                  {fee} <span className="muted" style={{ fontSize: 13, fontWeight: 600 }}>one-time fee</span>
                </div>
              </div>
              <span className="tag" style={{ background: 'rgba(34,197,139,.13)', color: '#22C58B' }}>FEE REFUNDED WITH 1ST PAYOUT</span>
            </div>
            <table className="tbl num">
              <tbody>
                <tr><td style={{ paddingLeft: 28 }}>Profit target {step === '2step' ? '(Phase 1)' : ''}</td>
                  <td style={{ textAlign: 'right', paddingRight: 28 }}>{t1}% · <span className="muted">{inr(s.capN * t1 / 100)}</span></td></tr>
                {step === '2step' && (
                  <tr><td style={{ paddingLeft: 28 }}>Profit target (Phase 2)</td>
                    <td style={{ textAlign: 'right', paddingRight: 28 }}>5% · <span className="muted">{inr(s.capN * 5 / 100)}</span></td></tr>
                )}
                <tr><td style={{ paddingLeft: 28 }}>Maximum loss</td>
                  <td style={{ textAlign: 'right', paddingRight: 28 }}>10% · <span className="muted">{inr(s.capN * 10 / 100)}</span></td></tr>
                <tr><td style={{ paddingLeft: 28 }}>Maximum daily loss</td>
                  <td style={{ textAlign: 'right', paddingRight: 28 }}>5% · <span className="muted">{inr(s.capN * 5 / 100)}</span></td></tr>
                <tr><td style={{ paddingLeft: 28 }}>Time limit</td>
                  <td style={{ textAlign: 'right', paddingRight: 28, color: '#22C58B', fontWeight: 700 }}>Unlimited</td></tr>
                <tr><td style={{ paddingLeft: 28 }}>Reward split</td>
                  <td style={{ textAlign: 'right', paddingRight: 28, color: '#22C58B', fontWeight: 700 }}>Up to 90%</td></tr>
              </tbody>
            </table>
            <div style={{ padding: '18px 28px' }}>
              <Link className="btn" href="/challenges" style={{ width: '100%', background: 'linear-gradient(96deg,#16C784,#0E9F68)', color: '#04150D', fontWeight: 800 }}>
                Start {s.cap} Challenge →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section>
        <div className="wrap" style={{ maxWidth: 880 }}>
          <div className="sec-head" data-reveal>
            <h2>Why traders pick <span className="grad-text">FundedDesk</span></h2>
          </div>
          <div className="card" data-reveal style={{ padding: 0, overflow: 'hidden' }}>
            <table className="tbl" style={{ fontSize: 14 }}>
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
                ].map(([f, us, them]) => (
                  <tr key={f}>
                    <td style={{ paddingLeft: 26 }}>{f}</td>
                    <td style={{ textAlign: 'center' }}>
                      <Dot yes={us} />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Dot yes={them} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — pinned scroll story */}
      <section style={{ paddingTop: 0, paddingBottom: 0, overflow: 'visible' }}>
        <div className="wrap">
          <div className="sec-head" data-reveal>
            <h2>Three steps to funded</h2>
            <p>Scroll to walk through the journey — from first trade to your first payout.</p>
          </div>
        </div>
        <PinnedSteps steps={[
          ['01', 'Take the Challenge', 'Trade our live-data NIFTY & BANKNIFTY options terminal with simulated capital. Hit the target, respect the loss limits.'],
          ['02', 'Verify', 'Pass and complete KYC. Our desk reviews rule compliance within 24 hours using the same public checklist you can read.'],
          ['03', 'Earn Rewards', 'Trade the funded simulated account. Request rewards after 5 trading days — processed within 24 hours to your bank.'],
        ]} />
      </section>

      {/* TESTIMONIALS (sample-labeled) */}
      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head" data-reveal>
            <h2>Traders who read the rules first</h2>
          </div>
          <div className="grid3">
            {[
              ['RS', 'Rohan S. · Jaipur', 'Pehli baar kisi platform ne breach par exact timestamp aur equity snapshot diya — maine khud verify kiya. Yahi transparency chahiye thi.'],
              ['PK', 'Priya K. · Mumbai', 'The live drawdown meter changed how I manage risk. I always know my distance from the limit before I take a trade.'],
              ['AM', 'Arjun M. · Indore', 'Support replied in Hindi at 11pm and fixed my KYC in one go. Reward hit my bank the next morning.'],
            ].map(([av, who, txt]) => (
              <div className="card" data-reveal key={av}>
                <div style={{ color: '#F5B93E', letterSpacing: 2, marginBottom: 10, fontSize: 14 }}>★★★★★</div>
                <p style={{ fontSize: 14, color: '#C6CDDD', marginBottom: 16 }}>&ldquo;{txt}&rdquo;</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--card2)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 13, color: '#22C58B' }}>{av}</div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600 }}>{who}</div>
                    <div className="dim" style={{ fontSize: 11.5 }}>Sample testimonial (prototype)</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="card ctaband" data-reveal style={{ textAlign: 'center', padding: 54, background: 'linear-gradient(120deg,rgba(34,197,139,.15),rgba(124,242,156,.05))', borderColor: 'rgba(34,197,139,.35)' }}>
            <h2 style={{ fontSize: 'clamp(24px,3.2vw,36px)', marginBottom: 10 }}>Ready when the rules are this clear?</h2>
            <p className="muted" style={{ marginBottom: 26 }}>Create your free account, read every rule, then pick your size.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link className="btn" href="/signup" style={{ background: 'linear-gradient(96deg,#16C784,#0E9F68)', color: '#04150D', fontWeight: 800 }}>Get Funded →</Link>
              <Link className="btn btn-line" href="/india">See the Live Terminal</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Dot({ yes }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700,
      color: yes ? '#22C58B' : '#F0525F',
    }}>
      {yes ? 'Yes' : 'No'}
      <span style={{ width: 9, height: 9, borderRadius: '50%', background: yes ? '#22C58B' : '#F0525F', boxShadow: yes ? '0 0 8px rgba(34,197,139,.7)' : '0 0 8px rgba(240,82,95,.6)' }} />
    </span>
  );
}

/* ================================================================
   NeuralSphere v3.1 — same look, 10x lighter
   Perf: pre-rendered glow sprites (no shadowBlur), 30fps cap,
   DPR cap 1.25, fewer nodes/edges, pauses off-screen.
   ================================================================ */
function NeuralSphere({ scale = 1, blend = 'normal' } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const DPR = Math.min(1.25, window.devicePixelRatio || 1);
    let W = 0, H = 0, raf = 0, running = true, visible = true, last = 0;

    function resize() {
      const r = canvas.parentElement.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();

    // ---- pre-rendered glow sprites (THE perf fix: no shadowBlur) ----
    function makeSprite(size, inner, outer) {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, inner);
      grad.addColorStop(0.35, outer);
      grad.addColorStop(1, 'rgba(34,197,139,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      return c;
    }
    const dot = makeSprite(32, 'rgba(190,255,220,1)', 'rgba(34,197,139,.55)');
    const dotFlash = makeSprite(48, 'rgba(230,255,240,1)', 'rgba(34,197,139,.8)');

    // ---- fibonacci sphere ----
    const N = W < 700 ? 150 : 240;
    const pts = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const th = golden * i;
      pts.push({ x: Math.cos(th) * rad, y, z: Math.sin(th) * rad, flash: -Math.random() * 600 });
    }
    // 2 nearest-neighbour edges per node
    const edges = [];
    for (let i = 0; i < N; i++) {
      const d = [];
      for (let j = 0; j < N; j++) {
        if (i === j) continue;
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y, dz = pts[i].z - pts[j].z;
        d.push([dx * dx + dy * dy + dz * dz, j]);
      }
      d.sort((a, b) => a[0] - b[0]);
      for (let k = 0; k < 2; k++) { const j = d[k][1]; if (i < j) edges.push([i, j]); }
    }
    const RINGN = 40;
    const ring = [];
    for (let i = 0; i < RINGN; i++) ring.push({ a: (i / RINGN) * Math.PI * 2, sp: 0.008 + Math.random() * 0.004 });

    let rotY = 0, tiltX = 0.35, tTiltX = 0.35, tTiltY = 0;
    const mouse = { on: false, x: 0, y: 0 };
    const proj = new Array(N);
    let coreGrad = null, coreKey = '';

    function frame(t) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      if (t - last < 33) return;              // 30fps cap
      last = t;

      ctx.clearRect(0, 0, W, H);
      rotY += 0.007;
      if (mouse.on) { tTiltY = (mouse.x / W - 0.5) * 0.8; tTiltX = 0.35 + (mouse.y / H - 0.5) * 0.55; }
      else { tTiltY *= 0.97; tTiltX += (0.35 - tTiltX) * 0.03; }
      tiltX += (tTiltX - tiltX) * 0.08;

      const breathe = 1 + 0.022 * Math.sin(t * 0.0011);
      const R = Math.min(W, H) * 0.40 * breathe * scale;
      const cx = W / 2, cy = H * 0.54, f = 3.2;
      const ry = rotY + tTiltY;
      const cosY = Math.cos(ry), sinY = Math.sin(ry);
      const cosX = Math.cos(tiltX), sinX = Math.sin(tiltX);

      for (let i = 0; i < N; i++) {
        const p = pts[i];
        const x = p.x * cosY + p.z * sinY;
        const z = -p.x * sinY + p.z * cosY;
        const y2 = p.y * cosX - z * sinX;
        const z2 = p.y * sinX + z * cosX;
        const s = f / (f + z2);
        proj[i] = { x: cx + x * R * s, y: cy + y2 * R * s, z: z2 };
      }

      // links
      for (let e = 0; e < edges.length; e++) {
        const a = proj[edges[e][0]], b = proj[edges[e][1]];
        const depth = 1 - ((a.z + b.z) / 2 + 1) / 2;
        ctx.strokeStyle = 'rgba(34,197,139,' + (0.06 + 0.30 * depth).toFixed(3) + ')';
        ctx.lineWidth = 0.6 + 0.7 * depth;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }

      // nodes via sprites (fast)
      for (let i = 0; i < N; i++) {
        const p = proj[i], o = pts[i];
        const depth = 1 - (p.z + 1) / 2;
        o.flash -= 1;
        let boost = 0;
        if (o.flash < 0) { if (Math.random() < 0.004) o.flash = 40; }
        else boost = o.flash / 40;
        const size = 5 + 12 * depth + 14 * boost;
        ctx.globalAlpha = Math.min(1, 0.30 + 0.65 * depth + 0.4 * boost);
        ctx.drawImage(boost > 0.05 ? dotFlash : dot, p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;

      // orbit ring
      for (const q of ring) {
        q.a += q.sp;
        const rx = Math.cos(q.a) * 1.3, rz = Math.sin(q.a) * 1.3, ryy = Math.sin(q.a * 2) * 0.06;
        const x = rx * cosY + rz * sinY;
        const z = -rx * sinY + rz * cosY;
        const y2 = ryy * cosX - z * sinX;
        const z2 = ryy * sinX + z * cosX;
        const s = f / (f + z2);
        const depth = 1 - (z2 + 1) / 2;
        const size = 3 + 5 * depth;
        ctx.globalAlpha = 0.12 + 0.35 * depth;
        ctx.drawImage(dot, cx + x * R * s - size / 2, cy + y2 * R * s - size / 2, size, size);
      }
      ctx.globalAlpha = 1;

      // cached core glow
      const key = Math.round(R) + 'x' + Math.round(cx);
      if (key !== coreKey) {
        coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.2);
        coreGrad.addColorStop(0, 'rgba(34,197,139,0.09)');
        coreGrad.addColorStop(0.6, 'rgba(34,197,139,0.03)');
        coreGrad.addColorStop(1, 'rgba(34,197,139,0)');
        coreKey = key;
      }
      ctx.fillStyle = coreGrad; ctx.fillRect(0, 0, W, H);
    }
    raf = requestAnimationFrame(frame);

    // pause when hero is off-screen (scroll) — zero CPU
    const io = new IntersectionObserver((en) => { visible = en[0]?.isIntersecting !== false; });
    io.observe(canvas.parentElement);

    function onMove(e) {
      const r = canvas.getBoundingClientRect();
      mouse.on = true; mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    }
    function onLeave() { mouse.on = false; }
    function onVis() { running = !document.hidden; if (running) { last = 0; raf = requestAnimationFrame(frame); } }
    window.addEventListener('resize', resize);
    canvas.parentElement.addEventListener('mousemove', onMove);
    canvas.parentElement.addEventListener('mouseleave', onLeave);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      running = false; cancelAnimationFrame(raf); io.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return <canvas ref={ref} className="sphere-canvas" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: blend }} />;
}

/* ================================================================
   StarField — full-page slow-drifting micro star dust (like theirs)
   ================================================================ */
function StarField() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, raf = 0, running = true;
    const DPR = 1;
    const N = 110;
    const stars = [];

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    for (let i = 0; i < N; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 0.7 + Math.random() * 2.0,
        v: 0.05 + Math.random() * 0.15,
        tw: Math.random() * Math.PI * 2,
      });
    }
    let last = 0;
    function frame(t) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (t - last < 50) return;             // 20fps is plenty for dust
      last = t;
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        s.y -= s.v; s.tw += 0.015;
        if (s.y < -4) { s.y = H + 4; s.x = Math.random() * W; }
        const a = 0.30 + 0.38 * (0.5 + 0.5 * Math.sin(s.tw));
        // soft halo glow
        ctx.fillStyle = 'rgba(34,197,139,' + (a * 0.30).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(210,255,232,' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
    }
    raf = requestAnimationFrame(frame);
    function onVis() { running = !document.hidden; if (running) raf = requestAnimationFrame(frame); }
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      running = false; cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />;
}

/* ================================================================
   MouseTrail — glowing green path that follows the cursor and
   fades out behind it. Sprite-based glow (no shadowBlur), light.
   ================================================================ */
function MouseTrail() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const DPR = Math.min(1.25, window.devicePixelRatio || 1);
    let W = 0, H = 0, raf = 0, running = true;
    const pts = [];

    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();

    // pre-rendered glow sprite
    const spr = document.createElement('canvas');
    spr.width = spr.height = 64;
    const g = spr.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(200,255,228,.95)');
    grad.addColorStop(0.4, 'rgba(34,197,139,.5)');
    grad.addColorStop(1, 'rgba(34,197,139,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);

    let lastAdd = 0;
    const cursor = { x: -1, y: -1 };
    function addPt(x, y) {
      const now = performance.now();
      if (now - lastAdd < 14) return;
      lastAdd = now;
      pts.push({ x, y, life: 1 });
      if (pts.length > 70) pts.shift();
    }
    function onMove(e) {
      cursor.x = e.clientX; cursor.y = e.clientY;
      addPt(e.clientX, e.clientY);
    }
    let lastScrollY = window.scrollY;
    function onScroll() {
      // scroll karte waqt bhi path banta rahe (cursor ke current spot par,
      // scroll direction mein halka drift ke saath)
      const dy = window.scrollY - lastScrollY;
      lastScrollY = window.scrollY;
      const x = cursor.x >= 0 ? cursor.x : W * 0.82;
      const y = cursor.y >= 0 ? cursor.y : H * 0.5;
      addPt(x + (Math.random() - 0.5) * 6, y + Math.max(-18, Math.min(18, dy * 0.35)));
    }

    function frame() {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      ctx.clearRect(0, 0, W, H);
      if (!pts.length) return;
      for (const p of pts) p.life -= 0.02;
      while (pts.length && pts[0].life <= 0) pts.shift();

      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      // path line
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        ctx.strokeStyle = 'rgba(34,197,139,' + (0.38 * b.life).toFixed(3) + ')';
        ctx.lineWidth = 1.4 + 3.2 * b.life;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      // glow dots along the path
      for (let i = 0; i < pts.length; i += 3) {
        const p = pts[i];
        const s = 10 + 30 * p.life;
        ctx.globalAlpha = 0.55 * p.life;
        ctx.drawImage(spr, p.x - s / 2, p.y - s / 2, s, s);
      }
      // bright head at current cursor
      const head = pts[pts.length - 1];
      if (head && head.life > 0.9) {
        const s = 26;
        ctx.globalAlpha = 0.9;
        ctx.drawImage(spr, head.x - s / 2, head.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    raf = requestAnimationFrame(frame);

    const onVis = () => { running = !document.hidden; if (running) raf = requestAnimationFrame(frame); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      running = false; cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none' }} />;
}

/* ================================================================
   ScrollPath — left-edge glowing progress path that draws itself
   as you scroll down, with a bright travelling head.
   ================================================================ */
function ScrollPath() {
  const fillRef = useRef(null);
  const headRef = useRef(null);
  useEffect(() => {
    let raf = 0;
    function update() {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      if (fillRef.current) fillRef.current.style.height = (p * 100) + '%';
      if (headRef.current) headRef.current.style.top = 'calc(' + (p * 100) + '% - 5px)';
    }
    function onScroll() { cancelAnimationFrame(raf); raf = requestAnimationFrame(update); }
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, []);
  if (typeof window !== 'undefined' && window.innerWidth < 760) return null;
  return (
    <div style={{ position: 'fixed', left: 22, top: 110, bottom: 40, width: 2, zIndex: 2, pointerEvents: 'none',
      background: 'rgba(124,242,156,.09)', borderRadius: 2 }}>
      <div ref={fillRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 0,
        background: 'linear-gradient(180deg, rgba(34,197,139,.25), #2CE08E)',
        boxShadow: '0 0 12px rgba(44,224,142,.55)', borderRadius: 2, transition: 'height .12s ease-out' }} />
      <div ref={headRef} style={{ position: 'absolute', left: -4, top: '-5px', width: 10, height: 10, borderRadius: '50%',
        background: '#7CF29C', boxShadow: '0 0 14px rgba(124,242,156,.95), 0 0 30px rgba(34,197,139,.5)',
        transition: 'top .12s ease-out' }} />
    </div>
  );
}

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
              <div style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 13, color: '#22C58B', letterSpacing: '.12em', marginBottom: 12 }}>STEP {n}</div>
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>{t}</h3>
              <p className="muted" style={{ fontSize: 14 }}>{d}</p>
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
          <div style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 14, color: '#22C58B', letterSpacing: '.16em', marginBottom: 22 }}>
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
                <h2 style={{ fontSize: 'clamp(26px,3.6vw,44px)', marginBottom: 16 }}>{t}</h2>
                <p className="muted" style={{ fontSize: 16.5, maxWidth: 540, margin: '0 auto' }}>{d}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 40 }}>
            {steps.map((_, i) => <span key={i} className={'pin-dot' + (i === active ? ' on' : '')} />)}
          </div>
          <div className="dim" style={{ fontSize: 11.5, marginTop: 18 }}>Keep scrolling ↓</div>
        </div>
      </div>
    </div>
  );
}
