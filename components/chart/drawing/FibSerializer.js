'use client';

// FibSerializer — payload sanitization for Fibonacci drawings.
//
// v4 adds drawing.fib: { levels: [...], label: {...} }. The levels list is
// authoritative (removed levels stay removed); sanitization coerces every
// field to a valid value, drops unknown non-custom entries and writes the
// tool's default level set when no payload exists (pre-v4 drawings). Label
// options are coerced to the supported enums. Round-tripping is lossless
// for values the app understands.

import { fibLevelManager, fibLevelColorForValue, fibRatioLabel, FIB_DEFAULT_LEVELS } from './FibLevelManager';
import { isFibType } from './FibGeometry';

const FIB_FORMATS = ['percentage', 'price', 'both'];
const FIB_POSITIONS = ['left', 'right', 'center', 'auto'];

export const FIB_PAYLOAD_VERSION = 4;

export function sanitizeFib(drawing) {
  if (!isFibType(drawing.drawingType)) return drawing;
  const known = new Set(FIB_DEFAULT_LEVELS);
  const saved = drawing.fib;
  const savedLevels = Array.isArray(saved?.levels) && saved.levels.length ? saved.levels : null;
  // The payload is authoritative (removed levels stay removed); a drawing
  // without a payload yet (pre-v4) gets the tool's default level set so the
  // full master list is available and toggleable after the first edit.
  const source = savedLevels || fibLevelManager.defaultsFor(drawing.drawingType);
  const levels = source
    .map((level) => ({
      value: Number(level.value),
      enabled: level.enabled !== false,
      color: typeof level.color === 'string' && level.color ? level.color : fibLevelColorForValue(level.value),
      label: typeof level.label === 'string' && level.label ? level.label : fibRatioLabel(level.value),
      custom: Boolean(level.custom),
    }))
    .filter((level) => Number.isFinite(level.value) && (known.has(level.value) || level.custom))
    .map((level) => ({
      value: level.value,
      enabled: level.enabled,
      color: typeof level.color === 'string' && level.color ? level.color : null,
      label: typeof level.label === 'string' && level.label ? level.label : null,
      custom: Boolean(level.custom),
    }));
  const label = {
    format: FIB_FORMATS.includes(saved?.label?.format) ? saved.label.format : 'both',
    position: FIB_POSITIONS.includes(saved?.label?.position) ? saved.label.position : 'auto',
    fontSize: Math.max(8, Math.min(18, Number(saved?.label?.fontSize) || 10)),
    font: typeof saved?.label?.font === 'string' && saved.label.font ? saved.label.font : 'Inter, sans-serif',
    bg: saved?.label?.bg !== false,
    textColor: typeof saved?.label?.textColor === 'string' && saved.label.textColor ? saved.label.textColor : null,
  };
  return { ...drawing, fib: { levels, label } };
}
