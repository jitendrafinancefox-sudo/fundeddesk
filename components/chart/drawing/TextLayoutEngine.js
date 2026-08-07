'use client';
import { resolveFont, fontString, measureText } from './FontManager';

// Text layout: multi-line word wrap, auto-size and per-line geometry for the
// text-tool family. Pure functions; the renderer passes a measure function
// (ctx.measureText) so the same math drives preview, hit tests and painting.

export const DEFAULT_AUTO_WIDTH = 320; // auto-size caps the box at this many px wide

// Greedy word wrap; over-long words break at the width. Empty lines survive.
export function wrapLine(line, maxWidth, measure) {
  if (line === '') return [''];
  const words = line.split(/\s+/);
  const lines = [];
  let current = '';
  const flush = (next) => { if (current) { lines.push(current); current = ''; } if (next) current = next; };
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) <= maxWidth) { current = candidate; return; }
    if (word.length > 1 && measure(word) > maxWidth) {
      // break the long word at the wrap point
      flush();
      let rest = word;
      while (rest.length > 1 && measure(rest) > maxWidth) {
        let take = rest.length;
        while (take > 1 && measure(rest.slice(0, take)) > maxWidth) take -= 1;
        lines.push(rest.slice(0, take));
        rest = rest.slice(take);
      }
      current = rest;
      return;
    }
    flush(word);
  });
  lines.push(current);
  return lines;
}

export function wrapText(content, maxWidth, measure) {
  return String(content || '').split('\n').flatMap((line) => wrapLine(line, maxWidth, measure));
}

// Auto-size box (px) for the content at the resolved font: wraps at the
// default width, then sizes the box to the wrapped lines + padding.
export function autoBox(content, cfg, boxStyle, measure, maxWidth = DEFAULT_AUTO_WIDTH) {
  const lines = wrapText(content, maxWidth, measure);
  const width = Math.min(maxWidth, Math.max(...lines.map((line) => measure(line)), 20)) + (boxStyle.padding || 10) * 2;
  const height = lines.length * cfg.size * cfg.lineHeight + (boxStyle.padding || 10) * 2;
  return { width: Math.max(40, width), height: Math.max(24, height) };
}

// Full layout of a text drawing in screen space: anchor pixel, box, line
// boxes and content rect. `box` may come from a manual resize (text.box) or
// the auto-size measurement. Rotation is NOT applied here — renderer and
// geometry rotate the unrotated rect around its center.
export function textLayout(drawing, transform, measure) {
  const cfg = resolveFont(drawing);
  const boxStyle = drawing.text?.boxStyle || {};
  const content = drawing.text?.content || '';
  const box = drawing.text?.box || autoBox(content, cfg, boxStyle, measure);
  const origin = transform.anchorToPixel(drawing.anchorPoints[0]);
  if (!origin) return null;
  const padding = Math.min(box.width / 2 - 1, Math.max(0, Number(boxStyle.padding) || 10));
  const contentRect = { x: origin.x + padding, y: origin.y + padding, width: Math.max(1, box.width - padding * 2), height: Math.max(1, box.height - padding * 2) };
  const lineHeight = cfg.size * cfg.lineHeight;
  const lines = wrapText(content, contentRect.width, (text) => measure(text, cfg));
  return {
    cfg, boxStyle, box, origin,
    rect: { x: origin.x, y: origin.y, width: box.width, height: box.height },
    contentRect, lineHeight, lines, rotation: Number(drawing.text?.rotation) || 0,
  };
}
export { fontString };
