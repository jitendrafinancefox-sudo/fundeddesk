'use client';
import { unionRect, padRect } from '../drawing/GeometryEngine';
import { snapAnchor } from './SnappingEngine';
import { isShapeType, isZoneType, isChannelType, isFibType, isStrokeType, isPositionType, isTextType, normalizeShapeAnchors, DRAWING_DEFINITIONS } from '../drawing/DrawingDefinitions';
import { polygonCorners, polygonEdges, polygonCenter, resizeEdge, resizeBox, resizeSquare, moveCorner } from '../drawing/ShapeGeometry';
import { channelGeometry, isRegressionType, fitLinearRegression } from '../drawing/ChannelGeometry';
import { fibGeometry } from '../drawing/FibBase';
import { lowerBound } from '../drawing/BrushGeometry';
import { eraseStroke, eraseTouches, convertToSmooth } from '../drawing/BrushEngine';
import { strokeFamilyHit } from '../drawing/PathHitTester';
import { textAnchorPoint, estimateBox, textBoundsRect } from '../drawing/TextGeometry';
import { nextGroupId, defaultGroupName, drawingsFromTemplate } from '../drawing/DrawingManager';

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
    this.pointEditId = null; // stroke drawing whose control points are editable
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
  // a pan). TradingView-style: first click selects, second click+drag edits.
  pointerDown(point, { additive = false } = {}) {
    const mods = this.getMods() || {};
    let hit = this.hit(point);
    if (!hit) {
      if (this.pointEditId) this.exitPointEdit();
      if (additive || mods.shift) { this.marqueeActive = true; this.marqueeAdditive = true; this.selection.marqueeStart(point); return true; }
      this.selection.clear();
      return false;
    }
    if (this.pointEditId && hit.id !== this.pointEditId) this.exitPointEdit();
    if (mods.alt && hit.kind !== 'rotation') {
      hit = this.duplicateForDrag(hit);
      if (!hit) return true;
    }

    // TradingView-style: clicking an unselected drawing selects it but does
    // NOT start editing. Only clicking a handle or an already-selected body
    // enters edit mode. Shift-click always adds to selection without editing.
    const alreadySelected = this.selection.has(hit.id);
    if (!additive) {
      if (!alreadySelected) {
        // First click on an unselected drawing: select only, no edit mode
        this.selection.clear();
        this.selection.select(hit.id, { additive: false });
        return true;
      }
      // Click on already-selected drawing: select it (refreshes selection) and
      // fall through to enter edit mode below.
      this.selection.select(hit.id, { additive: false });
    } else {
      // Shift-click: toggle selection, no edit mode
      this.selection.select(hit.id, { additive: true });
      return true;
    }

    // If we hit a handle on the selected drawing, always enter edit mode.
    // If we hit the body of an already-selected drawing, enter edit mode.
    // Handles always edit regardless of selection state.
    const isHandle = hit.kind !== 'body';
    if (!isHandle && !alreadySelected) {
      // Shouldn't reach here due to early return above, but safety
      return true;
    }

    const transform = this.getTransform(); if (!transform) return true;
    const drawing = this.registry.get(hit.id); if (!drawing) return true;
    if (hit.kind === 'insert') {
      this.mode = {
        id: hit.id, kind: 'insert', from: hit.from, to: hit.to,
        start: transform.pixelToAnchor(point.x, point.y),
        startCursor: { x: point.x, y: point.y }, original: clone(drawing),
      };
      return true;
    }
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
    const snapActive = !mods.ctrl && this.snap?.magnet;
    if (mode.kind === 'group') { this.moveGroup(point, transform, mode, mods, snapActive); return; }
    const next = clone(mode.original);
    const isChannel = isChannelType(mode.original.drawingType) || isFibType(mode.original.drawingType);
    const isPosition = isPositionType(mode.original.drawingType);
    const isText = isTextType(mode.original.drawingType);
    if (mode.kind === 'insert') {
      // Turn the drag into a real anchor at the cursor between from/to.
      let anchor = transform.pixelToAnchor(point.x, point.y);
      if (snapActive && this.snap.magnet) anchor = snapAnchor(anchor, this.getCandles(), this.snap);
      next.anchorPoints.splice(mode.from + 1, 0, anchor);
      mode.kind = 'point';
      mode.anchorIndex = mode.from + 1;
      this.commit(this.replaceIn(this.getDrawings(), next), { rect: this.strokeDirty(mode.original, next, transform) });
      return;
    }
    if (mode.kind === 'size' && isText) { this.textResize(point, mode, next); }
    else if (mode.kind === 'anchor' && isPosition) { this.positionAnchor(point, transform, mode, next, snapActive); }
    else if (mode.kind === 'midpoint' && isPosition) { this.moveBody(point, transform, mode, next, snapActive); }
    else if (mode.kind === 'anchor') {
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
    const rect = isZoneType(mode.original.drawingType) || isChannel || isPosition
      ? null
      : isText ? this.textDirty(mode.original, next, transform) : this.layers.dirtyRect(mode.original, next, transform);
    this.commit(this.replaceIn(this.getDrawings(), next), { rect });
  }

  // Text box resize: drag the bottom-right size handle; the anchor (top-left
  // pin) stays put. Disables auto-size so the manual box survives.
  textResize(point, mode, next) {
    const origin = textAnchorPoint(next, this.getTransform());
    if (!origin) return;
    const width = Math.max(40, point.x - origin.x);
    const height = Math.max(24, point.y - origin.y);
    next.text = { ...(next.text || {}), box: { width, height }, autoSize: false };
  }

  // Dirty rect for text/label edits: the box is px-sized and can exceed the
  // anchor point, so the bounds come from the box geometry (rotation-aware).
  textDirty(before, after, transform) {
    const b = textBoundsRect(before, transform);
    const a = textBoundsRect(after, transform);
    if (!b || !a) return null;
    return padRect(unionRect(b, a), 4);
  }

  // Entry/SL/TP drag: only the price changes, the anchor keeps its time.
  // Matches the TradingView position tools where dragging a line moves it
  // along the price axis while the position box stays at its placement time.
  positionAnchor(point, transform, mode, next, snapActive) {
    let anchor = transform.pixelToAnchor(point.x, point.y);
    if (snapActive && this.snap.magnet) anchor = snapAnchor(anchor, this.getCandles(), this.snap);
    next.anchorPoints[mode.anchorIndex] = { ...next.anchorPoints[mode.anchorIndex], price: anchor.price };
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

  // Shape corner drag: resize with opposite corner fixed (box) or free move
  // (triangle). Converts anchors → pixel corners, applies the geometric resize,
  // then converts back to market coordinates so the shape stays consistent.
  shapeCorner(point, transform, mode, next, snapActive) {
    if (isChannelType(next.drawingType)) { this.shapeCornerChannel(point, transform, mode, next, snapActive); return; }
    const def = DRAWING_DEFINITIONS[next.drawingType];
    const cornerCount = def?.cornerCount || 4;
    const corners = next.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
    if (corners.length < 3) {
      let anchor = transform.pixelToAnchor(point.x, point.y);
      if (snapActive && this.snap.magnet) anchor = snapAnchor(anchor, this.getCandles(), this.snap);
      next.anchorPoints[mode.anchorIndex] = anchor;
      return;
    }
    const idx = Math.min(mode.anchorIndex, corners.length - 1);
    let moved;
    if (cornerCount === 3) {
      moved = moveCorner(corners, idx, point);
    } else if (next.drawingType === 'circle') {
      moved = resizeSquare(corners, idx, point);
    } else {
      moved = resizeBox(corners, idx, point);
    }
    next.anchorPoints = moved.map((p, i) => {
      let result = transform.pixelToAnchor(p.x, p.y);
      if (snapActive && this.snap.magnet) result = snapAnchor(result, this.getCandles(), this.snap);
      return result;
    });
    if (isRegressionType(next.drawingType) && mode.anchorIndex <= 1) this.refitRegression(next);
  }

  shapeCornerChannel(point, transform, mode, next, snapActive) {
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
  // Midpoint drag = symmetric scale: the midpoint follows the cursor and
  // all anchors scale about the drawing's geometric center. This keeps the
  // shape's center stationary while the user drags a handle outward/inward.
  scaleMidpoint(point, transform, mode, next, snapActive) {
    const points = next.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
    if (points.length < 2) return;
    const center = points.length >= 3 ? polygonCenter(points) : midpointOf(points[0], points[1]);
    const oldDist = Math.max(1, distance(center, mode.startCursor || points[0]));
    const newDist = Math.max(1, distance(center, point));
    const scale = newDist / oldDist;
    next.anchorPoints = next.anchorPoints.map((anchor) => {
      const p = transform.anchorToPixel(anchor); if (!p) return anchor;
      const x = center.x + (p.x - center.x) * scale;
      const y = center.y + (p.y - center.y) * scale;
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
    if (isTextType(next.drawingType)) {
      // Single-anchor text boxes rotate in screen space around the box
      // center; the rotation is stored in degrees on text.rotation.
      const origin = textAnchorPoint(next, transform);
      const box = estimateBox(next);
      if (!origin) return;
      const pivot = { x: origin.x + box.width / 2, y: origin.y + box.height / 2 };
      const mods = this.getMods() || {};
      let delta = Math.atan2(point.y - pivot.y, point.x - pivot.x) - Math.atan2(mode.startCursor.y - pivot.y, mode.startCursor.x - pivot.x);
      if (mods.shift) delta = Math.round(delta / (Math.PI / 12)) * (Math.PI / 12);
      const current = Number(next.text?.rotation) || 0;
      next.text = { ...(next.text || {}), rotation: (current + (delta * 180) / Math.PI + 360) % 360 };
      return;
    }
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
      if (isStrokeType(drawing.drawingType)) {
        // Stroke anchors are time-sorted: binary search the ±threshold window
        // instead of walking every point of a dense stroke.
        const from = Math.max(0, lowerBound(drawing.anchorPoints, Math.min(t0, t1)) - 1);
        const to = Math.min(drawing.anchorPoints.length - 1, lowerBound(drawing.anchorPoints, Math.max(t0, t1)) + 1);
        for (let i = from; i <= to; i += 1) {
          const candidate = drawing.anchorPoints[i];
          const p = transform.anchorToPixel(candidate); if (!p) continue;
          const d = Math.hypot(p.x - point.x, p.y - point.y);
          if (d <= bestDistance) { bestDistance = d; best = candidate; }
        }
        return;
      }
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

  delete() { this.deleteIds(this.selection.ids()); }

  // Bulk delete (object tree): removes the given ids as one undoable group.
  deleteIds(ids) {
    ids = ids.filter((id) => this.registry.get(id));
    if (!ids.length) return;
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

  // --- Stroke (brush family) editing --------------------------------------

  pointEditingId() { return this.pointEditId; }
  exitPointEdit() { this.pointEditId = null; return null; }

  // Enter point-edit mode for a stroke drawing. Freehand strokes are first
  // converted to a smoothed control path (raw:false) so every anchor is an
  // editable control point; path/polyline/curve/arc keep their anchors.
  togglePointEdit(id) {
    const drawing = this.registry.get(id);
    if (!drawing || !isStrokeType(drawing.drawingType)) return this.exitPointEdit();
    if (this.pointEditId === id) return this.exitPointEdit();
    if (drawing.brush?.raw !== false && drawing.drawingType !== 'polyline') {
      const transform = this.getTransform(); if (!transform) return this.exitPointEdit();
      const next = convertToSmooth(drawing, transform);
      this.history.execute({
        label: 'Convert stroke to path',
        apply: () => this.commit(this.replaceIn(this.getDrawings(), next)),
        revert: () => this.commit(this.replaceIn(this.getDrawings(), drawing)),
      });
    }
    this.pointEditId = id;
    this.selection.replace([id]);
    return id;
  }

  // Erase operation (eraser tool): stroke targets are partially erased and
  // auto-split; everything else is deleted when touched. One undoable group.
  erase(eraserDrawing) {
    const transform = this.getTransform(); if (!transform) return;
    const targets = [...this.getDrawings()].filter((d) => d.id !== eraserDrawing.id);
    const affected = targets.filter((d) => {
      if (isStrokeType(d.drawingType)) return eraseStroke(d, eraserDrawing, transform) !== null;
      return eraseTouches(d, eraserDrawing, transform);
    });
    if (!affected.length) return;
    const before = this.getDrawings();
    this.history.beginGroup('Erase drawings');
    affected.forEach((target) => {
      if (isStrokeType(target.drawingType)) {
        const fragments = eraseStroke(target, eraserDrawing, transform);
        if (!fragments) return;
        if (!fragments.length) {
          this.history.execute({
            label: 'Erase drawing',
            apply: () => this.commit(this.getDrawings().filter((item) => item.id !== target.id)),
            revert: () => this.commit([...this.getDrawings(), target]),
          });
        } else {
          this.history.execute({
            label: 'Erase drawing',
            apply: () => this.commit([...this.getDrawings().filter((item) => item.id !== target.id), ...fragments]),
            revert: () => this.commit(this.getDrawings().filter((item) => !fragments.some((f) => f.id === item.id) && item.id !== target.id).concat(target)),
          });
        }
      } else {
        this.history.execute({
          label: 'Erase drawing',
          apply: () => this.commit(this.getDrawings().filter((item) => item.id !== target.id)),
          revert: () => this.commit([...this.getDrawings(), target]),
        });
      }
    });
    this.history.endGroup();
    return before.length !== this.getDrawings().length || affected.length > 0;
  }

  // Context-menu point ops: target the control point nearest the click.
  nearestControlPoint(id, x, y) {
    const drawing = this.registry.get(id); if (!drawing || drawing.locked) return null;
    const transform = this.getTransform(); if (!transform) return null;
    const pixels = drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
    if (!pixels.length) return null;
    let best = 0; let bestDist = Infinity;
    pixels.forEach((p, index) => {
      const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
      if (d < bestDist) { bestDist = d; best = index; }
    });
    return { index: best, screen: pixels[best] };
  }

  insertAnchorAt(id, x, y) {
    const drawing = this.registry.get(id); if (!drawing || !isStrokeType(drawing.drawingType)) return;
    const transform = this.getTransform(); if (!transform) return;
    const near = this.nearestControlPoint(id, x, y);
    if (!near) return;
    const at = near.index;
    const anchor = transform.pixelToAnchor(x, y);
    const next = clone(drawing);
    next.anchorPoints.splice(at + 1, 0, anchor);
    this.history.execute({
      label: 'Insert anchor',
      apply: () => this.commit(this.replaceIn(this.getDrawings(), next)),
      revert: () => this.commit(this.replaceIn(this.getDrawings(), drawing)),
    });
  }

  deleteAnchorAt(id, x, y) {
    const drawing = this.registry.get(id); if (!drawing || !isStrokeType(drawing.drawingType)) return;
    const near = this.nearestControlPoint(id, x, y);
    if (!near || drawing.anchorPoints.length <= 2) return;
    const next = { ...clone(drawing), anchorPoints: drawing.anchorPoints.filter((_, i) => i !== near.index) };
    this.history.execute({
      label: 'Delete anchor',
      apply: () => this.commit(this.replaceIn(this.getDrawings(), next)),
      revert: () => this.commit(this.replaceIn(this.getDrawings(), drawing)),
    });
  }

  // smooth=true: the anchor becomes a smooth curve point; false: a corner.
  convertAnchorAt(id, x, y, smooth) {
    const drawing = this.registry.get(id); if (!drawing || !isStrokeType(drawing.drawingType)) return;
    const near = this.nearestControlPoint(id, x, y);
    if (!near) return;
    const next = clone(drawing);
    next.brush = { ...(next.brush || {}), raw: false };
    const flags = Array.isArray(next.brush.smooth) ? [...next.brush.smooth] : [];
    while (flags.length < next.anchorPoints.length) flags.push(true);
    flags[near.index] = smooth;
    next.brush.smooth = flags;
    this.history.execute({
      label: smooth ? 'Smooth anchor' : 'Sharp anchor',
      apply: () => this.commit(this.replaceIn(this.getDrawings(), next)),
      revert: () => this.commit(this.replaceIn(this.getDrawings(), drawing)),
    });
  }

  strokeDirty(before, after, transform) {
    return this.layers.dirtyRect(before, after, transform);
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

  // Position payload patch (properties panel): lots / account / currency /
  // fixed risk / fixed reward. Merged into drawing.position as one undoable
  // delta command; derived risk/reward numbers are recomputed at render.
  updatePosition(id, patch) {
    const drawing = this.registry.get(id); if (!drawing) return;
    const next = { ...drawing, position: { ...(drawing.position || {}), ...patch } };
    this.history.execute({
      label: 'Position settings',
      apply: () => this.commit(this.replaceIn(this.getDrawings(), next)),
      revert: () => this.commit(this.replaceIn(this.getDrawings(), drawing)),
    });
  }

  // Flip direction: swap the SL and TP anchors so a long becomes a short
  // (and vice versa) in one undoable command.
  flipPosition(id) {
    const drawing = this.registry.get(id); if (!drawing || !isPositionType(drawing.drawingType)) return;
    const [entry, sl, tp] = drawing.anchorPoints;
    if (!sl || !tp) return;
    const next = { ...drawing, anchorPoints: [entry, tp, sl] };
    this.history.execute({
      label: 'Flip position',
      apply: () => this.commit(this.replaceIn(this.getDrawings(), next)),
      revert: () => this.commit(this.replaceIn(this.getDrawings(), drawing)),
    });
  }

  // Text payload patch (properties panel): font / box / alignment etc.
  // Merged into drawing.text as one undoable delta command.
  updateText(id, patch) {
    const drawing = this.registry.get(id); if (!drawing) return;
    const next = { ...drawing, text: { ...(drawing.text || {}), ...patch } };
    this.history.execute({
      label: 'Text settings',
      apply: () => this.commit(this.replaceIn(this.getDrawings(), next)),
      revert: () => this.commit(this.replaceIn(this.getDrawings(), drawing)),
    });
  }

  // Live content edit (textarea typing): committed without a history entry
  // so keystrokes don't flood the undo stack.
  updateTextLive(id, patch) {
    const drawing = this.registry.get(id); if (!drawing) return;
    const next = { ...drawing, text: { ...(drawing.text || {}), ...patch } };
    this.commit(this.replaceIn(this.getDrawings(), next));
  }

  // Z-order move (context menu): reorders the drawing list; registry order
  // is the render z-order, so this changes stacking without touching data.
  // Directions: front/back jump to the ends, forward/backward step one place.
  zMove(id, direction) {
    const drawing = this.registry.get(id); if (!drawing) return;
    const before = this.getDrawings();
    let list = [...before];
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return;
    if (direction === 'front') { list.splice(index, 1); list.push(drawing); }
    else if (direction === 'back') { list.splice(index, 1); list.unshift(drawing); }
    else if (direction === 'forward') { if (index < list.length - 1) { list[index] = list[index + 1]; list[index + 1] = drawing; } else return; }
    else if (direction === 'backward') { if (index > 0) { list[index] = list[index - 1]; list[index - 1] = drawing; } else return; }
    else return;
    const label = ({ front: 'Bring to front', back: 'Send to back', forward: 'Bring forward', backward: 'Send backward' })[direction];
    this.history.execute({
      label,
      apply: () => this.commit(list),
      revert: () => this.commit(before),
    });
  }

  // Exact z-order from the object tree (drag & drop): `ids` must be a
  // permutation of the current drawing list; the commit is one undoable step.
  reorder(ids) {
    const before = this.getDrawings();
    if (before.length !== ids.length) return;
    const byId = new Map(before.map((item) => [item.id, item]));
    const list = ids.map((id) => byId.get(id)).filter(Boolean);
    if (list.length !== before.length) return;
    this.history.execute({
      label: 'Reorder drawings',
      apply: () => this.commit(list),
      revert: () => this.commit(before),
    });
  }

  // Bulk style patch (object tree presets / multi-select): one undoable
  // history group covering every selected drawing.
  applyStyle(ids, patch) {
    const drawings = this.getDrawings();
    const targets = ids.map((id) => drawings.find((item) => item.id === id)).filter(Boolean);
    if (!targets.length) return;
    const originals = targets.map((item) => clone(item));
    const nexts = targets.map((item) => ({ ...item, style: { ...(item.style || {}), ...patch } }));
    const next = this.groupReplace(drawings, nexts);
    const dirty = this.groupDirty(originals, nexts, this.getTransform());
    this.history.execute({
      label: 'Apply style',
      apply: () => this.commit(next, { rect: dirty }),
      revert: () => this.commit(this.groupReplace(this.getDrawings(), originals), { rect: dirty }),
    });
  }

  // Group selected drawings: every member gets a shared groupId (and name).
  group(ids) {
    const targets = ids.map((id) => this.registry.get(id)).filter(Boolean);
    if (!targets.length) return;
    const groupId = nextGroupId(); const groupName = defaultGroupName(groupId);
    const originals = targets.map(clone);
    const nexts = targets.map((item) => ({ ...item, groupId, groupName }));
    const next = this.groupReplace(this.getDrawings(), nexts);
    this.history.execute({
      label: 'Group drawings',
      apply: () => this.commit(next),
      revert: () => this.commit(this.groupReplace(this.getDrawings(), originals)),
    });
  }

  // Ungroup: members lose their groupId; empty groups disappear implicitly.
  ungroup(ids) {
    const targets = ids.map((id) => this.registry.get(id)).filter(Boolean);
    if (!targets.length) return;
    const originals = targets.map(clone);
    const nexts = targets.map((item) => { const copy = { ...item, groupId: null, groupName: null }; delete copy.groupId; delete copy.groupName; return copy; });
    const next = this.groupReplace(this.getDrawings(), nexts);
    this.history.execute({
      label: 'Ungroup drawings',
      apply: () => this.commit(next),
      revert: () => this.commit(this.groupReplace(this.getDrawings(), originals)),
    });
  }

  // Rename a group: updates the name on every member (one history command).
  renameGroup(groupId, name) {
    const drawings = this.getDrawings();
    const members = drawings.filter((item) => item.groupId === groupId);
    if (!members.length) return;
    const originals = members.map(clone);
    const nexts = members.map((item) => ({ ...item, groupName: String(name).slice(0, 60) }));
    const next = this.groupReplace(drawings, nexts);
    this.history.execute({
      label: 'Rename group',
      apply: () => this.commit(next),
      revert: () => this.commit(this.groupReplace(this.getDrawings(), originals)),
    });
  }

  // Apply a template: materialize fresh drawings (new ids, current chart
  // identity, no group state) and select them — one undoable command.
  applyTemplate(template, identity = {}) {
    const copies = drawingsFromTemplate(template, identity);
    if (!copies.length) return;
    this.history.execute({
      label: `Apply template: ${template.name}`,
      apply: () => this.commit([...this.getDrawings(), ...copies]),
      revert: () => this.commit(this.getDrawings().filter((item) => !copies.some((copy) => copy.id === item.id))),
    });
    this.selection.replace(copies.map((copy) => copy.id));
  }

  groupReplace(list, nexts) {
    const byId = new Map(nexts.map((item) => [item.id, item]));
    return list.map((item) => byId.get(item.id) || item);
  }
  groupDirty(originals, nexts, transform) {
    if (originals.some((item) => isZoneType(item.drawingType) || isChannelType(item.drawingType) || isPositionType(item.drawingType))) return null;
    let rect = null;
    for (let i = 0; i < originals.length; i += 1) {
      const part = isTextType(originals[i].drawingType)
        ? this.textDirty(originals[i], nexts[i], transform)
        : this.layers.dirtyRect(originals[i], nexts[i], transform);
      if (!part) return null;
      rect = rect ? unionRect(rect, part) : part;
    }
    return rect;
  }
}

const angleLocked = (pivot, cursor) => {
  const dx = cursor.x - pivot.x; const dy = cursor.y - pivot.y;
  const angle = Math.atan2(dy, dx);
  // 15-degree increments (TradingView convention)
  const snapped = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
  const length = Math.hypot(dx, dy);
  return { x: pivot.x + Math.cos(snapped) * length, y: pivot.y + Math.sin(snapped) * length };
};
const midpointOf = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
