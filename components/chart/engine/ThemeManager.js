'use client';

// Theme token reader for canvas renderers. The DOM layer switches themes by
// toggling the `light-theme` class on the root element, but canvas pixels can't
// read CSS variables directly — so this module resolves the current theme
// tokens once per theme change and caches them. Every renderer draws from the
// same token set, so dark and light themes render identically except for the
// colors themselves (backgrounds/fills swap, accent/green/red stays constant).

// Token names mirror the CSS custom properties in globals.css.
const TOKEN_NAMES = [
  'bg', 'bg2', 'card', 'card2', 'line', 'line2',
  'blue', 'accent', 'green', 'red', 'gold', 'violet',
  'text', 'muted', 'dim',
];

let cache = null;
let cacheKey = 0;
let revision = 0;
const listeners = new Set();

// Subscribe to theme flips (light <-> dark). Engines holding cached canvas
// pixels (the offscreen base layer) must repaint on the next frame.
export function onThemeChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Bust the cache whenever the theme class changes (light <-> dark). The root
// element is the only place themes are toggled, so this is the single signal.
if (typeof window !== 'undefined' && document.documentElement) {
  const ro = new MutationObserver(() => { revision += 1; cache = null; listeners.forEach((fn) => fn()); });
  ro.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}

// Parse a CSS color (hex #rgb/#rrggbb, rgb(), or rgba()) into [r,g,b].
function parseRgb(color) {
  if (typeof color !== 'string') return null;
  let m = /^#([0-9a-f]{6})$/i.exec(color);
  if (m) {
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(color);
  if (m) return [parseInt(m[1] + m[1], 16), parseInt(m[2] + m[2], 16), parseInt(m[3] + m[3], 16)];
  m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i.exec(color);
  if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
  return null;
}

// Apply an alpha channel to any CSS color. Falls back to the original string
// when the color can't be parsed, so callers never lose styling.
export function alpha(color, opacity) {
  const rgb = parseRgb(color);
  if (!rgb) return color;
  const clamped = Math.max(0, Math.min(1, opacity || 1));
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${clamped})`;
}

// Read the live theme tokens from the root element's computed style.
// Cached per-revision so a full-frame render pass (many drawings) only pays the
// getComputedStyle cost once.
export function themeTokens() {
  if (cache && cacheKey === revision) return cache;
  const tokens = {};
  if (typeof document !== 'undefined' && document.documentElement) {
    const style = getComputedStyle(document.documentElement);
    for (const name of TOKEN_NAMES) {
      const value = style.getPropertyValue(`--${name}`).trim();
      tokens[name] = value || '';
    }
  }
  if (!cache) {
    // First run / SSR fallback: TradingView light defaults.
    Object.assign(tokens, {
      bg: tokens.bg || '#ffffff', bg2: tokens.bg2 || '#f8f9fa',
      card: tokens.card || '#ffffff', card2: tokens.card2 || '#fafafa',
      line: tokens.line || 'rgba(0,0,0,.06)', line2: tokens.line2 || 'rgba(0,0,0,.10)',
      blue: tokens.blue || '#2962ff', accent: tokens.accent || '#2962ff', green: tokens.green || '#26a69a',
      red: tokens.red || '#ef5350', gold: tokens.gold || '#F5B93E',
      text: tokens.text || '#131722', muted: tokens.muted || '#787b86',
      dim: tokens.dim || '#b2b5be',
    });
  }
  cache = { ...tokens, alpha };
  cacheKey = revision;
  return cache;
}
