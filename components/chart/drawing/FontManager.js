'use client';

// Font resolution + measurement cache for the text-tool family. Pure module:
// no canvas dependencies — callers pass a measure function (the canvas
// context's measureText) and get deterministic metrics. Text width depends
// only on (font, text), so results are cached by font key to keep 20k+
// drawings fast.

export const FONT_FAMILIES = ['Inter', 'Poppins', 'Roboto', 'JetBrains Mono', 'Georgia', 'Arial', 'sans-serif'];
export const DEFAULT_FONT = { family: 'Inter', size: 13, bold: false, italic: false, underline: false, align: 'left', letterSpacing: 0, lineHeight: 1.35 };

function resolveFontFrom(font) {
  return {
    family: FONT_FAMILIES.includes(font.family) ? font.family : DEFAULT_FONT.family,
    size: typeof font.size === 'number' && Number.isFinite(font.size) ? Math.min(72, Math.max(8, font.size)) : DEFAULT_FONT.size,
    bold: Boolean(font.bold),
    italic: Boolean(font.italic),
    underline: Boolean(font.underline),
    align: ['left', 'center', 'right'].includes(font.align) ? font.align : DEFAULT_FONT.align,
    letterSpacing: typeof font.letterSpacing === 'number' && Number.isFinite(font.letterSpacing) ? Math.min(20, Math.max(-2, font.letterSpacing)) : DEFAULT_FONT.letterSpacing,
    lineHeight: typeof font.lineHeight === 'number' && Number.isFinite(font.lineHeight) ? Math.min(3, Math.max(1, font.lineHeight)) : DEFAULT_FONT.lineHeight,
  };
}

// Merge drawing.text.font over the defaults (missing fields fall back).
// Null/undefined drawing is tolerated so the module never crashes during
// preview render or before a drawing is fully hydrated.
export function resolveFont(drawing) {
  const font = (drawing && drawing.text) ? (drawing.text.font || {}) : {};
  return resolveFontFrom(font);
}

// Null-safe: a missing/undefined cfg falls back to DEFAULT_FONT so callers
// never hit a "cannot read property of undefined" crash.
export function fontString(cfg) {
  const config = (cfg && cfg.family !== undefined) ? cfg : resolveFontFrom({});
  const italic = config.italic ? 'italic ' : '';
  const weight = config.bold ? '700' : '400';
  const size = config.size || DEFAULT_FONT.size;
  const family = config.family || DEFAULT_FONT.family;
  return `${italic}${weight} ${size}px ${family}`;
}

// Cached measurement: keyed by the exact font string + text, so repeated
// wraps and layout passes never re-measure the same line.
const widthCache = new Map(); // fontKey -> Map(text -> width)
const CACHE_LIMIT = 20000;
export function measureText(ctx, text, cfg) {
  let perFont = widthCache.get(fontString(cfg));
  if (!perFont) { perFont = new Map(); widthCache.set(fontString(cfg), perFont); }
  const cached = perFont.get(text);
  if (cached != null) return cached;
  let width = 0;
  if (ctx?.measureText) width = ctx.measureText(text).width;
  if (perFont.size > CACHE_LIMIT) perFont.clear();
  perFont.set(text, width);
  return width;
}
