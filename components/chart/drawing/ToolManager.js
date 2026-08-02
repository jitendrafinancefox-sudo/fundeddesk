'use client';
import { snapAnchor } from '../engine/SnappingEngine';

// Screen-space to market-coordinate conversion for tool placement.
function anchorFromPoint(transform, point) { return transform.pixelToAnchor(point.x, point.y); }

// The anchor-count contract mirrors the legacy DrawingEngine: horizontal
// lines and text notes place with a single anchor; everything else drags two.
const SINGLE_ANCHOR_TOOLS = new Set(['hline', 'vline', 'text']);

export function createToolManager({ getTransform, getCandles, createDrawing }) {
  let pending = null; // { tool, start, end, drawing }
  let snap = null;    // { magnet, mode }
  return {
    configure(next) { snap = next; },
    isActive() { return Boolean(pending); },
    pendingDrawing() { return pending?.drawing || null; },
    // Begin placement: record the start anchor (snapped when magnet is on).
    begin(tool, point) {
      const transform = getTransform(); if (!transform) return null;
      const candles = getCandles();
      const start = snapAnchor(anchorFromPoint(transform, point), candles, snap);
      pending = { tool, start, end: start, drawing: null };
      this.update(point);
      return this.pendingDrawing();
    },
    // Continue placement: refresh the end anchor and rebuild the draft
    // drawing so the renderer can preview it live.
    update(point) {
      if (!pending) return null;
      const transform = getTransform(); if (!transform) return null;
      const candles = getCandles();
      pending.end = snapAnchor(anchorFromPoint(transform, point), candles, snap);
      pending.drawing = createDrawing({
        drawingType: pending.tool,
        anchorPoints: SINGLE_ANCHOR_TOOLS.has(pending.tool) ? [pending.start] : [pending.start, pending.end],
      });
      return pending.drawing;
    },
    // Commit: return the final drawing and clear placement state.
    finish() {
      if (!pending) return null;
      const final = pending.drawing || null;
      pending = null;
      return final;
    },
    cancel() { pending = null; },
  };
}
