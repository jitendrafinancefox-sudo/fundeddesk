'use client';
export function bindCrosshair(chart, onMove) {
  chart.subscribeCrosshairMove(onMove);
  return () => chart.unsubscribeCrosshairMove(onMove);
}
