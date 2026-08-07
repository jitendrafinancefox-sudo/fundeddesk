'use client';
import { rectFromPoints } from './GeometryPrimitives';
import { resolveFont } from './FontManager';
import { themeTokens } from '../engine/ThemeManager';

// Type registry + screen-space geometry for the text-tool family. Boxes are
// anchored at one data point (the top-left corner) with a pixel box, so they
// keep a constant screen size during zoom/pan (TradingView behavior) while
// the anchor stays pinned to market data. Rotation (future-ready) rotates
// the box around its center in screen space.

export const TEXT_TYPES = ['text', 'anchoredText', 'note', 'callout', 'arrowCallout', 'balloon', 'infoBox'];
export const LABEL_TYPES = ['label', 'priceLabel', 'timeLabel'];
export const isTextType = (drawingType) => TEXT_TYPES.includes(drawingType) || LABEL_TYPES.includes(drawingType);
export const isLabelType = (drawingType) => LABEL_TYPES.includes(drawingType);

// Per-tool visual defaults (text color lives in style.color; box visuals in
// text.boxStyle; labels get pill defaults). All colors resolve through the
// ThemeManager so dark and light themes paint consistently.
export const textColorFor = (drawingType) => {
  const t = themeTokens();
  return ({
    text: t.text, anchoredText: t.text, note: '#78350f', callout: t.text, arrowCallout: t.text, balloon: t.text, infoBox: '#dbeafe', label: t.text, priceLabel: t.green, timeLabel: '#93c5fd',
  }[drawingType] || t.text);
};

export function textDefaults(drawingType) {
  const t = themeTokens();
  const boxStyle = drawingType === 'note'
    ? { padding: 10, radius: 6, background: '#fde68a', border: '#f59e0b', borderWidth: 1, opacity: 1 }
    : drawingType === 'balloon'
      ? { padding: 12, radius: 14, background: t.card, border: t.line2, borderWidth: 1, opacity: 1 }
      : drawingType === 'infoBox'
        ? { padding: 10, radius: 8, background: t.alpha(t.accent, 0.14), border: t.accent, borderWidth: 1.5, opacity: 1 }
        : { padding: 10, radius: 8, background: t.alpha(t.card, 0.92), border: t.alpha(t.muted, 0.35), borderWidth: 1, opacity: 1 };
  return {
    content: '',
    box: null,
    autoSize: true,
    rotation: 0,
    font: {},
    boxStyle,
    side: 'auto',
    pointer: 'auto',
    snapToCandle: true,
  };
}

// No-measure estimate of the auto-size box (dirty rects, hit tests, handles).
export function estimateBox(drawing) {
  const box = drawing.text?.box;
  if (box && Number.isFinite(box.width) && Number.isFinite(box.height)) return { width: Math.max(40, box.width), height: Math.max(24, box.height) };
  const cfg = resolveFont(drawing);
  const content = drawing.text?.content || '';
  const padding = Number(drawing.text?.boxStyle?.padding) || 10;
  const lines = content.split('\n');
  const maxLen = Math.max(...lines.map((line) => line.length), 1);
  return {
    width: Math.max(40, Math.min(320, maxLen * cfg.size * 0.62) + padding * 2),
    height: Math.max(24, lines.length * cfg.size * cfg.lineHeight + padding * 2),
  };
}

export function textAnchorPoint(drawing, transform) {
  return transform.anchorToPixel(drawing.anchorPoints[0]) || null;
}

export function textCenter(drawing, transform) {
  const origin = textAnchorPoint(drawing, transform);
  if (!origin) return null;
  const box = estimateBox(drawing);
  return { x: origin.x + box.width / 2, y: origin.y + box.height / 2 };
}

const rad = (deg) => (deg * Math.PI) / 180;
const rotatePoint = (p, center, angle) => {
  const cos = Math.cos(angle); const sin = Math.sin(angle);
  const dx = p.x - center.x; const dy = p.y - center.y;
  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
};

// Rotated corners (TL/TR/BR/BL) of the box; falls back to the unrotated
// rect when the rotation is 0.
export function textCorners(drawing, transform, box = estimateBox(drawing)) {
  const origin = textAnchorPoint(drawing, transform);
  if (!origin) return null;
  const corners = [
    { x: origin.x, y: origin.y },
    { x: origin.x + box.width, y: origin.y },
    { x: origin.x + box.width, y: origin.y + box.height },
    { x: origin.x, y: origin.y + box.height },
  ];
  const rotation = Number(drawing.text?.rotation) || 0;
  if (!rotation) return corners;
  const center = { x: origin.x + box.width / 2, y: origin.y + box.height / 2 };
  const angle = rad(rotation);
  return corners.map((p) => rotatePoint(p, center, angle));
}

// Axis-aligned screen bounds of the (possibly rotated) box, padded.
export function textBoundsRect(drawing, transform, box = estimateBox(drawing)) {
  const corners = textCorners(drawing, transform, box);
  if (!corners) return null;
  const rect = rectFromPoints(corners);
  if (!rect) return null;
  return { x: rect.x - 3, y: rect.y - 3, width: rect.width + 6, height: rect.height + 6 };
}

// Hit-friendly probe: rotate the point back by -rotation and test the
// unrotated rect (with padding).
export function textPointInBox(point, drawing, transform, box = estimateBox(drawing), padding = 6) {
  const origin = textAnchorPoint(drawing, transform);
  if (!origin) return false;
  let p = point;
  const rotation = Number(drawing.text?.rotation) || 0;
  if (rotation) {
    const center = { x: origin.x + box.width / 2, y: origin.y + box.height / 2 };
    p = rotatePoint(point, center, rad(-rotation));
  }
  return p.x >= origin.x - padding && p.x <= origin.x + box.width + padding
    && p.y >= origin.y - padding && p.y <= origin.y + box.height + padding;
}
