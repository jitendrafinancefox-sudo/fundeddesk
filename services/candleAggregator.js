export function normalizeCandle(row) {
  if (Array.isArray(row)) return { time: Math.floor(Number(row[0]) / 1000), open: +row[1], high: +row[2], low: +row[3], close: +row[4], volume: +row[5] || 0 };
  return { time: typeof row.time === 'number' ? row.time : Math.floor(new Date(row.time).getTime() / 1000), open: +row.open, high: +row.high, low: +row.low, close: +row.close, volume: +row.volume || 0 };
}

export function normalizeCandles(rows) { return (rows || []).map(normalizeCandle).filter((c) => Number.isFinite(c.time) && Number.isFinite(c.close)); }

export function aggregateTick(previous, tick, seconds) {
  const time = Math.floor(tick.time / seconds) * seconds;
  if (!previous || previous.time !== time) return { time, open: tick.price, high: tick.price, low: tick.price, close: tick.price };
  return { ...previous, high: Math.max(previous.high, tick.price), low: Math.min(previous.low, tick.price), close: tick.price };
}
