'use client';

// Projection adapter: implements the legacy ProjectionService shape (the one
// every drawing geometry/hit-test module consumes) on top of the TradingView
// Lightweight Charts coordinate APIs. This is the ONLY place pixels are
// converted — drawing code never computes screen positions by hand.
//
// Coordinate conversion exclusively uses:
//   priceToCoordinate / coordinateToPrice
//   timeToCoordinate / coordinateToTime
//   logicalToCoordinate / coordinateToLogical

export function createOverlayViewport({ tvChart, container }) {
  const timeScale = () => tvChart.chart.timeScale();
  const series = () => tvChart.series;

  // LWC's timeToCoordinate only maps times that exactly equal a data bar
  // time. Anchors placed on a finer interval (e.g. 5m) would otherwise
  // return null once the chart switches to a coarser interval (e.g. 15m),
  // dropping drawings. Snap such times to the nearest bar time first.
  const snapTimeToBar = (t) => {
    const data = series().data();
    if (!data || !data.length) return t;
    let lo = 0;
    let hi = data.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (data[mid].time < t) lo = mid + 1; else hi = mid - 1;
    }
    const prev = hi >= 0 ? data[hi].time : null;
    const next = lo < data.length ? data[lo].time : null;
    if (prev == null) return next;
    if (next == null) return prev;
    return t - prev <= next - t ? prev : next;
  };

  const timeToCoordinate = (t) => {
    const x = timeScale().timeToCoordinate(t);
    return x == null ? timeScale().timeToCoordinate(snapTimeToBar(t)) : x;
  };

  const projection = {
    // --- Price <-> pixel (vertical) ----------------------------------------
    pixelToPrice: (y) => series().coordinateToPrice(y),
    priceToPixel: (value) => series().priceToCoordinate(value),
    // --- Time <-> pixel (horizontal) ---------------------------------------
    pixelToIndex: (x) => timeScale().coordinateToLogical(x),
    pixelToTime: (x) => timeScale().coordinateToTime(x),
    timeToPixel: (t) => timeToCoordinate(t),
    timeToIndex: (t) => {
      const x = timeToCoordinate(t);
      return x == null ? null : timeScale().coordinateToLogical(x);
    },
    // --- Screen-space round trips (screen == chart plot area) --------------
    screenToTime: (x) => timeScale().coordinateToTime(x),
    screenToPrice: (y) => series().coordinateToPrice(y),
    timeToScreen: (t) => timeToCoordinate(t),
    priceToScreen: (value) => series().priceToCoordinate(value),
    // --- Space mappings (overlay == chart plot area, identity) -------------
    canvasToChart: (x, y) => ({ x, y }),
    chartToCanvas: (x, y) => ({ x, y }),
    viewportToScreen: (x, y) => ({ x, y }),
    screenToViewport: (x, y) => ({ x, y }),
    // --- Drawing anchors (market coords are ALWAYS {time, price}) ----------
    anchorToPixel: (anchor) => {
      const x = timeToCoordinate(anchor.time);
      const y = series().priceToCoordinate(anchor.price);
      return x == null || y == null ? null : { x, y };
    },
    pixelToAnchor: (x, y) => ({
      time: timeScale().coordinateToTime(x),
      price: series().coordinateToPrice(y),
    }),
    size: () => {
      const size = tvChart.getPaneSize();
      return size ? { width: size.width, height: size.height } : { width: 0, height: 0 };
    },
  };

  let revision = 0;
  const get = () => {
    revision += 1;
    return projection;
  };

  const getBarSpacing = () => {
    const ts = timeScale();
    const range = ts.getVisibleLogicalRange();
    if (!range || range.to <= range.from) return 8;
    const a = ts.logicalToCoordinate(range.from);
    const b = ts.logicalToCoordinate(range.to);
    if (a == null || b == null) return 8;
    return Math.max(1, (b - a) / (range.to - range.from));
  };

  const panByPixels = (dx) => {
    const ts = timeScale();
    const range = ts.getVisibleLogicalRange();
    if (!range) return;
    const spacing = getBarSpacing();
    const delta = dx / spacing;
    ts.setVisibleLogicalRange({ from: range.from - delta, to: range.to - delta });
  };

  const panToTime = (time) => {
    const ts = timeScale();
    const range = ts.getVisibleLogicalRange();
    if (!range) return;
    const x = timeToCoordinate(time);
    if (x == null) return;
    const delta = x - ts.coordinateToLogical(0);
    ts.setVisibleLogicalRange({ from: range.from + delta, to: range.to + delta });
  };

  return {
    get,
    projection,
    getBarSpacing,
    panByPixels,
    panToTime,
    container,
    tvChart,
  };
}
