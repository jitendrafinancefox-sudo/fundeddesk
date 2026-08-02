'use client';
export function snapAnchor(anchor, candles, { magnet = false, mode = 'ohlc' } = {}) {
  if (!magnet || !candles.length) return anchor;
  const candle = candles.reduce((nearest, current) => Math.abs(current.time - anchor.time) < Math.abs(nearest.time - anchor.time) ? current : nearest, candles[0]);
  const prices = mode === 'close' ? [candle.close] : [candle.open, candle.high, candle.low, candle.close];
  const price = prices.reduce((nearest, current) => Math.abs(current - anchor.price) < Math.abs(nearest - anchor.price) ? current : nearest, prices[0]);
  return { time: candle.time, price };
}
