'use client';

// Builds the projection object — the single conversion surface every renderer
// and drawing tool reads. All values are CSS pixels (the canvas transform
// already handles devicePixelRatio). The object is read-only; callers must
// treat it as immutable and rebuild via CoordinateEngine.revision changes.
export class ProjectionService {
  constructor(viewport) {
    this.viewport = viewport;
    this._cached = null; // { revision, candles, projection }
  }

  // Returns the cached projection while (viewport revision, candle array)
  // are unchanged; rebuilding allocates a fresh object otherwise. This is
  // the memoization point: a pan/zoom/redraw reuses one object, so renderers
  // and drawing code never re-derive conversions per frame.
  get(candles) {
    const revision = this.viewport.revision;
    if (this._cached && this._cached.revision === revision && this._cached.candles === candles) return this._cached.projection;
    const projection = this.build(candles);
    this._cached = { revision, candles, projection };
    return projection;
  }

  build(candles) {
    const vp = this.viewport;
    const time = vp.timeScale; const price = vp.priceScale; const transform = vp.transformer;
    return {
      // --- Price <-> pixel (vertical) --------------------------------------
      pixelToPrice: (y) => price.yToPrice(y),
      priceToPixel: (value) => price.priceToY(value),
      // --- Time <-> pixel (horizontal) -------------------------------------
      pixelToIndex: (x) => time.xToIndex(x),
      pixelToTime: (x) => time.pixelToTime(x),
      timeToPixel: (t) => time.timeToPixel(t),
      timeToIndex: (t) => time.timeToIndex(t),
      // --- Screen-space round trips (screen == chart plot area today) -------
      screenToTime: (x) => time.pixelToTime(x),
      screenToPrice: (y) => price.yToPrice(y),
      timeToScreen: (t) => time.timeToPixel(t),
      priceToScreen: (value) => price.priceToY(value),
      // --- Space mappings (inset-aware, insets are 0 today) -----------------
      canvasToChart: (x, y) => transform.canvasToChart(x, y),
      chartToCanvas: (x, y) => transform.chartToCanvas(x, y),
      viewportToScreen: (x, y) => transform.viewportToScreen(x, y),
      screenToViewport: (x, y) => transform.screenToViewport(x, y),
      // --- Drawing anchors (market coords are ALWAYS {time, price}) ---------
      anchorToPixel: (anchor) => {
        const x = time.timeToPixel(anchor.time);
        return x == null ? null : { x, y: price.priceToY(anchor.price) };
      },
      pixelToAnchor: (x, y) => ({ time: time.pixelToTime(x), price: price.yToPrice(y) }),
      size: () => ({ width: vp.state.width, height: vp.state.height }),
      viewport: vp,
    };
  }
}
