'use client';
import { useEffect, useRef, useState } from 'react';

export default function ScrollPath() {
  const fillRef = useRef(null);
  const headRef = useRef(null);
  // Starts false on both server and the client's first paint — reading
  // window.innerWidth directly in the render body (as this used to) makes
  // the client's very first render diverge from the server-rendered HTML,
  // which forces React to discard and fully re-render the page tree on
  // every load. Deciding visibility in an effect instead means the rail
  // only ever appears after hydration has already reconciled cleanly.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function checkWidth() { setVisible(window.innerWidth >= 760); }
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  useEffect(() => {
    if (!visible) return;
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
  }, [visible]);

  if (!visible) return null;
  return (
    <div style={{ position: 'fixed', left: 22, top: 110, bottom: 40, width: 2, zIndex: 100, pointerEvents: 'none',
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
