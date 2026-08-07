import { CandlestickSeries } from 'lightweight-charts';
import { buildCandleSeriesOptions } from './TVChartTheme';

export const TV_INTERVALS = {
  ONE_MINUTE: '1m',
  THREE_MINUTE: '3m',
  FIVE_MINUTE: '5m',
  FIFTEEN_MINUTE: '15m',
  ONE_HOUR: '1h',
  FOUR_HOUR: '4h',
  ONE_DAY: '1D',
};

export const TV_TIMEFRAME_LABELS = {
  '1m': '1m',
  '3m': '3m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1H',
  '4h': '4H',
  '1D': '1D',
};

export function resolveRelayInterval(code) {
  if (TV_INTERVALS[code]) return code;
  const found = Object.entries(TV_INTERVALS).find(([, tv]) => tv === code);
  return found ? found[0] : code;
}

export function toTVTimeframe(relayCode) {
  return TV_INTERVALS[relayCode] || relayCode;
}

export function normalizeToTV(candles) {
  return (candles || [])
    .map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }))
    .filter((c) => Number.isFinite(c.time));
}

export function createCandleSeries(chart, theme) {
  return chart.addSeries(CandlestickSeries, buildCandleSeriesOptions(theme));
}

export function setSeriesCandles(series, candles) {
  series.setData(normalizeToTV(candles));
}

export function updateSeriesCandle(series, candle) {
  if (!candle || !Number.isFinite(candle.time)) return;
  series.update({ time: candle.time, open: candle.open, high: candle.high, low: candle.low, close: candle.close });
}
