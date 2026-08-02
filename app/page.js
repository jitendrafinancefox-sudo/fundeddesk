'use client';
/* ================================================================
   FundedDesk Landing v2 — FundedFirm-style structure, green theme
   Sections: announce bar, hero, stats, challenge picker (1/2-step
   + sizes), comparison table, steps, testimonials, CTA band
   ================================================================ */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

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
.market-band{height:5px;width:100%;position:relative;z-index:2;
  background:linear-gradient(90deg,#F0525F,#F5B93E,#22C58B,#2DD4BF,#22C58B,#F5B93E,#F0525F);
  background-size:300% 100%;animation:bandFlow 7s linear infinite;
  box-shadow:0 0 18px rgba(34,197,139,.35)}
@keyframes bandFlow{to{background-position:-300% 0}}

/* ---- v5 theme: rich emerald bg, glass cards, display type ---- */
.landing{--text:#F2FAF5;--muted:#A6BBAF;--dim:#6E8578}
.landing h1,.landing h2,.landing h3{font-family:'Unbounded','Manrope',sans-serif;letter-spacing:-.01em}
.landing h1{font-size:clamp(30px,4.3vw,50px)!important;line-height:1.14!important}
.landing .hero h1{font-size:clamp(30px,4.4vw,54px)!important;line-height:1.14!important;letter-spacing:-.01em!important}
.landing h2{font-size:clamp(23px,2.8vw,34px)!important}
.landing h3{font-size:16px!important}

.landing .tbl th{color:#7E9788}
.landing .grad-text{background:linear-gradient(96deg,#0E9F68,#22C58B);
 -webkit-background-clip:text;background-clip:text;color:transparent}

.landing [data-reveal]{opacity:0;transform:translateY(28px);
  transition:opacity .7s cubic-bezier(.2,.7,.3,1),transform .7s cubic-bezier(.2,.7,.3,1)}
.landing .in{opacity:1;transform:none}
.landing .grid3 > .card:nth-child(2){transition-delay:.12s}
.landing .grid3 > .card:nth-child(3){transition-delay:.24s}

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
      {/* announcement bar */}
      <div style={{ background: 'linear-gradient(90deg,#0B3D2A,#0E5C3C)', color: '#B9F5D8', textAlign: 'center', fontSize: 12.5, fontWeight: 600, padding: '7px 12px', letterSpacing: '.02em' }}>
        {ANNOUNCE[ann]}
      </div>

      {/* landing-only extra: scroll progress bar (mouse trail + background are now site-wide via layout.js) */}
      <ScrollPath />

      {/* HERO */}
      <header className="hero" style={{
        position: 'relative', textAlign: 'center', overflow: 'hidden',
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '90px 0',
      }}>
        <div style={{ position: 'absolute', inset: '-120px 0 0', background: 'radial-gradient(720px 400px at 50% -8%, rgba(34,197,139,.20), transparent 65%), radial-gradient(520px 300px at 82% 22%, rgba(124,242,156,.08), transparent 60%)', pointerEvents: 'none' }} />
        <NeuralSphere scale={1.15} blend="screen" />
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

      <div className="market-band" />

      {/* CHALLENGE PICKER */}
      <section id="challenge-picker" style={{ paddingTop: 24, scrollMarginTop: 90 }}>
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
    const dot = makeSprite(36, 'rgba(210,255,232,1)', 'rgba(34,197,139,.78)');
    const dotFlash = makeSprite(56, 'rgba(240,255,246,1)', 'rgba(34,197,139,.95)');

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
    let arcs = []; // tesla-coil style electric arcs between nearby nodes
    function boltPoints(a, b, segs) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const out = [a];
      segs.forEach((off, k) => {
        const tt = (k + 1) / (segs.length + 1);
        out.push({ x: a.x + dx * tt + nx * off * len, y: a.y + dy * tt + ny * off * len });
      });
      out.push(b);
      return out;
    }

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
        ctx.strokeStyle = 'rgba(34,197,139,' + (0.11 + 0.46 * depth).toFixed(3) + ')';
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
        const size = 6 + 15 * depth + 17 * boost;
        ctx.globalAlpha = Math.min(1, 0.48 + 0.85 * depth + 0.5 * boost);
        ctx.drawImage(boost > 0.05 ? dotFlash : dot, p.x - size / 2, p.y - size / 2, size, size);
      }
      ctx.globalAlpha = 1;

      // tesla-coil style electric sparks along nearby node connections
      if (arcs.length < 2 && Math.random() < 0.05) {
        let i = Math.floor(Math.random() * N), j = Math.floor(Math.random() * N);
        while (j === i) j = Math.floor(Math.random() * N);
        const segCount = 7 + Math.floor(Math.random() * 3);
        const segs = Array.from({ length: segCount }, () => (Math.random() - 0.5) * 1.1);
        arcs.push({ i, j, born: t, segs });
      }
      arcs = arcs.filter((a) => t - a.born < 340);
      arcs.forEach((a) => {
        const A = proj[a.i], B = proj[a.j];
        if (!A || !B) return;
        const age = t - a.born;
        const alpha = age < 40 ? age / 40 : 1 - (age - 40) / 300; // quick flash-in, longer fade-out
        const pts2 = boltPoints(A, B, a.segs);
        ctx.strokeStyle = 'rgba(150,255,205,' + (0.55 * alpha).toFixed(3) + ')';
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        pts2.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
        ctx.strokeStyle = 'rgba(235,255,245,' + (0.95 * alpha).toFixed(3) + ')';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        pts2.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.stroke();
        // small branching fork for extra realism
        if (pts2.length > 4) {
          const mid = pts2[Math.floor(pts2.length / 2)];
          const fork = { x: mid.x + (Math.random() - 0.5) * 40, y: mid.y + (Math.random() - 0.5) * 40 };
          ctx.strokeStyle = 'rgba(200,255,225,' + (0.5 * alpha).toFixed(3) + ')';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(mid.x, mid.y); ctx.lineTo(fork.x, fork.y); ctx.stroke();
        }
      });

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
        coreGrad.addColorStop(0, 'rgba(34,197,139,0.18)');
        coreGrad.addColorStop(0.55, 'rgba(34,197,139,0.07)');
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

/* ================================================================
   ScrollDiamond — original faceted 3D gem. Starts tilted/chaotic,
   straightens as you scroll through the hero (scroll-scrubbed
   rotation, not autoplay), settles into a gentle idle sway. Flat
   shaded facets in the brand palette. Pure canvas, no assets.
   ================================================================ */
function ScrollDiamond() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const DPR = Math.min(1.5, window.devicePixelRatio || 1);
    let W = 0, H = 0, raf = 0, running = true;

    function resize() {
      const r = canvas.parentElement.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();

    // ---- geometry: faceted bipyramid (gem) ----
    const N = 9, ringR = 1, topY = -1.5, botY = 1.85;
    const ring = [];
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      ring.push({ x: Math.cos(a) * ringR, y: 0, z: Math.sin(a) * ringR });
    }
    const apexTop = { x: 0, y: topY, z: 0 };
    const apexBot = { x: 0, y: botY, z: 0 };
    const faces = [];
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      faces.push({ v: [apexTop, ring[i], ring[j]], tone: 1 });
      faces.push({ v: [apexBot, ring[j], ring[i]], tone: 0.7 });
    }

    function rotate(p, rx, ry, rz) {
      let { x, y, z } = p;
      let c = Math.cos(rx), s = Math.sin(rx); let y1 = y * c - z * s, z1 = y * s + z * c; y = y1; z = z1;
      c = Math.cos(ry); s = Math.sin(ry); let x2 = x * c + z * s, z2 = -x * s + z * c; x = x2; z = z2;
      c = Math.cos(rz); s = Math.sin(rz); let x3 = x * c - y * s, y3 = x * s + y * c; x = x3; y = y3;
      return { x, y, z };
    }
    function faceNormal(a, b, c) {
      const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
      const v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
      const n = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
      const l = Math.hypot(n.x, n.y, n.z) || 1;
      return { x: n.x / l, y: n.y / l, z: n.z / l };
    }
    const light = (() => { const l = { x: 0.4, y: -0.6, z: 0.7 }; const m = Math.hypot(l.x, l.y, l.z); return { x: l.x / m, y: l.y / m, z: l.z / m }; })();

    const startRot = { x: 1.05, y: 2.35, z: 0.5 };
    const progRef = { v: 0 };
    function onScroll() {
      const heroH = window.innerHeight;
      progRef.v = Math.max(0, Math.min(1, window.scrollY / (heroH * 0.85)));
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);

    function frame(t) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      ctx.clearRect(0, 0, W, H);

      const p = progRef.v;
      const ease = 1 - Math.pow(1 - p, 2.2);           // scroll-scrubbed straightening
      const sway = ease * Math.sin(t * 0.0006) * 0.06; // gentle idle life once settled
      const rx = startRot.x * (1 - ease) + sway * 0.3;
      const ry = startRot.y * (1 - ease) + t * 0.00003 * (1 - ease * 0.75) + sway;
      const rz = startRot.z * (1 - ease);
      const scale = 0.82 + 0.22 * ease;

      const R = Math.min(W, H) * 0.30 * scale;
      const cx = W / 2, cy = H * 0.5, f = 3.4;

      const drawn = faces.map((fc) => {
        const pts3 = fc.v.map((v) => rotate(v, rx, ry, rz));
        const n = faceNormal(pts3[0], pts3[1], pts3[2]);
        const lightAmt = Math.abs(n.x * light.x + n.y * light.y + n.z * light.z);
        const avgZ = (pts3[0].z + pts3[1].z + pts3[2].z) / 3;
        const pts2 = pts3.map((rp) => { const s = f / (f + rp.z); return { x: cx + rp.x * R * s, y: cy + rp.y * R * s }; });
        return { pts2, avgZ, lightAmt, tone: fc.tone };
      }).sort((a, b) => b.avgZ - a.avgZ);

      drawn.forEach((fc) => {
        const b = 0.22 + 0.78 * fc.lightAmt;
        const rC = Math.round(18 + 30 * b);
        const gC = Math.round(110 + 120 * b * fc.tone);
        const bC = Math.round(85 + 70 * b * fc.tone);
        ctx.beginPath();
        ctx.moveTo(fc.pts2[0].x, fc.pts2[0].y);
        ctx.lineTo(fc.pts2[1].x, fc.pts2[1].y);
        ctx.lineTo(fc.pts2[2].x, fc.pts2[2].y);
        ctx.closePath();
        ctx.fillStyle = `rgba(${rC},${gC},${bC},.94)`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(210,255,230,.16)';
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // soft glow core
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.6);
      g.addColorStop(0, 'rgba(34,197,139,.10)');
      g.addColorStop(1, 'rgba(34,197,139,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    raf = requestAnimationFrame(frame);

    function onVis() { running = !document.hidden; if (running) raf = requestAnimationFrame(frame); }
    document.addEventListener('visibilitychange', onVis);
    return () => {
      running = false; cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return <canvas ref={ref} className="sphere-canvas" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />;
}

/* ================================================================
   LiveCandles — original animated candlestick visual for the hero.
   A trend continuously forms (new candle ticks in, oldest scrolls
   off), with a moving-average line. Cursor shows a crosshair +
   live price readout and highlights the nearest candle. Flat-shaded
   (no shadowBlur) for performance. Pure canvas, no assets.
   ================================================================ */
function LiveCandles() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const host = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    const DPR = Math.min(1.5, window.devicePixelRatio || 1);
    let W = 0, H = 0, raf = 0, running = true, visible = true, last = 0;

    function resize() {
      const r = host.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();

    // ---- synthetic bullish-biased random walk ----
    const COUNT = 46;
    let px = 100;
    const candles = [];
    function nextCandle(prevClose) {
      const drift = 0.62;                     // upward bias
      const vol = 2.6;
      const open = prevClose;
      let close = open + (Math.random() - 0.5 + drift * 0.35) * vol;
      const high = Math.max(open, close) + Math.random() * vol * 0.6;
      const low = Math.min(open, close) - Math.random() * vol * 0.6;
      return { open, high, low, close, bornAt: performance.now() };
    }
    for (let i = 0; i < COUNT; i++) {
      const c = nextCandle(px);
      candles.push(c); px = c.close;
      candles[candles.length - 1].bornAt = 0; // no grow-in for initial seed
    }

    const mouse = { x: -1, y: -1, over: false };
    function onMove(e) {
      const r = host.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; mouse.over = true;
    }
    function onLeave() { mouse.over = false; }
    host.addEventListener('mousemove', onMove);
    host.addEventListener('mouseleave', onLeave);

    function scale() {
      const pad = 26;
      let lo = Infinity, hi = -Infinity;
      candles.forEach((c) => { lo = Math.min(lo, c.low); hi = Math.max(hi, c.high); });
      const range = (hi - lo) || 1;
      return { lo, hi, range, toY: (p) => H - pad - ((p - lo) / range) * (H - pad * 2) };
    }

    function sma(n) {
      const out = [];
      for (let i = 0; i < candles.length; i++) {
        const s = Math.max(0, i - n + 1);
        const slice = candles.slice(s, i + 1);
        out.push(slice.reduce((a, c) => a + c.close, 0) / slice.length);
      }
      return out;
    }

    let tickTimer = 0;
    function frame(t) {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (!visible) return;
      if (t - last < 33) return; // ~30fps
      last = t;

      // tick a new candle in periodically
      tickTimer += 33;
      if (tickTimer > 1100) {
        tickTimer = 0;
        const c = nextCandle(candles[candles.length - 1].close);
        candles.push(c); candles.shift();
      }

      ctx.clearRect(0, 0, W, H);
      const { toY } = scale();
      const spacing = W / COUNT;
      const bodyW = Math.max(2, spacing * 0.52);

      // faint grid
      ctx.strokeStyle = 'rgba(255,255,255,.04)';
      ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) {
        const y = (H / 4) * i;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // moving average line
      const ma = sma(9);
      ctx.beginPath();
      ma.forEach((v, i) => {
        const x = spacing * i + spacing / 2;
        const y = toY(v);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.strokeStyle = 'rgba(245,185,62,.45)';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // nearest-candle-to-cursor index
      let nearest = -1;
      if (mouse.over) nearest = Math.max(0, Math.min(COUNT - 1, Math.floor(mouse.x / spacing)));

      candles.forEach((c, i) => {
        const x = spacing * i + spacing / 2;
        const grow = c.bornAt ? Math.min(1, (performance.now() - c.bornAt) / 420) : 1;
        const eased = 1 - Math.pow(1 - grow, 3);
        const baseline = i > 0 ? candles[i - 1].close : c.open;
        const open = baseline + (c.open - baseline) * eased;
        const close = baseline + (c.close - baseline) * eased;
        const high = baseline + (c.high - baseline) * eased;
        const low = baseline + (c.low - baseline) * eased;
        const up = close >= open;
        const isNear = i === nearest;

        const yO = toY(open), yC = toY(close), yH = toY(high), yL = toY(low);
        const bodyTop = Math.min(yO, yC), bodyH = Math.max(1.5, Math.abs(yC - yO));

        ctx.strokeStyle = up ? 'rgba(34,197,139,.55)' : 'rgba(240,82,95,.55)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, yH); ctx.lineTo(x, yL); ctx.stroke();

        ctx.fillStyle = up
          ? (isNear ? '#1FB981' : '#189164')
          : (isNear ? '#F0525F' : '#C24450');
        ctx.fillRect(x - bodyW / 2, bodyTop, bodyW, bodyH);

        if (isNear) {
          ctx.strokeStyle = 'rgba(255,255,255,.35)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x - bodyW / 2 - 1.5, bodyTop - 1.5, bodyW + 3, bodyH + 3);
        }
      });

      // crosshair + live price readout
      if (mouse.over) {
        ctx.strokeStyle = 'rgba(180,255,220,.28)';
        ctx.setLineDash([3, 4]);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(mouse.x, 0); ctx.lineTo(mouse.x, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, mouse.y); ctx.lineTo(W, mouse.y); ctx.stroke();
        ctx.setLineDash([]);

        const { lo, range } = scale();
        const price = lo + ((H - 26 - mouse.y) / (H - 52)) * range;
        const label = price.toFixed(1);
        ctx.font = '600 11px Inter, sans-serif';
        const tw = ctx.measureText(label).width + 14;
        const ly = Math.max(12, Math.min(H - 12, mouse.y));
        ctx.fillStyle = 'rgba(34,197,139,.92)';
        ctx.fillRect(W - tw - 6, ly - 10, tw, 20);
        ctx.fillStyle = '#04150D';
        ctx.fillText(label, W - tw + 1, ly + 4);
      }
    }
    raf = requestAnimationFrame(frame);

    const io = new IntersectionObserver((en) => { visible = en[0]?.isIntersecting !== false; });
    io.observe(host);
    function onVis() { running = !document.hidden; if (running) { last = 0; raf = requestAnimationFrame(frame); } }
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      running = false; cancelAnimationFrame(raf); io.disconnect();
      host.removeEventListener('mousemove', onMove);
      host.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return <canvas ref={ref} className="sphere-canvas" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />;
}

/* ================================================================
   SaturnScene — premium 3D-feel Saturn behind the hero (Canvas 2D,
   no new dependencies, GPU-composited by the browser). Planet spins
   slowly; rings spin independently with their own faint divisions;
   gentle eased mouse parallax (max ~20px, no snapping); on scroll
   the rings separate from the planet, flatten, and stretch into a
   giant slow-rotating horizontal band behind the content. Respects
   prefers-reduced-motion. Nothing else on the page was touched.
   ================================================================ */
function SaturnScene() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const host = canvas.parentElement;
    const ctx = canvas.getContext('2d');
    const DPR = Math.min(1.5, window.devicePixelRatio || 1);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let W = 0, H = 0, raf = 0, running = true, visible = true;

    function resize() {
      const r = host.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();

    // ---- gentle eased mouse parallax (max ~20px, lerped — no snapping) ----
    const par = { x: 0, y: 0, tx: 0, ty: 0 };
    function onMove(e) {
      if (reduced) return;
      const r = host.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      par.tx = Math.max(-20, Math.min(20, (mx - W / 2) / 16));
      par.ty = Math.max(-14, Math.min(14, (my - H * 0.46) / 20));
    }
    function onLeave() { par.tx = 0; par.ty = 0; }
    host.addEventListener('mousemove', onMove);
    host.addEventListener('mouseleave', onLeave);

    // ---- scroll: rings separate, flatten, and stretch into a band ----
    let scrollP = 0;
    function onScroll() {
      const heroH = window.innerHeight;
      const raw = Math.max(0, Math.min(1, window.scrollY / (heroH * 0.85)));
      scrollP = 1 - Math.pow(1 - raw, 2);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);

    let planetSpin = 0, ringSpin = 0;

    function drawRingHalf(cx, cy, rxO, ryO, rxI, ryI, rot, startA, endA, alpha) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, rxO, ryO, 0, startA, endA, false);
      ctx.ellipse(0, 0, rxI, ryI, 0, endA, startA, true);
      ctx.closePath();
      const g = ctx.createLinearGradient(-rxO, 0, rxO, 0);
      g.addColorStop(0, `rgba(244,214,163,${0.08 * alpha})`);
      g.addColorStop(0.5, `rgba(252,232,196,${0.46 * alpha})`);
      g.addColorStop(1, `rgba(244,214,163,${0.08 * alpha})`);
      ctx.fillStyle = g;
      ctx.fill();
      for (let i = 0; i < 3; i++) {
        const f = 0.4 + i * 0.24;
        ctx.beginPath();
        ctx.ellipse(0, 0, rxO * f, ryO * f, 0, startA, endA, false);
        ctx.strokeStyle = `rgba(30,26,18,${0.09 * alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }

    function frame() {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (!visible) return;

      if (!reduced) { planetSpin += 0.0022; ringSpin += 0.0015; }
      par.x += (par.tx - par.x) * 0.07;
      par.y += (par.ty - par.y) * 0.07;

      ctx.clearRect(0, 0, W, H);

      const cx = W / 2 + par.x, cy = H * 0.46 + par.y;
      const baseR = Math.min(W, H) * 0.15;

      const squash = 0.34 - 0.27 * scrollP;              // flattens toward a band
      const rxOuter = baseR * (1.7 + 3.0 * scrollP);     // stretches wide across hero
      const ryOuter = rxOuter * squash;
      const rxInner = baseR * 1.18;
      const ryInner = rxInner * squash;
      const ringRot = ringSpin * 0.12 + par.x * 0.006;   // spins + subtly reacts to cursor

      // soft ambient glow behind everything
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR * 3.2);
      glow.addColorStop(0, 'rgba(245,214,160,.10)');
      glow.addColorStop(1, 'rgba(245,214,160,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

      // back half of the rings (behind the planet)
      drawRingHalf(cx, cy, rxOuter, ryOuter, rxInner, ryInner, ringRot, Math.PI, Math.PI * 2, 0.85);

      // planet — lit sphere with soft terminator + slowly shifting bands
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
      ctx.clip();
      const lightX = cx - baseR * 0.42, lightY = cy - baseR * 0.5;
      const body = ctx.createRadialGradient(lightX, lightY, baseR * 0.08, cx, cy, baseR * 1.2);
      body.addColorStop(0, '#FCEFD3');
      body.addColorStop(0.42, '#E9C88E');
      body.addColorStop(0.75, '#9E7C4F');
      body.addColorStop(1, '#3F3220');
      ctx.fillStyle = body;
      ctx.fillRect(cx - baseR, cy - baseR, baseR * 2, baseR * 2);
      ctx.globalAlpha = 0.14;
      for (let i = -3; i <= 3; i++) {
        const by = cy + i * baseR * 0.27 + Math.sin(planetSpin * 3 + i) * 1.5;
        ctx.beginPath();
        ctx.ellipse(cx, by, baseR * 0.99, baseR * 0.085, 0, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? '#7C5C34' : '#F0D9A8';
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // thin atmospheric rim light
      ctx.beginPath();
      ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(252,239,211,.28)';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // front half of the rings (in front of the planet)
      drawRingHalf(cx, cy, rxOuter, ryOuter, rxInner, ryInner, ringRot, 0, Math.PI, 1);
    }
    raf = requestAnimationFrame(frame);

    const io = new IntersectionObserver((en) => { visible = en[0]?.isIntersecting !== false; });
    io.observe(host);
    function onVis() { running = !document.hidden; if (running) raf = requestAnimationFrame(frame); }
    document.addEventListener('visibilitychange', onVis);
    return () => {
      running = false; cancelAnimationFrame(raf); io.disconnect();
      host.removeEventListener('mousemove', onMove);
      host.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  return <canvas ref={ref} className="sphere-canvas" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />;
}
