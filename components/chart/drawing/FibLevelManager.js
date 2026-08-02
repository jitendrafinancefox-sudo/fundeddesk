'use client';

// FibLevelManager — single source of truth for Fibonacci level sets.
//
// Every Fibonacci tool shares the same 18-level master set (the prompt's
// default list). Each level carries { value, enabled, color, label, custom }.
// Per-drawing overrides live in drawing.fib.levels and are authoritative:
// the payload written by any edit is a full list (the first edit normalizes
// the set, so levels the user never customized stay visible and toggleable),
// and levels removed from it stay removed across reloads. All mutations
// return a NEW drawing object so the interaction's history funnel records
// each change as one undoable delta.

export const FIB_DEFAULT_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.65, 0.705, 0.786, 0.886, 1, 1.13, 1.272, 1.414, 1.618, 2, 2.618, 3.618, 4.236];

// TradingView's visible-by-default level sets per tool. The full master set
// stays available through the properties panel for every tool.
const FIB_TOOL_ENABLED = {
  fib: new Set([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]),
  fibExtension: new Set([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]),
  fibProjection: new Set([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]),
  fibFan: new Set([0, 0.236, 0.382, 0.5, 0.618, 0.705, 0.786, 1]),
  fibChannel: new Set([0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]),
  fibSpiral: new Set([0.618, 1, 1.618, 2.618, 4.236]),
  fibTimeZone: new Set([0.618, 1, 1.618, 2.618, 4.236]),
};

export const isFibToolType = (drawingType) => Boolean(FIB_TOOL_ENABLED[drawingType]);

// Default per-level colors: a blue→red hue ramp across the master list
// (TradingView's classic gradient look). Level-specific colors override the
// drawing's style color for that level's line only.
export function fibLevelColor(value, index) {
  const t = index / Math.max(1, FIB_DEFAULT_LEVELS.length - 1);
  return `hsl(${(220 - t * 210).toFixed(0)}, 78%, 62%)`;
}

export function fibLevelColorForValue(value) {
  const index = Math.max(0, FIB_DEFAULT_LEVELS.indexOf(Number(value)));
  return fibLevelColor(value, index);
}

const strip = (value) => Number(value).toFixed(3).replace(/0+$/, '').replace(/\.$/, '');

// Default label: "0.618 (61.8%)" — matching TradingView's ratio text.
export function fibRatioLabel(value) {
  return `${strip(value)} (${(Number(value) * 100).toFixed(1)}%)`;
}

export const fibFormatPrice = (price) => price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export class FibLevelManager {
  // The full default set for a tool (master list × tool's enabled subset).
  defaultsFor(drawingType) {
    const enabled = FIB_TOOL_ENABLED[drawingType] || FIB_TOOL_ENABLED.fib;
    return FIB_DEFAULT_LEVELS.map((value, index) => ({
      value, enabled: enabled.has(value), color: fibLevelColor(value, index),
      label: fibRatioLabel(value), custom: false,
    }));
  }

  // Effective levels for a drawing: the drawing's own list when present
  // (v4 payloads), otherwise the tool defaults. Payload order is preserved
  // (level reordering is user-controlled); defaults come pre-sorted.
  levelsFor(drawing) {
    const levels = drawing?.fib?.levels;
    if (!Array.isArray(levels) || !levels.length) return this.defaultsFor(drawing?.drawingType);
    const known = new Set(FIB_DEFAULT_LEVELS);
    return levels
      .map((level) => ({
        value: Number(level.value),
        enabled: level.enabled !== false,
        color: typeof level.color === 'string' && level.color ? level.color : fibLevelColorForValue(level.value),
        label: typeof level.label === 'string' && level.label ? level.label : fibRatioLabel(level.value),
        custom: Boolean(level.custom),
      }))
      .filter((level) => Number.isFinite(level.value) && (known.has(level.value) || level.custom));
  }

  withFib(drawing, patch) {
    return { ...drawing, fib: { ...(drawing.fib || {}), ...patch } };
  }

  mapLevels(drawing, fn) {
    const levels = this.levelsFor(drawing).map(fn);
    return this.withFib(drawing, { levels });
  }

  toggle(drawing, value) {
    return this.mapLevels(drawing, (level) => (level.value === Number(value) ? { ...level, enabled: !level.enabled } : level));
  }

  setEnabled(drawing, value, enabled) {
    return this.mapLevels(drawing, (level) => (level.value === Number(value) ? { ...level, enabled } : level));
  }

  setColor(drawing, value, color) {
    return this.mapLevels(drawing, (level) => (level.value === Number(value) ? { ...level, color, custom: true } : level));
  }

  setLabel(drawing, value, label) {
    return this.mapLevels(drawing, (level) => (level.value === Number(value) ? { ...level, label, custom: true } : level));
  }

  // Custom level: inserted at its sorted position, enabled by default, color
  // from the ramp position.
  add(drawing, value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return drawing;
    const levels = this.levelsFor(drawing);
    if (levels.some((level) => level.value === numeric)) return drawing;
    const index = levels.findIndex((level) => level.value > numeric);
    const at = index === -1 ? levels.length : index;
    const color = fibLevelColor(numeric, at / Math.max(1, FIB_DEFAULT_LEVELS.length - 1));
    levels.splice(at, 0, { value: numeric, enabled: true, color, label: fibRatioLabel(numeric), custom: true });
    return this.withFib(drawing, { levels });
  }

  remove(drawing, value) {
    const levels = this.levelsFor(drawing).filter((level) => level.value !== Number(value));
    return this.withFib(drawing, { levels });
  }

  // Level reordering (display order for the panel and alternate band fills;
  // geometry stays value-sorted).
  move(drawing, from, to) {
    const levels = this.levelsFor(drawing);
    if (from < 0 || from >= levels.length || to < 0 || to >= levels.length) return drawing;
    const [level] = levels.splice(from, 1);
    levels.splice(to, 0, level);
    return this.withFib(drawing, { levels });
  }

  reset(drawing) {
    return this.withFib(drawing, { levels: this.defaultsFor(drawing.drawingType) });
  }
}

export const fibLevelManager = new FibLevelManager();
