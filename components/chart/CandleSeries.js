'use client';
import { normalizeCandles } from '@/services/candleAggregator';
export function setCandles(series, rows) { series.setData(normalizeCandles(rows)); }
export function updateCandle(series, candle) { series.update(candle); }
