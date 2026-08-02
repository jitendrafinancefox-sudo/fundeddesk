'use client';
import { snapAnchor } from '../engine/SnappingEngine';
import { anchorCountFor } from './DrawingDefinitions';

// Screen-space to market-coordinate conversion for tool placement.
function anchorFromPoint(transform, point) { return transform.pixelToAnchor(point.x, point.y); }

export function createToolManager({ getTransform, getCandles, createDrawing }) {
  let pending = null; // { tool, start, end, drawing }
  let snap = null;    // { magnet, mode }
  return {
    configure(next) { snap = next; },
    isActive() { return Boolean(pending); },
    pendingDrawing() { return pending?.drawing || null; },
    // Begin placement: record the start anchor (snapped when magnet is on).
    // Returns null when no candle context exists yet (empty candles), so the
    // caller shows no pending preview instead of crashing.
    begin(tool, point) {
      const transform = getTransform(); if (!transform) return null;
      const candles = getCandles();
      const start = snapAnchor(anchorFromPoint(transform, point), candles, snap);
      if (!start || !Number.isFinite(start.time) || !Number.isFinite(start.price)) return null;
      pending = { tool, start, end: start, drawing: null };
      this.update(point);
      return this.pendingDrawing();
    },
    // Continue placement: refresh the end anchor and rebuild the draft
    // drawing so the renderer can preview it live. Keeps the last valid end
    // when the candle context vanishes mid-gesture.
    update(point) {
      if (!pending) return null;
      const transform = getTransform(); if (!transform) return null;
      const candles = getCandles();
      const end = snapAnchor(anchorFromPoint(transform, point), candles, snap);
      if (end && Number.isFinite(end.time) && Number.isFinite(end.price)) pending.end = end;
      pending.drawing = createDrawing({
        drawingType: pending.tool,
        anchorPoints: anchorCountFor(pending.tool) <= 1 ? [pending.end] : [pending.start, pending.end],
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
