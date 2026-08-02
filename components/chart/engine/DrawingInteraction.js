'use client';
import { anchorHit, drawingHit } from '../drawing/GeometryEngine';
import { snapAnchor } from './SnappingEngine';

const clone = (value) => structuredClone(value);

// Owns cursor-mode interaction: hit testing (spatial index → precise
// geometry), selection, marquee, move/resize, delete/copy/paste/duplicate,
// and undo/redo. Every committed mutation flows through `commit`, which keeps
// the registry, engine, React state and persistence in sync, and records
// delta commands in the history manager (no full-array snapshots).
export class DrawingInteraction {
  constructor({ getDrawings, commit, getTransform, getCandles, registry, selection, layers, history, bus, snap }) {
    this.getDrawings = getDrawings; this.commit = commit; this.getTransform = getTransform; this.getCandles = getCandles;
    this.registry = registry; this.selection = selection; this.layers = layers; this.history = history; this.bus = bus;
    this.snap = snap || { magnet: false, mode: 'ohlc' };
    this.mode = null; // { id, anchorIndex, start, original }
    this.clipboard = [];
    this.marqueeActive = false;
    this.marqueeAdditive = false;
  }

  // Topmost drawing under the pointer: anchor handles win over line bodies.
  hit(point) {
    const transform = this.getTransform(); if (!transform) return null;
    const threshold = 9;
    const t0 = transform.pixelToTime(point.x - threshold);
    const t1 = transform.pixelToTime(point.x + threshold);
    let candidates = (t0 != null && t1 != null) ? this.registry.queryRange(Math.min(t0, t1), Math.max(t0, t1)) : this.registry.ids();
    if (!candidates.length) return null;
    for (let i = candidates.length - 1; i >= 0; i -= 1) {
      const drawing = this.registry.get(candidates[i]);
      if (!drawing) continue;
      if (anchorHit(drawing, point, transform, 9)) {
        const anchorIndex = drawing.anchorPoints.findIndex((anchor) => { const p = transform.anchorToPixel(anchor); return p && Math.hypot(p.x - point.x, p.y - point.y) < 10; });
        return { id: drawing.id, anchorIndex };
      }
    }
    for (let i = candidates.length - 1; i >= 0; i -= 1) {
      const drawing = this.registry.get(candidates[i]);
      if (drawing && drawingHit(drawing, point, transform, 7)) return { id: drawing.id, anchorIndex: -1 };
    }
    return null;
  }

  // Returns true when the pointer grabbed something (a drawing or a marquee),
  // false when it is free space (caller starts a pan).
  pointerDown(point, { additive = false } = {}) {
    const hit = this.hit(point);
    if (!hit) {
      if (additive) { this.marqueeActive = true; this.marqueeAdditive = true; this.selection.marqueeStart(point); return true; }
      this.selection.clear();
      return false;
    }
    if (!additive) this.selection.clear();
    this.selection.select(hit.id, { additive });
    const drawing = this.registry.get(hit.id); if (!drawing) return true;
    const transform = this.getTransform();
    this.mode = { id: hit.id, anchorIndex: hit.anchorIndex, start: transform.pixelToAnchor(point.x, point.y), original: clone(drawing) };
    return true;
  }

  pointerMove(point) {
    if (this.marqueeActive) { this.selection.marqueeMove(point); return; }
    if (!this.mode) return;
    const transform = this.getTransform(); if (!transform) return;
    const { id, anchorIndex, start, original } = this.mode;
    const now = transform.pixelToAnchor(point.x, point.y);
    const next = clone(original);
    if (anchorIndex >= 0) {
      next.anchorPoints[anchorIndex] = snapAnchor(now, this.getCandles(), this.snap);
    } else {
      const dt = now.time - start.time; const dp = now.price - start.price;
      next.anchorPoints = next.anchorPoints.map((anchor) => ({ time: anchor.time + dt, price: anchor.price + dp }));
    }
    const rect = this.layers.dirtyRect(original, next, transform);
    this.commit(this.replaceIn(this.getDrawings(), next), { rect });
  }

  pointerUp() {
    if (this.marqueeActive) {
      this.marqueeActive = false;
      const rect = this.selection.marqueeEnd({ additive: this.marqueeAdditive });
      if (rect) this.selection.selectInRect(rect, this.getDrawings(), this.getTransform(), { additive: this.marqueeAdditive });
      return;
    }
    if (!this.mode) return;
    const { id, original } = this.mode;
    const final = this.registry.get(id);
    this.mode = null;
    if (final && JSON.stringify(original) !== JSON.stringify(final)) {
      this.history.execute({
        label: 'Move drawing',
        apply: () => this.commit(this.replaceIn(this.getDrawings(), final)),
        revert: () => this.commit(this.replaceIn(this.getDrawings(), original)),
      });
    }
  }

  cancelMarquee() { if (this.marqueeActive) { this.marqueeActive = false; this.selection.marqueeCancel(); } }

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
}
