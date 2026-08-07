'use client';

// Coalesces invalidations into one animation frame. Renderers are split into
// two layers:
//   base    — grid, candles, indicators, axes, static drawings. These only
//             change on data/viewport/theme updates, so they paint into an
//             offscreen canvas (the "base cache") instead of the visible one.
//   overlay — crosshair, marquee, handles, pending drawing preview. Redrawn
//             every frame on top of the blitted base cache.
// Pointer-rate updates (crosshair moves, marquee drags, drawing previews)
// therefore never repaint candles or grids: the flush just blits the cached
// base and draws the cheap overlay. The scene is built ONCE per flush and
// shared by every renderer instead of being reconstructed per renderer.
export class RenderPipeline {
  constructor(canvas, renderers, baseCanvas) {
    this.canvas = canvas;
    this.base = renderers.base || [];
    this.overlay = renderers.overlay || [];
    this.baseCanvas = baseCanvas;
    this.ratio = 1;
    this.pending = null;
    this.frame = null;
    this.flushed = false;
    this.sceneFactory = null;
  }
  setSceneFactory(fn) { this.sceneFactory = fn; }
  invalidate(reason = 'full', rect = null) {
    if (reason === 'overlay') {
      if (this.pending && this.pending.base) { this.pending.overlayFull = true; return; }
      this.pending = { full: false, rect: null, base: false, overlayFull: true };
    } else if (reason === 'full') {
      this.pending = { full: true, rect: null, base: true, overlayFull: true };
    } else if (this.pending) {
      if (!this.pending.full) { this.pending.rect = union(this.pending.rect, rect); this.pending.base = true; }
    } else {
      this.pending = { full: false, rect, base: true, overlayFull: false };
    }
    if (!this.frame) this.frame = requestAnimationFrame(() => this.flush());
  }
  flush() {
    this.frame = null;
    // First flush is always full so the base cache can never be blitted empty.
    const dirty = this.flushed ? (this.pending || { full: true, rect: null, base: true, overlayFull: true }) : { full: true, rect: null, base: true, overlayFull: true };
    this.pending = null;
    this.flushed = true;
    const ctx = this.canvas.getContext('2d');
    const bctx = this.baseCanvas.getContext('2d');
    if (!ctx || !bctx) return;
    const scene = this.sceneFactory ? this.sceneFactory() : null;
    const ratio = this.ratio;
    const rect = dirty.rect;
    const basePartial = !dirty.full && rect;

    // 1) Repaint the cached base layer only when data/viewport changed.
    if (dirty.base) {
      if (dirty.full) bctx.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
      else if (rect) bctx.clearRect(rect.x, rect.y, rect.width, rect.height);
      for (const renderer of this.base) {
        bctx.save();
        if (basePartial) { bctx.beginPath(); bctx.rect(rect.x, rect.y, rect.width, rect.height); bctx.clip(); }
        renderer(bctx, scene);
        bctx.restore();
      }
    }

    // 2) Blit the cached base onto the visible canvas (source rect in device
    //    pixels, destination in CSS pixels — the ctx carries the DPR scale).
    if (dirty.full) ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    else if (rect) ctx.clearRect(rect.x, rect.y, rect.width, rect.height);
    if (dirty.full) ctx.drawImage(this.baseCanvas, 0, 0);
    else if (rect) ctx.drawImage(this.baseCanvas, rect.x * ratio, rect.y * ratio, rect.width * ratio, rect.height * ratio, rect.x, rect.y, rect.width, rect.height);

    // 3) Draw the overlay layer on top of the blit. A rect-only base repaint
    //    clips the overlay unless an overlay change landed in the same frame.
    const overlayFull = dirty.full || dirty.overlayFull;
    for (const renderer of this.overlay) {
      ctx.save();
      if (!overlayFull && rect) { ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.width, rect.height); ctx.clip(); }
      renderer(ctx, scene);
      ctx.restore();
    }
  }
  destroy() { if (this.frame) cancelAnimationFrame(this.frame); this.frame = null; this.pending = null; }
}
function union(a, b) { if (!a) return b; return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.max(a.x + a.width, b.x + b.width) - Math.min(a.x, b.x), height: Math.max(a.y + a.height, b.y + b.height) - Math.min(a.y, b.y) }; }
