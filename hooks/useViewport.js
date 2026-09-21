'use client';
import { useEffect, useState } from 'react';

// SSR-safe viewport breakpoint check. Starts `false` (server + first paint
// both assume desktop, avoiding a hydration mismatch) and corrects itself
// via matchMedia immediately after mount, then tracks live resizes.
export function useIsMobile(breakpoint = 880) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width:${breakpoint}px)`);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [breakpoint]);
  return isMobile;
}
