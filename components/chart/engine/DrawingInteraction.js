'use client';
import { unionRect } from '../drawing/GeometryEngine';
import { snapAnchor } from './SnappingEngine';

const clone = (value) => structuredClone(value);

// Owns cursor-mode interaction: hit testing (spatial index → precise
// geometry), selection, marquee, move/resize/rotate, delete/copy/paste/
// duplicate, and undo/redo. Every committed mutation flows through `commit`,
// which keeps the registry, engine, React state and persistence in sync, and
// records delta commands in the history manager (no full-array snapshots).
//
// Modifiers (live from KeyboardShortcutManager):
//   Shift — additive selection on click; 45° angle lock while dragging
//   Alt   — duplicate-on-drag (the copy is moved, the original stays)
//   Ctrl  — disables all snapping during a drag
export class DrawingInteraction {
  constructor({ getDrawings, commit, getTransform, getCandles, registry, selection, layers, history, bus, snap, hitTestEngine, getMods }) {
    this.getDrawings = getDrawings; this.commit = commit; this.getTransform = getTransform; this.getCandles = getCandles;
    this.registry = registry; this.selection = selection; this.layers = layers; this.history = history; this.bus = bus;
    this.snap = snap || { magnet: false, mode: 'ohlc' };
    this.hitTestEngine = hitTestEngine;
    this.getMods = getMods || (() => ({}));
    this.mode = null; // { id, anchorIndex, kind, start, startCursor, original(s), listBefore }
    this.clipboard = [];
    this.marqueeActive = false;
    this.marqueeAdditive = false;
  }

  // Topmost drawing under the pointer: handles (rotation > midpoint >
  // anchor) win over line bodies. Locked/hidden drawings are excluded by
  // the hit-test engine.
  hit(point) { return this.hitTestEngine?.hit(point) || null; }

  // Returns true when the pointer grabbed something (a drawing, a marquee,
  // or an Alt-duplicated copy), false when it is free space (caller starts
  // a pan).
  pointerDown(point, { additive = false } = {}) {
    const mods = this.getMods() || {};
    let hit = this.hit(point);
    if (!hit) {
      if (additive || mods.shift) { this.marqueeActive = true; this.marqueeAdditive = true; this.selection.marqueeStart(point); return true; }
      this.selection.clear();
      return false;
    }
    if (mods.alt && hit.kind !== 'rotation') {
      hit = this.duplicateForDrag(hit);
      if (!hit) return true;
    }
    if (!additive) this.selection.clear();
    this.selection.select(hit.id, { additive });
    const transform = this.getTransform(); if (!transform) return true;
    const drawing = this.registry.get(hit.id); if (!drawing) return true;
    // Dragging the body of an already-multi-selected member moves the whole
    // group; handles always edit a single drawing.
    if (hit.kind === 'body' && this.selection.has(hit.id) && this.selection.count() > 1) {
      this.mode = {
        id: hit.id, anchorIndex: hit.anchorIndex, kind: 'group', start: transform.pixelToAnchor(point.x, point.y),
        startCursor: { x: point.x, y: point.y }, originals: [], listBefore: this.getDrawings(),
      };
      this.selection.ids().forEach((id) => { const item = this.registry.get(id); if (item) this.mode.originals.push(clone(item)); });
      return true;
    }
    this.mode = {
      id: hit.id, anchorIndex: hit.anchorIndex, kind: hit.kind, start: transform.pixelToAnchor(point.x, point.y),
      startCursor: { x: point.x, y: point.y }, original: clone(drawing),
    };
    return true;
  }

  pointerMove(point) {
    if (this.marqueeActive) { this.selection.marqueeMove(point); return; }
    if (!this.mode) return;
    const transform = this.getTransform(); if (!transform) return;
    const mode = this.mode;
    const mods = this.getMods() || {};
    const snapActive = !mods.ctrl;
    if (mode.kind === 'group') { this.moveGroup(point, transform, mode, mods, snapActive); return; }
    const next = clone(mode.original);
    if (mode.kind === 'anchor') { this.moveAnchor(point, transform, mode, next, mods, snapActive); }
    else if (mode.kind === 'midpoint') { this.scaleMidpoint(point, transform, mode, next, snapActive); }
    else if (mode.kind === 'rotation') { this.rotate(point, transform, mode, next); }
    else { this.moveBody(point, transform, mode, next, snapActive); }
    const rect = this.layers.dirtyRect(mode.original, next, transform);
    this.commit(this.replaceIn(this.getDrawings(), next), { rect });
  }

  // Single-anchor edit: snap to OHLC when magnet is on, snap to other
  // drawings' anchors when close, and lock to 45° screen-space angles while
  // Shift is held (pivot = the drawing's other anchor, when present).
  moveAnchor(point, transform, mode, next, mods, snapActive) {
    let cursor = point;
    const pivotIndex = mode.anchorIndex === 0 ? 1 : 0;
    const pivot = next.anchorPoints[pivotIndex];
    if (mods.shift && pivot) {
      const pivotPixel = transform.anchorToPixel(pivot);
      if (pivotPixel) cursor = angleLocked(pivotPixel, point);
    }
    let anchor = transform.pixelToAnchor(cursor.x, cursor.y);
    if (snapActive && this.snap.magnet) anchor = snapAnchor(anchor, this.getCandles(), this.snap);
    if (snapActive) anchor = this.anchorSnap(anchor, transform);
    next.anchorPoints[mode.anchorIndex] = anchor;
  }

  moveBody(point, transform, mode, next, snapActive) {
    const now = transform.pixelToAnchor(point.x, point.y);
    const dt = now.time - mode.start.time; const dp = now.price - mode.start.price;
    next.anchorPoints = next.anchorPoints.map((anchor) => ({ time: anchor.time + dt, price: anchor.price + dp }));
  }

  // Midpoint drag = resize: the midpoint follows the cursor and both anchors
  // scale symmetrically about the original midpoint.
  scaleMidpoint(point, transform, mode, next, snapActive) {
    const points = next.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
    if (points.length < 2) return;
    const mid0 = midpointOf(points[0], points[1]);
    const scale = distance(point, points[0]) / Math.max(1, distance(mid0, points[0]));
    next.anchorPoints = next.anchorPoints.map((anchor, index) => {
      const p = transform.anchorToPixel(anchor); if (!p) return anchor;
      const x = point.x + (p.x - mid0.x) * scale;
      const y = point.y + (p.y - mid0.y) * scale;
      let result = transform.pixelToAnchor(x, y);
      if (snapActive && this.snap.magnet) result = snapAnchor(result, this.getCandles(), this.snap);
      return result;
    });
  }

  // Rotation handle drag: rotate every anchor in screen space around the
  // drawing's midpoint, then convert back to market coordinates. Angle
  // snapping to 15° steps while Shift is held.
  rotate(point, transform, mode, next) {
    const points = next.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
    if (points.length < 2) return;
    const mid = midpointOf(points[0], points[1]);
    let delta = Math.atan2(point.y - mid.y, point.x - mid.x) - Math.atan2(mode.startCursor.y - mid.y, mode.startCursor.x - mid.x);
    const mods = this.getMods() || {};
    if (mods.shift) delta = Math.round(delta / (Math.PI / 12)) * (Math.PI / 12);
    const cos = Math.cos(delta); const sin = Math.sin(delta);
    next.anchorPoints = next.anchorPoints.map((anchor, index) => {
      const p = transform.anchorToPixel(anchor); if (!p) return anchor;
      const dx = p.x - mid.x; const dy = p.y - mid.y;
      return transform.pixelToAnchor(mid.x + dx * cos - dy * sin, mid.y + dx * sin + dy * cos);
    });
  }

  moveGroup(point, transform, mode, mods, snapActive) {
    const now = transform.pixelToAnchor(point.x, point.y);
    const dt = now.time - mode.start.time; const dp = now.price - mode.start.price;
    const nexts = mode.originals.map((item) => ({ ...item, anchorPoints: item.anchorPoints.map((anchor) => ({ time: anchor.time + dt, price: anchor.price + dp })) }));
    const rect = this.groupDirty(mode.originals, nexts, transform);
    this.commit(this.groupReplace(mode.listBefore, nexts), { rect });
  }

  pointerUp() {
    if (this.marqueeActive) {
      this.marqueeActive = false;
      const rect = this.selection.marqueeEnd({ additive: this.marqueeAdditive });
      if (rect) this.selection.selectInRect(rect, this.getDrawings(), this.getTransform(), { additive: this.marqueeAdditive });
      return;
    }
    if (!this.mode) return;
    const mode = this.mode;
    this.mode = null;
    if (mode.kind === 'group') {
      const finalList = this.getDrawings();
      if (JSON.stringify(mode.listBefore) !== JSON.stringify(finalList)) {
        this.history.execute({
          label: 'Move drawings',
          apply: () => this.commit(finalList),
          revert: () => this.commit(mode.listBefore),
        });
      }
      return;
    }
    const final = this.registry.get(mode.id);
    if (final && JSON.stringify(mode.original) !== JSON.stringify(final)) {
      const label = mode.kind === 'midpoint' ? 'Resize drawing' : mode.kind === 'rotation' ? 'Rotate drawing' : 'Move drawing';
      this.history.execute({
        label,
        apply: () => this.commit(this.replaceIn(this.getDrawings(), final)),
        revert: () => this.commit(this.replaceIn(this.getDrawings(), mode.original)),
      });
    }
  }

  cancelMarquee() { if (this.marqueeActive) { this.marqueeActive = false; this.selection.marqueeCancel(); } }

  // Alt-drag: copy the hit drawing through history, select the copy, and
  // hand the drag back on the copy. The original stays untouched.
  duplicateForDrag(hit) {
    const drawing = this.registry.get(hit.id); if (!drawing) return null;
    const copy = { ...clone(drawing), id: crypto.randomUUID() };
    this.history.execute({
      label: 'Duplicate drawing',
      apply: () => this.commit([...this.getDrawings(), copy]),
      revert: () => this.commit(this.getDrawings().filter((item) => item.id !== copy.id)),
    });
    this.selection.replace([copy.id]);
    return { id: copy.id, anchorIndex: hit.anchorIndex, kind: hit.kind, drawingType: hit.drawingType, screenPoints: hit.screenPoints };
  }

  // Snap the dragged anchor onto another drawing's anchor when one is within
  // ANCHOR_SNAP_PX on screen. Self-drawing anchors are skipped so the pivot
  // can never pull the drag into itself.
  anchorSnap(anchor, transform) {
    const point = transform.anchorToPixel(anchor); if (!point) return anchor;
    const threshold = 6;
    const t0 = transform.pixelToTime(point.x - threshold);
    const t1 = transform.pixelToTime(point.x + threshold);
    if (t0 == null || t1 == null) return anchor;
    const ids = this.registry.queryRange(Math.min(t0, t1), Math.max(t0, t1));
    let best = null; let bestDistance = threshold;
    ids.forEach((id) => {
      if (id === this.mode?.id) return;
      const drawing = this.registry.get(id);
      if (!drawing || drawing.locked || this.layers?.isHidden(id)) return;
      drawing.anchorPoints.forEach((candidate) => {
        const p = transform.anchorToPixel(candidate); if (!p) return;
        const d = Math.hypot(p.x - point.x, p.y - point.y);
        if (d <= bestDistance) { bestDistance = d; best = candidate; }
      });
    });
    return best || anchor;
  }

  // Placement from a tool: record as a history command and select the result.
  place(drawing) {
    this.history.execute({
      label: 'Add drawing',
      apply: () => this.commit([...this.getDrawings(), drawing]),
      revert: () => this.commit(this.getDrawings().filter((item) => item.id !== drawing.id)),
    });
    this.selection.select(drawing.id);
  }

  delete() {
    const ids = this.selection.ids(); if (!ids.length) return;
    const drawings = this.getDrawings();
    this.history.beginGroup('Delete drawings');
    ids.forEach((id) => {
      const index = drawings.findIndex((item) => item.id === id);
      const target = drawings[index]; if (!target) return;
      this.history.execute({
        label: 'Delete drawing',
        apply: () => this.commit(this.getDrawings().filter((item) => item.id !== id)),
        revert: () => { const list = this.getDrawings(); list.splice(index, 0, target); this.commit([...list]); },
      });
    });
    this.history.endGroup();
    this.selection.clear();
  }

  duplicate() {
    const selected = this.getDrawings().filter((item) => this.selection.has(item.id));
    if (!selected.length) return;
    const copies = selected.map((item) => ({ ...clone(item), id: crypto.randomUUID(), anchorPoints: item.anchorPoints.map((point) => ({ time: point.time, price: point.price })) }));
    this.history.execute({
      label: 'Duplicate drawing',
      apply: () => this.commit([...this.getDrawings(), ...copies]),
      revert: () => this.commit(this.getDrawings().filter((item) => !copies.some((copy) => copy.id === item.id))),
    });
    this.selection.replace(copies.map((copy) => copy.id));
  }

  copy() { this.clipboard = this.getDrawings().filter((item) => this.selection.has(item.id)).map(clone); }

  paste() {
    if (!this.clipboard.length) return;
    const copies = this.clipboard.map((item) => ({ ...clone(item), id: crypto.randomUUID() }));
    this.history.execute({
      label: 'Paste drawing',
      apply: () => this.commit([...this.getDrawings(), ...copies]),
      revert: () => this.commit(this.getDrawings().filter((item) => !copies.some((copy) => copy.id === item.id))),
    });
    this.selection.replace(copies.map((copy) => copy.id));
  }

  clearAll() {
    const drawings = this.getDrawings(); if (!drawings.length) return;
    this.history.execute({ label: 'Clear drawings', apply: () => this.commit([]), revert: () => this.commit(drawings) });
    this.selection.clear();
  }

  undo() { if (this.history.undo()) this.selection.prune(this.registry.ids()); }
  redo() { if (this.history.redo()) this.selection.prune(this.registry.ids()); }
  canUndo() { return this.history.canUndo(); }
  canRedo() { return this.history.canRedo(); }

  selectedIds() { return this.selection.ids(); }
  replaceIn(list, drawing) { return list.map((item) => (item.id === drawing.id ? drawing : item)); }
  groupReplace(list, nexts) {
    const byId = new Map(nexts.map((item) => [item.id, item]));
    return list.map((item) => byId.get(item.id) || item);
  }
  groupDirty(originals, nexts, transform) {
    let rect = null;
    for (let i = 0; i < originals.length; i += 1) {
      const part = this.layers.dirtyRect(originals[i], nexts[i], transform);
      if (!part) return null;
      rect = rect ? unionRect(rect, part) : part;
    }
    return rect;
  }
}

const angleLocked = (pivot, cursor) => {
  const dx = cursor.x - pivot.x; const dy = cursor.y - pivot.y;
  const angle = Math.atan2(dy, dx);
  const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
  const length = Math.hypot(dx, dy);
  return { x: pivot.x + Math.cos(snapped) * length, y: pivot.y + Math.sin(snapped) * length };
};
const midpointOf = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
