'use client';

import { useEffect, useRef, useState } from 'react';

const TOTAL_FRAMES = 258;
const FRAME_STEP = 2; // Use every 2nd frame to reduce load (129 frames)
const FRAMES = Array.from({ length: Math.ceil(TOTAL_FRAMES / FRAME_STEP) }, (_, i) =>
  `/sequence/ezgif-frame-${String((i * FRAME_STEP) + 1).padStart(3, '0')}.jpg`
);

export default function HeroSequence() {
  const canvasRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [frameIdx, setFrameIdx] = useState(0);
  const imagesRef = useRef([]);
  const rafRef = useRef(0);
  const currentFrameRef = useRef(-1);
  const loadingCountRef = useRef(0);

  // Preload images
  useEffect(() => {
    let cancelled = false;
    loadingCountRef.current = 0;

    FRAMES.forEach((src, i) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loadingCountRef.current++;
        imagesRef.current[i] = img;
        if (!cancelled && loadingCountRef.current === FRAMES.length) {
          setLoaded(true);
        }
      };
      img.onerror = () => {
        loadingCountRef.current++;
        if (!cancelled && loadingCountRef.current === FRAMES.length) {
          setLoaded(true);
        }
      };
    });

    return () => { cancelled = true; };
  }, []);

  // Scroll handler - compute frame from scroll position
  useEffect(() => {
    const hero = document.querySelector('header.hero');
    if (!hero) return;

    function onScroll() {
      const rect = hero.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const heroHeight = rect.height;

      // Progress 0-1 as hero exits viewport (top hits -heroHeight, bottom hits 0)
      const start = -heroHeight;
      const end = 0;
      const progress = (rect.top - end) / (start - end);
      const clamped = Math.max(0, Math.min(1, progress));

      const targetFrame = Math.floor(clamped * (FRAMES.length - 1));
      if (targetFrame !== currentFrameRef.current) {
        currentFrameRef.current = targetFrame;
        setFrameIdx(targetFrame);
      }
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Draw loop - only redraws when frameIdx changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded) return;

    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    function draw() {
      const img = imagesRef.current[frameIdx];
      if (!img) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const canvasRect = canvas.getBoundingClientRect();
      const cw = canvasRect.width;
      const ch = canvasRect.height;

      // Cover behavior: crop to fill
      const imgAR = img.naturalWidth / img.naturalHeight;
      const canvasAR = cw / ch;
      let sx, sy, sWidth, sHeight;

      if (imgAR > canvasAR) {
        sHeight = img.naturalHeight;
        sWidth = sHeight * canvasAR;
        sx = (img.naturalWidth - sWidth) / 2;
        sy = 0;
      } else {
        sWidth = img.naturalWidth;
        sHeight = sWidth / canvasAR;
        sx = 0;
        sy = (img.naturalHeight - sHeight) / 2;
      }

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, cw, ch);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [loaded, frameIdx]);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      zIndex: 0,
      background: 'radial-gradient(720px 400px at 50% -8%, rgba(34,197,139,.20), transparent 65%), radial-gradient(520px 300px at 82% 22%, rgba(124,242,156,.08), transparent 60%)',
    }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.6s ease-out',
        }}
      />
      {!loaded && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(720px 400px at 50% -8%, rgba(34,197,139,.20), transparent 65%), radial-gradient(520px 300px at 82% 22%, rgba(124,242,156,.08), transparent 60%)',
        }} />
      )}
    </div>
  );
}