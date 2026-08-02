'use client';
import { snapAnchor } from '../engine/SnappingEngine';
import { anchorCountFor } from './DrawingDefinitions';

// Screen-space to market-coordinate conversion for tool placement.
function anchorFromPoint(transform, point) { return transform.pixelToAnchor(point.x, point.y); }

// Multi-click tool placement (TradingView-style):
//   1. pointerDown  -> begin() records the first anchor
//   2. drag         -> update() moves the live end
//   3. pointerUp    -> release() commits the dragged end as a click; the
//                      drawing completes once the tool's anchor count is
//                      reached, otherwise it stays in preview so the next
//                      clicks (channel width, disjoint second line, ...)
//                      extend the draft live.
//   4. pointerDown while active -> click() commits the point under the
//      cursor and completes the drawing if that was the last anchor.
// Two-anchor tools behave exactly as before; the same code path drives
// three- and four-click channels.
export function createToolManager({ getTransform, getCandles, createDrawing }) {
  let pending = null; // { tool, clicks: [], end, drawing }
  let snap = null;    // { magnet, mode }
  const snapped = (point) => {
    const transform = getTransform(); if (!transform) return null;
    const anchor = snapAnchor(anchorFromPoint(transform, point), getCandles(), snap || undefined);
    return anchor && Number.isFinite(anchor.time) && Number.isFinite(anchor.price) ? anchor : null;
  };
  // Draft anchors: single-anchor tools use the live end only; everything
  // else is [committed clicks..., live end] capped at the tool's anchor
  // count, so partial channels preview correctly at every stage.
  const draft = () => {
    if (!pending) return null;
    const count = anchorCountFor(pending.tool);
    const anchors = count <= 1 ? [pending.end] : [...pending.clicks, pending.end].slice(0, count);
    pending.drawing = createDrawing({ drawingType: pending.tool, anchorPoints: anchors });
    return pending.drawing;
  };
  return {
    configure(next) { snap = next; },
    isActive() { return Boolean(pending); },
    clicks() { return pending ? pending.clicks.length : 0; },
    pendingDrawing() { return pending?.drawing || null; },
    // First pointer down: record the start anchor and show the preview.
    begin(tool, point) {
      const start = snapped(point);
      if (!start) return null;
      pending = { tool, clicks: [start], end: start, drawing: null };
      return draft();
    },
    // Pointer move: refresh the live end anchor and rebuild the draft.
    update(point) {
      if (!pending) return null;
      const end = snapped(point);
      if (end) pending.end = end;
      return draft();
    },
    // Pointer up: commit the dragged end as a click (even without drag, so
    // click-click placement works). Completes when the anchor count is full.
    release() {
      if (!pending) return null;
      if (pending.clicks.length < anchorCountFor(pending.tool)) pending.clicks.push(pending.end);
      return this.complete();
    },
    // Pointer down while active: commit the point under the cursor (channel
    // width clicks, disjoint line 2) and complete when full.
    click(point) {
      if (!pending) return null;
      const end = snapped(point);
      if (end) pending.end = end;
      if (pending.clicks.length < anchorCountFor(pending.tool)) pending.clicks.push(pending.end);
      return this.complete();
    },
    complete() {
      if (!pending) return null;
      if (pending.clicks.length >= anchorCountFor(pending.tool)) {
        const final = draft();
        pending = null;
        return final;
      }
      return null;
    },
    cancel() { pending = null; },
  };
}
