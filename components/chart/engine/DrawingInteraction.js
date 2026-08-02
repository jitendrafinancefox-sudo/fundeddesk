'use client';
import { unionRect } from '../drawing/GeometryEngine';
import { snapAnchor } from './SnappingEngine';
import { isShapeType, isZoneType, isChannelType, isFibType, normalizeShapeAnchors } from '../drawing/DrawingDefinitions';
import { polygonCorners, polygonEdges, polygonCenter, resizeEdge } from '../drawing/ShapeGeometry';
import { channelGeometry, isRegressionType, fitLinearRegression } from '../drawing/ChannelGeometry';
import { fibGeometry } from '../drawing/FibBase';

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
  // the hit-test engine. Extended zones are swept separately (their band
  // reaches beyond the time-bounded candidate window).
  hit(point) { return this.hitTestEngine?.hit(point) || this.hitTestEngine?.hitZone(point) || null; }
  // Same hit, but locked objects are allowed (context menu / properties
  // must be able to target a locked drawing so it can be unlocked).
  hitLoose(point) { return this.hitTestEngine?.hit(point, { ignoreLock: true }) || null; }

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
    const isChannel = isChannelType(mode.original.drawingType) || isFibType(mode.original.drawingType);
    if (mode.kind === 'anchor') {
      if (isShapeType(mode.original.drawingType) || isChannel) this.shapeCorner(point, transform, mode, next, snapActive);
      else this.moveAnchor(point, transform, mode, next, mods, snapActive);
    }
    else if (mode.kind === 'edge') { this.shapeEdge(point, transform, mode, next, snapActive); }
    else if (mode.kind === 'width') { this.widthDrag(point, transform, mode, next, snapActive); }
    else if (mode.kind === 'midpoint') { if (isChannel) this.moveBody(point, transform, mode, next, snapActive); else this.scaleMidpoint(point, transform, mode, next, snapActive); }
    else if (mode.kind === 'rotation') { this.rotate(point, transform, mode, next); }
    else { this.moveBody(point, transform, mode, next, snapActive); }
    // Zones and extended channels paint full-width bands, so a partial
    // repaint can never clear the previous frame's band edges — dirty-rect
    // edits must fall back to a full invalidate for them.
    const rect = isZoneType(mode.original.drawingType) || isChannel ? null : this.layers.dirtyRect(mode.original, next, transform);
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

  // Shape corner drag: shape anchors ARE the corners (TL, TR, BR, BL for
  // boxes; three points for triangles), so this is a straight anchor move
  // with snapping — the rotated frame is implicit in the corner positions.
  // Channels use the same path for their anchor handles; regression windows
  // are refitted to the new anchor times so the fit always follows the data.
  shapeCorner(point, transform, mode, next, snapActive) {
    let anchor = transform.pixelToAnchor(point.x, point.y);
    if (snapActive && this.snap.magnet) anchor = snapAnchor(anchor, this.getCandles(), this.snap);
    next.anchorPoints[mode.anchorIndex] = anchor;
    if (isRegressionType(next.drawingType) && mode.anchorIndex <= 1) this.refitRegression(next);
  }

  refitRegression(next) {
    const fit = fitLinearRegression(this.getCandles(), next.anchorPoints[0].time, next.anchorPoints[1].time);
    if (fit) next.regression = fit;
  }

  // Width handle drag: move the offset line's perpendicular distance only.
  // The offset anchor follows the cursor projected onto the base normal, so
  // dragging parallel to the base does nothing while the two lines stay
  // perfectly parallel at any distance.
  widthDrag(point, transform, mode, next, snapActive) {
    const geo = isChannelType(next.drawingType) ? channelGeometry(next, transform) : isFibType(next.drawingType) ? fibGeometry(next, transform) : null;
    if (!geo?.baseA || !geo.baseB || !geo.n) return;
    const baseMid = { x: (geo.baseA.x + geo.baseB.x) / 2, y: (geo.baseA.y + geo.baseB.y) / 2 };
    const distance = (point.x - baseMid.x) * geo.n.nx + (point.y - baseMid.y) * geo.n.ny;
    const px = { x: baseMid.x + geo.n.nx * distance, y: baseMid.y + geo.n.ny * distance };
    let anchor = transform.pixelToAnchor(px.x, px.y);
    if (snapActive && this.snap.magnet) anchor = snapAnchor(anchor, this.getCandles(), this.snap);
    next.anchorPoints[2] = anchor;
  }

  // Mid-edge drag: translate the edge's two corners along the edge's
  // outward normal (one axis of the shape), leaving the opposite edge and
  // the rest of the shape untouched. Works in rotated frames because the
  // normal is computed from the current corner positions.
  shapeEdge(point, transform, mode, next, snapActive) {
    const points = next.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
    if (points.length < 3) return;
    const corners = polygonCorners(points);
    const edges = polygonEdges(corners);
    const edgeIndex = mode.edge?.index ?? mode.anchorIndex;
    const edge = edges[edgeIndex]; if (!edge) return;
    const moved = resizeEdge(corners, edgeIndex, point, edges);
    next.anchorPoints = moved.map((p, i) => {
      let result = transform.pixelToAnchor(p.x, p.y);
      if (snapActive && this.snap.magnet) result = snapAnchor(result, this.getCandles(), this.snap);
      return result;
    });
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
  // drawing's pivot — the polygon center for shapes, the channel center for
  // channels, the midpoint for lines — then convert back to market
  // coordinates. Angle snapping to 15° steps while Shift is held.
  rotate(point, transform, mode, next) {
    const points = next.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
    if (points.length < 2) return;
    let pivot = null;
    if (isShapeType(next.drawingType)) pivot = points.length >= 3 ? polygonCenter(points) : midpointOf(points[0], points[1]);
    else if (isChannelType(next.drawingType)) pivot = channelGeometry(next, transform)?.center || midpointOf(points[0], points[1]);
    else if (isFibType(next.drawingType)) pivot = fibGeometry(next, transform)?.center || midpointOf(points[0], points[1]);
    else pivot = midpointOf(points[0], points[1]);
    let delta = Math.atan2(point.y - pivot.y, point.x - pivot.x) - Math.atan2(mode.startCursor.y - pivot.y, mode.startCursor.x - pivot.x);
    const mods = this.getMods() || {};
    if (mods.shift) delta = Math.round(delta / (Math.PI / 12)) * (Math.PI / 12);
    const cos = Math.cos(delta); const sin = Math.sin(delta);
    next.anchorPoints = next.anchorPoints.map((anchor, index) => {
      const p = transform.anchorToPixel(anchor); if (!p) return anchor;
      const dx = p.x - pivot.x; const dy = p.y - pivot.y;
      return transform.pixelToAnchor(pivot.x + dx * cos - dy * sin, pivot.y + dx * sin + dy * cos);
    });
    if (isRegressionType(next.drawingType)) this.refitRegression(next);
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

  // Placement from a tool: promote shape diagonals to full corner anchors,
  // record as a history command and select the result.
  place(drawing) {
    if (isShapeType(drawing.drawingType)) drawing = { ...drawing, anchorPoints: normalizeShapeAnchors(drawing) };
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

  // Lock / hide are persisted drawing flags: committed through history so
  // they survive serialization and are undoable. Locked drawings stay
  // visible but can never be hit, moved or selected.
  setFlags(ids, flag, value, label) {
    const targets = (ids || this.selection.ids()).map((id) => this.registry.get(id)).filter(Boolean);
    if (!targets.length) return;
    this.history.beginGroup(label);
    targets.forEach((drawing) => {
      if (Boolean(drawing[flag]) === value) return;
      const next = { ...drawing, [flag]: value };
      this.history.execute({
        label,
        apply: () => this.commit(this.replaceIn(this.getDrawings(), next)),
        revert: () => this.commit(this.replaceIn(this.getDrawings(), drawing)),
      });
    });
    this.history.endGroup();
  }
  lock(ids) { this.setFlags(ids, 'locked', true, 'Lock drawing'); }
  unlock(ids) { this.setFlags(ids, 'locked', false, 'Unlock drawing'); }
  hide(ids) { this.setFlags(ids, 'hidden', true, 'Hide drawing'); }
  show(ids) { this.setFlags(ids, 'hidden', false, 'Show drawing'); }

  // Style patch (properties panel): color / line width etc. Committed as one
  // undoable delta command.
  updateStyle(id, patch) {
    const drawing = this.registry.get(id); if (!drawing) return;
    const next = { ...drawing, style: { ...(drawing.style || {}), ...patch } };
    this.history.execute({
      label: 'Style change',
      apply: () => this.commit(this.replaceIn(this.getDrawings(), next)),
      revert: () => this.commit(this.replaceIn(this.getDrawings(), drawing)),
    });
  }

  // Fibonacci payload patch (properties panel): level sets, label options.
  // Merged into drawing.fib as one undoable delta command.
  updateFib(id, patch) {
    const drawing = this.registry.get(id); if (!drawing) return;
    const next = { ...drawing, fib: { ...(drawing.fib || {}), ...patch } };
    this.history.execute({
      label: 'Fibonacci settings',
      apply: () => this.commit(this.replaceIn(this.getDrawings(), next)),
      revert: () => this.commit(this.replaceIn(this.getDrawings(), drawing)),
    });
  }

  // Z-order move (context menu): reorders the drawing list; registry order
  // is the render z-order, so this changes stacking without touching data.
  zMove(id, direction) {
    const drawing = this.registry.get(id); if (!drawing) return;
    const before = this.getDrawings();
    const list = [...before];
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return;
    list.splice(index, 1);
    if (direction === 'front') list.push(drawing); else list.unshift(drawing);
    this.history.execute({
      label: direction === 'front' ? 'Bring to front' : 'Send to back',
      apply: () => this.commit(list),
      revert: () => this.commit(before),
    });
  }

  groupReplace(list, nexts) {
    const byId = new Map(nexts.map((item) => [item.id, item]));
    return list.map((item) => byId.get(item.id) || item);
  }
  groupDirty(originals, nexts, transform) {
    if (originals.some((item) => isZoneType(item.drawingType) || isChannelType(item.drawingType))) return null;
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
