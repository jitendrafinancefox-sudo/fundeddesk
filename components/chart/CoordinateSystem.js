'use client';
export function createCoordinateSystem(chart, series) {
  return {
    toPoint: ({ time, price }) => { const x = chart.timeScale().timeToCoordinate(time); const y = series.priceToCoordinate(price); return x == null || y == null ? null : { x, y }; },
    fromPoint: ({ x, y }) => { const time = chart.timeScale().coordinateToTime(x); const price = series.coordinateToPrice(y); return time == null || price == null ? null : { time, price }; },
  };
}
