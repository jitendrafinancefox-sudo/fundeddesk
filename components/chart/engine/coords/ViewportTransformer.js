'use client';

// Maps between the three coordinate spaces a chart touches:
//   - Screen  : CSS pixels, top-left origin of the canvas element
//   - Canvas  : device pixels (CSS × devicePixelRatio)
//   - Chart   : plot-area coordinates (canvas minus axis strips)
//
// The engine keeps the axis strips INSIDE the plot area today (the canvas IS
// the full chart), so chart == canvas for every renderer; the mapping still
// exists so a future axis-separated layout can opt in without touching any
// renderer. DPR is applied at the canvas transform, never inside conversions.
export class ViewportTransformer {
  constructor({ dpr = 1 } = {}) {
    this.dpr = Math.max(1, dpr || 1);
    this.insets = { left: 0, right: 0, top: 0, bottom: 0 };
  }
  setDpr(dpr) { this.dpr = Math.max(1, dpr || 1); }
  setInsets(insets) { this.insets = { ...this.insets, ...insets }; }

  // Screen (CSS px) -> canvas (device px) and back.
  screenToCanvas(x, y) { return { x: x * this.dpr, y: y * this.dpr }; }
  canvasToScreen(x, y) { return { x: x / this.dpr, y: y / this.dpr }; }

  // Canvas/plot area <-> chart area (inset-aware; insets are 0 today).
  canvasToChart(x, y) { return { x: x - this.insets.left, y: y - this.insets.top }; }
  chartToCanvas(x, y) { return { x: x + this.insets.left, y: y + this.insets.top }; }
  screenToChart(x, y) { const p = this.screenToCanvas(x, y); return this.canvasToChart(p.x, p.y); }
  chartToScreen(x, y) { const p = this.chartToCanvas(x, y); return this.canvasToScreen(p.x, p.y); }

  // Viewport == the plot area (what TimeScale/PriceScale call "width/height"),
  // so viewport <-> screen round-trips through the chart mapping.
  viewportToScreen(x, y) { return this.chartToScreen(x, y); }
  screenToViewport(x, y) { return this.screenToChart(x, y); }
}
