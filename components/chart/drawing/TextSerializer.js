'use client';
import { TEXT_TYPES, LABEL_TYPES, isTextType, textDefaults, textColorFor } from './TextGeometry';
import { FONT_FAMILIES, DEFAULT_FONT } from './FontManager';

// v7 payload: text-tool drawings carry a text object
// { content, box, autoSize, rotation, font, boxStyle, side, pointer,
//   snapToCandle }. Everything is coerced and clamped so a malformed file
// can never produce NaN renders; missing fields fall back to the per-tool
// defaults (so pre-v7 files still render styled correctly).

const num = (value, fallback, min, max) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
};
const oneOf = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

export function sanitizeText(drawing) {
  if (!isTextType(drawing.drawingType)) return {};
  const defaults = textDefaults(drawing.drawingType);
  const text = drawing.text || {};
  const font = text.font || {};
  const boxStyle = { ...(defaults.boxStyle || {}), ...(text.boxStyle || {}) };
  const box = text.box && typeof text.box === 'object'
    ? { width: num(text.box.width, null, 40, 4000), height: num(text.box.height, null, 24, 4000) }
    : null;
  const clean = {
    content: typeof text.content === 'string' ? text.content.slice(0, 4000) : '',
    box,
    autoSize: text.autoSize !== false,
    rotation: num(text.rotation, 0, -360, 360) % 360,
    font: {
      family: FONT_FAMILIES.includes(font.family) ? font.family : DEFAULT_FONT.family,
      size: num(font.size, DEFAULT_FONT.size, 8, 72),
      bold: Boolean(font.bold),
      italic: Boolean(font.italic),
      underline: Boolean(font.underline),
      align: oneOf(font.align, ['left', 'center', 'right'], DEFAULT_FONT.align),
      letterSpacing: num(font.letterSpacing, DEFAULT_FONT.letterSpacing, -2, 20),
      lineHeight: num(font.lineHeight, DEFAULT_FONT.lineHeight, 1, 3),
    },
    boxStyle: {
      padding: num(boxStyle.padding, 10, 0, 60),
      radius: num(boxStyle.radius, 8, 0, 60),
      background: boxStyle.background && typeof boxStyle.background === 'string' ? boxStyle.background.slice(0, 32) : defaults.boxStyle.background,
      border: boxStyle.border && typeof boxStyle.border === 'string' ? boxStyle.border.slice(0, 32) : defaults.boxStyle.border,
      borderWidth: num(boxStyle.borderWidth, 1, 0, 20),
      opacity: num(boxStyle.opacity, 1, 0.05, 1),
    },
    side: oneOf(text.side, ['auto', 'left', 'right', 'above', 'below'], 'auto'),
    pointer: oneOf(text.pointer, ['auto', 'up', 'down', 'left', 'right'], 'auto'),
    snapToCandle: text.snapToCandle !== false,
  };
  return { text: clean };
}

export { TEXT_TYPES, LABEL_TYPES, isTextType, textColorFor };
