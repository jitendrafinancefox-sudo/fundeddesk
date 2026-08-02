'use client';

// Compatibility entry point: returns the cached projection for the given
// viewport + candle array. The same object is handed to every renderer and
// drawing tool until the viewport revision changes, so coordinate math is
// derived once per frame instead of once per call.
export function createCoordinateTransform(viewport, candles) {
  return viewport.getProjection(candles);
}
