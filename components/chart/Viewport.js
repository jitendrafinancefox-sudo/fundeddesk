'use client';
export function bindViewport(chart, onChange) {
  const handler = (range) => onChange?.(range);
  chart.timeScale().subscribeVisibleLogicalRangeChange(handler);
  return () => chart.timeScale().unsubscribeVisibleLogicalRangeChange(handler);
}
