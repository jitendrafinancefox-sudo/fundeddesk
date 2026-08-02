'use client';
import { snapAnchor } from '../engine/SnappingEngine';
import { anchorCountFor } from './DrawingDefinitions';
import { captureAppend, captureStart, finalizeStroke } from './BrushEngine';

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
//
// Continuous tools (brush/highlighter/eraser) capture every pointer move
// as a stroke point (decimated in screen space, never snapped) and complete
// on release. Click-place tools (path/polyline/curve/arc) place vertices on
// click; open-ended tools complete via finish() (double-click or Enter).
export function createToolManager({ getTransform, getCandles, createDrawing }) {
  let pending = null; // { tool, clicks: [], capture: [], end, drawing }
  let snap = null;    // { magnet, mode }
  const isContinuous = (tool) => Boolean(DRAWING_CONTINUOUS[tool]);
  const isClickPlace = (tool) => Boolean(DRAWING_CLICKPLACE[tool]);
  const snapped = (point) => {
    const transform = getTransform(); if (!transform) return null;
    const anchor = snapAnchor(anchorFromPoint(transform, point), getCandles(), snap || undefined);
    return anchor && Number.isFinite(anchor.time) && Number.isFinite(anchor.price) ? anchor : null;
  };
  // Draft anchors: continuous tools use the captured point list; single-
  // anchor tools use the live end only; everything else is [committed
  // clicks..., live end] capped at the tool's anchor count.
  const draft = () => {
    if (!pending) return null;
    let anchors;
    if (isContinuous(pending.tool)) {
      anchors = pending.capture;
    } else {
      const count = anchorCountFor(pending.tool);
      if (count === 0) {
        // Open-ended (path/polyline): all committed clicks; the live end is
        // part of the preview only while it actually moves.
        const last = pending.clicks[pending.clicks.length - 1];
        anchors = (last && pending.end && (last.time !== pending.end.time || last.price !== pending.end.price))
          ? [...pending.clicks, pending.end]
          : pending.clicks;
      } else if (count <= 1) {
        anchors = [pending.end];
      } else {
        anchors = [...pending.clicks, pending.end].slice(0, count);
      }
    }
    if (!anchors.length) return null;
    pending.drawing = createDrawing({ drawingType: pending.tool, anchorPoints: anchors });
    return pending.drawing;
  };
  return {
    configure(next) { snap = next; },
    isActive() { return Boolean(pending); },
    clicks() { return pending ? pending.clicks.length : 0; },
    pendingDrawing() { return pending?.drawing || null; },
    // First pointer down: record the start anchor and show the preview only.
    // Nothing is placed here — the drawing is committed by release()/click()
    // once the tool's anchor count is full (or by finish() for open-ended
    // tools), so intermediate drafts never leak into the registry.
    begin(tool, point) {
      const transform = getTransform(); if (!transform) return null;
      if (isContinuous(tool)) {
        const capture = captureStart(transform, point);
        if (!capture) return null;
        pending = { tool, clicks: [], capture, end: capture[0], drawing: null };
        return draft();
      }
      const start = snapped(point);
      if (!start) return null;
      pending = { tool, clicks: [start], capture: [], end: start, drawing: null };
      return null;
    },
    // Pointer move: continuous tools append the point; everything else
    // refreshes the live end anchor and rebuilds the draft.
    update(point) {
      if (!pending) return null;
      const transform = getTransform(); if (!transform) return null;
      if (isContinuous(pending.tool)) {
        const next = captureAppend(pending.capture, transform, point);
        if (!next) return pending.drawing;
        pending.capture = next;
        pending.end = next[next.length - 1];
        return draft();
      }
      const end = snapped(point);
      if (end) pending.end = end;
      return draft();
    },
    // Pointer up: continuous tools finalize the captured stroke; click
    // tools commit the dragged end as a click (duplicate anchors from a
    // stationary pointer are suppressed). Open-ended tools never complete
    // here — they finish via finish() (double-click / Enter).
    release() {
      if (!pending) return null;
      if (isContinuous(pending.tool)) {
        const transform = getTransform(); if (!transform) return null;
        const final = draft();
        if (!final) { pending = null; return null; }
        const finalized = finalizeStroke(final, transform);
        pending = null;
        return finalized;
      }
      const count = anchorCountFor(pending.tool);
      if (count === 0) return null;
      const last = pending.clicks[pending.clicks.length - 1];
      if (pending.clicks.length < count && (!last || last.time !== pending.end.time || last.price !== pending.end.price)) pending.clicks.push(pending.end);
      return this.complete();
    },
    // Pointer down while active: commit the point under the cursor (channel
    // width clicks, path vertices) and complete when full.
    click(point) {
      if (!pending) return null;
      const end = snapped(point);
      if (end) pending.end = end;
      const count = anchorCountFor(pending.tool);
      const last = pending.clicks[pending.clicks.length - 1];
      if (count === 0) {
        if (!last || last.time !== pending.end.time || last.price !== pending.end.price) pending.clicks.push(pending.end);
        return null;
      }
      if (pending.clicks.length < count && (!last || last.time !== pending.end.time || last.price !== pending.end.price)) pending.clicks.push(pending.end);
      return this.complete();
    },
    // Explicit completion (double-click, Enter): open-ended tools.
    finish() {
      if (!pending) return null;
      return this.complete(true);
    },
    complete(force = false) {
      if (!pending) return null;
      const count = anchorCountFor(pending.tool);
      const ready = count === 0 ? pending.clicks.length >= 2 && force : pending.clicks.length >= count;
      if (!ready) return null;
      const final = draft();
      pending = null;
      return final;
    },
    cancel() { pending = null; },
  };
}

const DRAWING_CONTINUOUS = { brush: true, highlighter: true, eraser: true };
const DRAWING_CLICKPLACE = { path: true, polyline: true, curve: true, arc: true };
