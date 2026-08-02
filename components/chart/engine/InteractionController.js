'use client';

// Converts DOM gestures into viewport operations. It owns no chart state and
// only calls the injected engine interface, which keeps input independent from rendering.
export class InteractionController {
  constructor(engine) { this.engine = engine; this.last = null; this.velocity = 0; this.frame = null; }
  startPan(point) { this.stopInertia(); this.last = { ...point, at: performance.now() }; this.velocity = 0; }
  movePan(point) { if (!this.last) return; const now = performance.now(); const dx = point.x - this.last.x; const elapsed = Math.max(1, now - this.last.at); this.velocity = dx / elapsed * 16; this.engine.pan(dx); this.last = { ...point, at: now }; }
  endPan() { this.last = null; if (Math.abs(this.velocity) > .2) this.inertia(); }
  inertia() { this.engine.pan(this.velocity); this.velocity *= .92; if (Math.abs(this.velocity) > .05) this.frame = requestAnimationFrame(() => this.inertia()); }
  zoom(deltaY, x) { this.engine.zoom(deltaY, x); }
  stopInertia() { if (this.frame) cancelAnimationFrame(this.frame); this.frame = null; this.velocity = 0; }
  destroy() { this.stopInertia(); }
}
