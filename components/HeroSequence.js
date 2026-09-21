'use client';

import { useEffect, useRef, useState } from 'react';

const TOTAL_FRAMES = 258;
const FRAME_STEP = 2;
const FRAMES = Array.from({ length: Math.ceil(TOTAL_FRAMES / FRAME_STEP) }, (_, i) =>
  `/sequence/ezgif-frame-${String((i * FRAME_STEP) + 1).padStart(3, '0')}.jpg`
);

export default function HeroSequence({ progress }) {
  const canvasRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
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

  // Update frame index from progress prop (0-1)
  useEffect(() => {
    const targetFrame = Math.floor(progress * (FRAMES.length - 1));
    if (targetFrame !== currentFrameRef.current) {
      currentFrameRef.current = targetFrame;
    }
  }, [progress]);

  // Draw loop
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
      const frameIdx = currentFrameRef.current;
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
  }, [loaded]);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      zIndex: 0,
      background: '#040806', // Dark fallback matching sequence
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
          background: '#040806',
        }} />
      )}
      {/* Dark overlay for text contrast - subtle, lets sequence show through */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(4,8,6,0.3) 0%, rgba(4,8,6,0.55) 50%, rgba(4,8,6,0.75) 100%)',
        zIndex: 1,
      }} />
    </div>
  );
}