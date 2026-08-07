import { createChart } from 'lightweight-charts';
import { marketData } from '@/services/marketData';
import { normalizeCandles } from '@/services/candleAggregator';
import { TV_LIGHT_THEME, buildChartOptions, applyTimeframeOptions } from './TVChartTheme';
import {
  createCandleSeries,
  setSeriesCandles,
  updateSeriesCandle,
  resolveRelayInterval,
  toTVTimeframe,
} from './TVChartSeries';
import { attachResize, resizeToContainer } from './TVChartResize';
import { bindChartEvents } from './TVChartEvents';
import { createCrosshairRegistry } from './TVChartCrosshair';

export class TVChart {
  constructor(container, options = {}) {
    this.container = container;
    this.chartKey = options.chartKey || 'tv-default';
    this.theme = options.theme || TV_LIGHT_THEME;
    this.onReady = options.onReady || null;
    this.onError = options.onError || null;
    this.chart = null;
    this.series = null;
    this.symbol = null;
    this.interval = null;
    this.candles = [];
    this.crosshair = createCrosshairRegistry();
    this._disposers = [];
    this._fetchController = null;
    this._init();
  }

  _init() {
    const chart = createChart(this.container, buildChartOptions(this.theme));
    this.chart = chart;
    this.series = createCandleSeries(chart, this.theme);

    this._disposers.push(
      bindChartEvents(chart, this.series, {
        onCrosshair: (payload) => this.crosshair.emit(payload),
      }),
    );

    this._disposers.push(
      attachResize(this.container, () => {
        if (this.chart) resizeToContainer(this.chart, this.container);
      }),
    );

    resizeToContainer(chart, this.container);
    this.onReady?.(this);
  }

  setCandles(candles) {
    const normalized = normalizeCandles(candles);
    this.candles = normalized;
    setSeriesCandles(this.series, normalized);
    return this;
  }

  updateCandle(candle) {
    const normalized = normalizeCandles([candle])[0];
    if (!normalized) return this;
    updateSeriesCandle(this.series, normalized);
    const last = this.candles[this.candles.length - 1];
    if (last && last.time === normalized.time) Object.assign(last, normalized);
    else this.candles.push(normalized);
    return this;
  }

  async setSymbol({ exchange, token, symbol, interval }, signal) {
    const relayInterval = resolveRelayInterval(interval);
    this.symbol = { exchange, token, symbol, interval: relayInterval };
    return this._fetch(relayInterval, signal);
  }

  async setTimeframe(interval, signal) {
    const relayInterval = resolveRelayInterval(interval);
    this.interval = relayInterval;
    applyTimeframeOptions(this.chart, relayInterval);
    if (!this.symbol) return this;
    return this._fetch(relayInterval, signal);
  }

  async _fetch(relayInterval, externalSignal) {
    if (this._fetchController) this._fetchController.abort();
    const controller = new AbortController();
    this._fetchController = controller;
    const signal = externalSignal || controller.signal;
    try {
      const rows = await marketData.history(
        this.symbol.exchange,
        this.symbol.token,
        relayInterval,
        signal,
      );
      this.setCandles(rows);
      return this;
    } catch (error) {
      if (error?.name !== 'AbortError') this.onError?.(error);
      throw error;
    }
  }

  fitContent() {
    this.chart.timeScale().fitContent();
    return this;
  }

  scrollToRealtime() {
    this.chart.timeScale().scrollToRealTime();
    return this;
  }

  subscribeCrosshair(callback) {
    return this.crosshair.subscribe(callback);
  }

  unsubscribeCrosshair(callback) {
    this.crosshair.unsubscribe(callback);
  }

  priceToCoordinate(price) {
    return this.series.priceScale().priceToCoordinate(price);
  }

  coordinateToPrice(y) {
    return this.series.priceScale().coordinateToPrice(y);
  }

  timeToCoordinate(time) {
    return this.chart.timeScale().timeToCoordinate(time);
  }

  coordinateToTime(x) {
    return this.chart.timeScale().coordinateToTime(x);
  }

  logicalToCoordinate(logical) {
    return this.chart.timeScale().logicalToCoordinate(logical);
  }

  coordinateToLogical(x) {
    return this.chart.timeScale().coordinateToLogical(x);
  }

  getPaneSize() {
    return this.chart.paneSize();
  }

  applyOptions(options) {
    this.chart.applyOptions(options);
    return this;
  }

  applySeriesOptions(options) {
    this.series.applyOptions(options);
    return this;
  }

  getLastCandle() {
    return this.candles[this.candles.length - 1] || null;
  }

  getCandles() {
    return this.candles;
  }

  getCandleCount() {
    return this.candles.length;
  }

  toTVTimeframe(relayCode) {
    return toTVTimeframe(relayCode);
  }

  destroy() {
    this._fetchController?.abort();
    this._disposers.forEach((dispose) => {
      try {
        dispose();
      } catch {
        /* ignore disposer errors during teardown */
      }
    });
    this._disposers = [];
    this.chart?.remove();
    this.chart = null;
    this.series = null;
    this.candles = [];
  }
}

export function createTVChart(container, options) {
  return new TVChart(container, options);
}
