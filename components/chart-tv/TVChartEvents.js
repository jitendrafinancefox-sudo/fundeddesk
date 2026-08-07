export function extractCrosshairPayload(chart, series, param) {
  if (!param || !param.time) return null;
  const candle = param.seriesData ? param.seriesData.get(series) : null;
  const point = param.point ? { x: param.point.x, y: param.point.y } : null;
  return {
    time: param.time,
    logical: typeof param.logical === 'number' ? param.logical : null,
    price: candle ? candle.close : null,
    x: point ? point.x : null,
    y: point ? point.y : null,
    candle: candle
      ? { open: candle.open, high: candle.high, low: candle.low, close: candle.close }
      : null,
  };
}

export function bindChartEvents(chart, series, handlers = {}) {
  const onCrosshairMove = (param) => {
    handlers.onCrosshair?.(extractCrosshairPayload(chart, series, param));
  };
  chart.subscribeCrosshairMove(onCrosshairMove);

  let onVisibleRangeHandler = null;
  if (handlers.onVisibleRange) {
    onVisibleRangeHandler = (range) => handlers.onVisibleRange(range);
    chart.timeScale().subscribeVisibleTimeRangeChange(onVisibleRangeHandler);
  }

  let onClickHandler = null;
  if (handlers.onClick) {
    onClickHandler = (param) => handlers.onClick(extractCrosshairPayload(chart, series, param));
    chart.subscribeClick(onClickHandler);
  }

  return () => {
    chart.unsubscribeCrosshairMove(onCrosshairMove);
    if (onVisibleRangeHandler) chart.timeScale().unsubscribeVisibleTimeRangeChange(onVisibleRangeHandler);
    if (onClickHandler) chart.unsubscribeClick(onClickHandler);
  };
}
