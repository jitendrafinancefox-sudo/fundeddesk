'use client';
import { useEffect, useRef } from 'react';

/* ================================================================
   SiteBackground — the landing page's layered background (gradient
   wash + faint grid + film grain + drifting stars), extracted so
   every page on the site can share the exact same premium look.
   Fixed, z-index behind everything, pointer-events:none — purely
   ambient, doesn't interfere with any page's own content/interaction.
   ================================================================ */
export default function SiteBackground() {
  return (
    <>
      <div className="bg-base" />
      <div className="bg-grid" />
      <div className="bg-noise" />
      <StarField />
      <MouseTrail />
    </>
  );
}

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
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        ctx.strokeStyle = 'rgba(34,197,139,' + (0.38 * b.life).toFixed(3) + ')';
        ctx.lineWidth = 1.4 + 3.2 * b.life;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      for (let i = 0; i < pts.length; i += 3) {
        const p = pts[i];
        const s = 10 + 30 * p.life;
        ctx.globalAlpha = 0.55 * p.life;
        ctx.drawImage(spr, p.x - s / 2, p.y - s / 2, s, s);
      }
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
      if (t - last < 50) return; // 20fps is plenty for dust
      last = t;
      ctx.clearRect(0, 0, W, H);
      for (const s of stars) {
        s.y -= s.v; s.tw += 0.015;
        if (s.y < -4) { s.y = H + 4; s.x = Math.random() * W; }
        const a = 0.30 + 0.38 * (0.5 + 0.5 * Math.sin(s.tw));
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
  return <canvas ref={ref} style={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none' }} />;
}
