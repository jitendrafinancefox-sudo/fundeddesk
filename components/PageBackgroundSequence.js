'use client';

import { useEffect, useRef, useState } from 'react';

const TOTAL_FRAMES = 258;
const FRAME_STEP = 2;
const FRAMES = Array.from({ length: Math.ceil(TOTAL_FRAMES / FRAME_STEP) }, (_, i) =>
  `/sequence/ezgif-frame-${String((i * FRAME_STEP) + 1).padStart(3, '0')}.jpg`
);

export default function PageBackgroundSequence() {
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

  // Scroll handler - map full page scroll to frame index
  useEffect(() => {
    function onScroll() {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight;
      const viewportHeight = window.innerHeight;
      const maxScroll = docHeight - viewportHeight;
      const progress = maxScroll > 0 ? Math.max(0, Math.min(1, scrollTop / maxScroll)) : 0;

      const targetFrame = Math.floor(progress * (FRAMES.length - 1));
      if (targetFrame !== currentFrameRef.current) {
        currentFrameRef.current = targetFrame;
      }
    }

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Draw loop with depth effects
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

    // Pre-create vignette gradient
    let vignetteGrad = null;
    let vignetteKey = '';
    function getVignette(cw, ch) {
      const key = `${cw}x${ch}`;
      if (vignetteKey === key && vignetteGrad) return vignetteGrad;
      vignetteKey = key;
      vignetteGrad = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, Math.max(cw, ch) * 0.72);
      vignetteGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vignetteGrad.addColorStop(0.55, 'rgba(0,0,0,0.18)');
      vignetteGrad.addColorStop(0.78, 'rgba(0,0,0,0.42)');
      vignetteGrad.addColorStop(1, 'rgba(4,8,6,0.85)');
      return vignetteGrad;
    }

    // Pre-create atmospheric haze gradient
    let hazeGrad = null;
    let hazeKey = '';
    function getHaze(cw, ch) {
      const key = `${cw}x${ch}`;
      if (hazeKey === key && hazeGrad) return hazeGrad;
      hazeKey = key;
      hazeGrad = ctx.createLinearGradient(0, 0, 0, ch);
      hazeGrad.addColorStop(0, 'rgba(34,197,139,0.015)');
      hazeGrad.addColorStop(0.3, 'rgba(34,197,139,0.008)');
      hazeGrad.addColorStop(0.55, 'rgba(4,8,6,0.02)');
      hazeGrad.addColorStop(0.78, 'rgba(4,8,6,0.06)');
      hazeGrad.addColorStop(1, 'rgba(4,8,6,0.12)');
      return hazeGrad;
    }

    // Pre-create volumetric fog gradient (subtle green glow at bottom)
    let fogGrad = null;
    let fogKey = '';
    function getFog(cw, ch) {
      const key = `${cw}x${ch}`;
      if (fogKey === key && fogGrad) return fogGrad;
      fogKey = key;
      fogGrad = ctx.createRadialGradient(cw / 2, ch * 0.85, 0, cw / 2, ch * 0.85, ch * 0.9);
      fogGrad.addColorStop(0, 'rgba(34,197,139,0.035)');
      fogGrad.addColorStop(0.4, 'rgba(34,197,139,0.012)');
      fogGrad.addColorStop(0.7, 'rgba(4,8,6,0.02)');
      fogGrad.addColorStop(1, 'rgba(4,8,6,0)');
      return fogGrad;
    }

    // Comprehensive watermark mask - covers common watermark positions
    // ezgif: bottom right ~15% of image
    // Gemini: often top-right, bottom-right, or center
    function drawWatermarkMask(cw, ch) {
      // 1. ezgif bottom-right mask (original)
      const maskW = cw * 0.28;
      const maskH = ch * 0.14;
      let x = cw - maskW;
      let y = ch - maskH;
      
      let maskGrad = ctx.createLinearGradient(x, y, x, y + maskH);
      maskGrad.addColorStop(0, 'rgba(4,8,6,0)');
      maskGrad.addColorStop(0.3, 'rgba(4,8,6,0.35)');
      maskGrad.addColorStop(0.6, 'rgba(4,8,6,0.75)');
      maskGrad.addColorStop(1, 'rgba(4,8,6,0.95)');
      ctx.fillStyle = maskGrad;
      ctx.fillRect(x, y, maskW, maskH);
      
      // 2. Gemini top-right mask (common position for Gemini branding)
      const geminiMaskW = cw * 0.22;
      const geminiMaskH = ch * 0.12;
      x = cw - geminiMaskW;
      y = 0;
      
      maskGrad = ctx.createLinearGradient(x, y, x, y + geminiMaskH);
      maskGrad.addColorStop(0, 'rgba(4,8,6,0.9)');
      maskGrad.addColorStop(0.4, 'rgba(4,8,6,0.6)');
      maskGrad.addColorStop(0.7, 'rgba(4,8,6,0.25)');
      maskGrad.addColorStop(1, 'rgba(4,8,6,0)');
      ctx.fillStyle = maskGrad;
      ctx.fillRect(x, y, geminiMaskW, geminiMaskH);
      
      // 3. Gemini bottom-right mask (alternative position)
      x = cw - geminiMaskW;
      y = ch - geminiMaskH;
      
      maskGrad = ctx.createLinearGradient(x, y, x, y + geminiMaskH);
      maskGrad.addColorStop(0, 'rgba(4,8,6,0)');
      maskGrad.addColorStop(0.3, 'rgba(4,8,6,0.4)');
      maskGrad.addColorStop(0.7, 'rgba(4,8,6,0.85)');
      maskGrad.addColorStop(1, 'rgba(4,8,6,0.98)');
      ctx.fillStyle = maskGrad;
      ctx.fillRect(x, y, geminiMaskW, geminiMaskH);
      
      // 4. Center-bottom area mask (for any centered watermarks)
      const centerMaskW = cw * 0.35;
      const centerMaskH = ch * 0.08;
      x = (cw - centerMaskW) / 2;
      y = ch - centerMaskH - ch * 0.05;
      
      maskGrad = ctx.createLinearGradient(x, y, x, y + centerMaskH);
      maskGrad.addColorStop(0, 'rgba(4,8,6,0)');
      maskGrad.addColorStop(0.5, 'rgba(4,8,6,0.5)');
      maskGrad.addColorStop(1, 'rgba(4,8,6,0.85)');
      ctx.fillStyle = maskGrad;
      ctx.fillRect(x, y, centerMaskW, centerMaskH);
      
      // 5. Also mask bottom edge more broadly for any watermark variations
      const bottomMask = ctx.createLinearGradient(0, ch * 0.88, 0, ch);
      bottomMask.addColorStop(0, 'rgba(4,8,6,0)');
      bottomMask.addColorStop(0.5, 'rgba(4,8,6,0.25)');
      bottomMask.addColorStop(1, 'rgba(4,8,6,0.6)');
      ctx.fillStyle = bottomMask;
      ctx.fillRect(0, ch * 0.88, cw, ch * 0.12);
    }

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
      
      // Draw base frame
      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, cw, ch);
      
      // Apply ezgif watermark mask (covers bottom right where ezgif puts watermark)
      drawWatermarkMask(cw, ch);
      
      // Atmospheric haze layer (subtle green tint, top to bottom)
      ctx.fillStyle = getHaze(cw, ch);
      ctx.fillRect(0, 0, cw, ch);
      
      // Volumetric fog at bottom (subtle green glow)
      ctx.fillStyle = getFog(cw, ch);
      ctx.fillRect(0, 0, cw, ch);
      
      // Cinematic vignette
      ctx.fillStyle = getVignette(cw, ch);
      ctx.fillRect(0, 0, cw, ch);
      
      // Subtle film grain overlay (very subtle)
      if (Math.random() < 0.02) { // Only occasionally to save performance
        ctx.fillStyle = 'rgba(255,255,255,0.003)';
        for (let i = 0; i < 30; i++) {
          const gx = Math.random() * cw;
          const gy = Math.random() * ch;
          const gs = 1 + Math.random() * 2;
          ctx.fillRect(gx, gy, gs, gs);
        }
      }

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
      position: 'fixed',
      inset: 0,
      overflow: 'hidden',
      zIndex: -1,
      pointerEvents: 'none',
      background: '#040806',
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
      {/* Persistent dark scrim for text readability - lighter now since we have depth effects */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(4,8,6,0.45)',
        zIndex: 0,
      }} />
      {/* Additional cinematic color grading overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(180deg, rgba(4,8,6,0.15) 0%, rgba(4,8,6,0.05) 35%, rgba(4,8,6,0.08) 65%, rgba(4,8,6,0.18) 100%)',
        zIndex: 0,
        pointerEvents: 'none',
      }} />
    </div>
  );
}