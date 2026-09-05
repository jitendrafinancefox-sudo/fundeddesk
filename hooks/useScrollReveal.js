'use client';

import { useInView } from 'framer-motion';
import { useRef, useEffect } from 'react';

export function useScrollReveal(options = {}) {
  const {
    threshold = 0.15,
    once = true,
    rootMargin = '0px 0px -10% 0px',
  } = options;

  const ref = useRef(null);
  const isInView = useInView(ref, {
    once,
    margin: rootMargin,
    amount: threshold,
  });

  return { ref, isInView };
}

export function useStaggeredReveal(itemCount, options = {}) {
  const {
    threshold = 0.15,
    once = true,
    rootMargin = '0px 0px -10% 0px',
    staggerDelay = 0.08,
    startDelay = 0,
  } = options;

  const ref = useRef(null);
  const isInView = useInView(ref, {
    once,
    margin: rootMargin,
    amount: threshold,
  });

  const delays = Array.from({ length: itemCount }, (_, i) =>
    startDelay + i * staggerDelay
  );

  return { ref, isInView, delays };
}