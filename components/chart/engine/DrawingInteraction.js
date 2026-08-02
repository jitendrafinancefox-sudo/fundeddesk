'use client';
import { selectDrawing } from '../SelectionEngine';

const clone = (value) => structuredClone(value);
const distanceToSegment = (p, a, b) => { const dx = b.x - a.x; const dy = b.y - a.y; const length = dx * dx + dy * dy; const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0; return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)); };

export class DrawingInteraction {
  constructor({ getDrawings, setDrawings, getTransform }) { this.getDrawings = getDrawings; this.setDrawings = setDrawings; this.getTransform = getTransform; this.selected = new Set(); this.mode = null; this.clipboard = []; }
  hit(point) { const transform = this.getTransform(); const drawings = this.getDrawings(); const anchorHit = selectDrawing(drawings, point, transform, 9); if (anchorHit) return anchorHit; return drawings.find((drawing) => { const [a, b] = drawing.anchorPoints.map(transform.anchorToPixel); return a && b && distanceToSegment(point, a, b) < 7; })?.id || null; }
  pointerDown(point, { additive = false } = {}) { const id = this.hit(point); if (!id) { if (!additive) this.selected.clear(); return false; } if (!additive) this.selected.clear(); this.selected.add(id); const drawing = this.getDrawings().find((item) => item.id === id); const transform = this.getTransform(); const anchorIndex = drawing.anchorPoints.findIndex((anchor) => { const p = transform.anchorToPixel(anchor); return p && Math.hypot(p.x - point.x, p.y - point.y) < 10; }); this.mode = { id, anchorIndex, start: transform.pixelToAnchor(point.x, point.y), original: clone(drawing) }; return true; }
  pointerMove(point) { if (!this.mode) return; const transform = this.getTransform(); const now = transform.pixelToAnchor(point.x, point.y); const { id, anchorIndex, start, original } = this.mode; this.setDrawings(this.getDrawings().map((drawing) => { if (drawing.id !== id) return drawing; const next = clone(original); if (anchorIndex >= 0) next.anchorPoints[anchorIndex] = now; else { const dt = now.time - start.time; const dp = now.price - start.price; next.anchorPoints = next.anchorPoints.map((anchor) => ({ time: anchor.time + dt, price: anchor.price + dp })); } return next; })); }
  pointerUp() { this.mode = null; }
  delete() { const ids = this.selected; this.setDrawings(this.getDrawings().filter((drawing) => !ids.has(drawing.id))); this.selected.clear(); }
  duplicate() { const selected = this.getDrawings().filter((drawing) => this.selected.has(drawing.id)); const copies = selected.map((drawing) => ({ ...clone(drawing), id: crypto.randomUUID(), anchorPoints: drawing.anchorPoints.map((point) => ({ time: point.time, price: point.price })) })); this.setDrawings([...this.getDrawings(), ...copies]); this.selected = new Set(copies.map((copy) => copy.id)); }
  copy() { this.clipboard = this.getDrawings().filter((drawing) => this.selected.has(drawing.id)).map(clone); }
  paste() { const copies = this.clipboard.map((drawing) => ({ ...drawing, id: crypto.randomUUID() })); this.setDrawings([...this.getDrawings(), ...copies]); this.selected = new Set(copies.map((copy) => copy.id)); }
  selectedIds() { return [...this.selected]; }
}
