'use client';

// Coalesces invalidations into one animation frame. Dirty regions are unioned;
// a full invalidation is reserved for viewport/data changes, while overlays can
// redraw a small rectangle without asking candle/grid renderers to repaint.
export class RenderPipeline {
  constructor(canvas, renderers) { this.canvas = canvas; this.renderers = renderers; this.pending = null; this.frame = null; }
  invalidate(reason = 'full', rect = null) {
    if (!this.pending || reason === 'full') this.pending = { full: reason === 'full', rect };
    else if (rect) this.pending.rect = union(this.pending.rect, rect);
    if (!this.frame) this.frame = requestAnimationFrame(() => this.flush());
  }
  flush() {
    this.frame = null; const dirty = this.pending || { full: true, rect: null }; this.pending = null;
    const ctx = this.canvas.getContext('2d'); if (!ctx) return;
    if (dirty.full) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    else if (dirty.rect) ctx.clearRect(dirty.rect.x, dirty.rect.y, dirty.rect.width, dirty.rect.height);
    // Base and overlay share ONE canvas, so a partial redraw must repaint the
    // base layer inside the dirty region as well — skipping it would clear the
    // candles there and never draw them back.
    this.renderers.forEach((renderer) => {
      ctx.save(); if (!dirty.full && dirty.rect) { ctx.beginPath(); ctx.rect(dirty.rect.x, dirty.rect.y, dirty.rect.width, dirty.rect.height); ctx.clip(); } renderer.render(ctx, dirty); ctx.restore();
    });
  }
  destroy() { if (this.frame) cancelAnimationFrame(this.frame); this.frame = null; this.pending = null; }
}
function union(a, b) { if (!a) return b; return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.max(a.x + a.width, b.x + b.width) - Math.min(a.x, b.x), height: Math.max(a.y + a.height, b.y + b.height) - Math.min(a.y, b.y) }; }
