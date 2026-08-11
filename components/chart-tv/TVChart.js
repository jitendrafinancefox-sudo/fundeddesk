import { createChart, LineSeries, HistogramSeries, LineStyle } from 'lightweight-charts';
import { marketData } from '@/services/marketData';
import { normalizeCandles } from '@/services/candleAggregator';
import { TV_LIGHT_THEME, buildChartOptions, buildCandleSeriesOptions, applyTimeframeOptions } from './TVChartTheme';
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

// True when two price-line defs produce the same visual line (price, label
// text, color and stroke). Used to reuse existing line instances instead of
// removing/recreating them on every live-tick re-apply.
function sameLevel(a, b) {
  return a.price === b.price
    && a.title === b.title
    && a.color === b.color
    && a.lineWidth === b.lineWidth
    && a.lineStyle === b.lineStyle;
}

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
    this._levelPreview = null;
    this._retries = 2;
    this._retryDelay = 2000;
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

  // Re-theme chart + candle series at runtime (layout, grid, crosshair,
  // scales and candle colors all flip together).
  setTheme(theme) {
    this.theme = theme || TV_LIGHT_THEME;
    try { this.chart?.applyOptions(buildChartOptions(this.theme)); } catch { /* keep previous state */ }
    try { this.series?.applyOptions(buildCandleSeriesOptions(this.theme)); } catch { /* keep previous state */ }
    return this;
  }

  // Renders the flat list produced by IndicatorEngine.buildIndicators:
  // overlay studies on the price pane, lower studies on a separate pane
  // beneath it. Rebuilds (and cleans up) on every call.
  setIndicators(built = []) {
    const items = built || [];
    this._indicatorSeries?.forEach((series) => { try { series.remove(); } catch { /* already removed */ } });
    this._indicatorSeries = [];
    while (this.chart.panes().length > 1) {
      try { this.chart.removePane(this.chart.panes().length - 1); } catch { break; }
    }
    items.forEach((item) => {
      const lower = item.kind === 'volume' || item.kind === 'rsi' || item.kind === 'histogram';
      const paneIndex = lower ? 1 : 0;
      const points = item.points || [];
      let series = null;
      if (item.kind === 'volume') {
        series = this.chart.addSeries(HistogramSeries, {
          priceFormat: { type: 'volume' },
          lastValueVisible: false,
          priceLineVisible: false,
          paneIndex,
        });
        series.setData(points.map((p) => ({ time: p.time, value: p.value, color: p.rising ? '#26a69a' : '#ef5350' })));
      } else if (item.kind === 'histogram') {
        series = this.chart.addSeries(HistogramSeries, {
          color: item.color || '#8a8f98',
          lastValueVisible: false,
          priceLineVisible: false,
          paneIndex,
        });
        series.setData(points.map((p) => ({ time: p.time, value: p.price })));
      } else {
        series = this.chart.addSeries(LineSeries, {
          color: item.color || '#4d7cfe',
          lineWidth: 2,
          lastValueVisible: false,
          priceLineVisible: false,
          paneIndex,
        });
        series.setData(points.map((p) => ({ time: p.time, value: p.price })));
      }
      this._indicatorSeries.push(series);
    });
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
    let lastError = null;
    for (let attempt = 0; attempt <= this._retries; attempt += 1) {
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
        if (error?.name === 'AbortError') throw error;
        lastError = error;
        if (attempt < this._retries && signal && !signal.aborted) {
          await new Promise((resolve) => setTimeout(resolve, this._retryDelay));
        }
      }
    }
    this.onError?.(lastError);
    throw lastError;
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
    return this.series.priceToCoordinate(price);
  }

  coordinateToPrice(y) {
    return this.series.coordinateToPrice(y);
  }

  getContainer() {
    return this.container;
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

  // Compare overlay (ported from the terminal's Compare popover, rebuilt as a
  // true normalized overlay): fetch the compared symbol's history and plot a
  // line on the SAME pane/axis as the candles, re-based so it starts exactly
  // at the main chart's first close (0% deviation → overlapping gridlines).
  async setCompareOverlay({ exchange, token, symbol, interval }, signal) {
    const relayInterval = resolveRelayInterval(interval || 'FIVE_MINUTE');
    this.removeCompareSeries();
    const base = this.candles[0]?.close ?? 100;
    const rows = normalizeCandles(await marketData.history(exchange, token, relayInterval, signal));
    const first = rows.find((r) => r.close != null)?.close ?? base;
    const points = rows.filter((r) => r.close != null).map((r) => ({
      time: r.time,
      value: base * (Number(r.close) / first),
    }));
    if (!points.length) throw new Error(`no data for compare symbol ${symbol}`);
    const series = this.chart.addSeries(LineSeries, {
      color: '#f0b90b',
      lineWidth: 1.5,
      priceScaleId: 'right',
      lastValueVisible: true,
      priceLineVisible: false,
      crosshairMarkerVisible: true,
      paneIndex: 0,
    });
    series.setData(points);
    this._compareSeries = series;
    this._compare = { exchange, token, symbol };
    return this;
  }

  removeCompareSeries() {
    if (this._compareSeries) {
      try { this._compareSeries.remove(); } catch { /* already removed */ }
    }
    this._compareSeries = null;
    this._compare = null;
    return this;
  }

  getCompareSymbol() {
    return this._compare?.symbol || null;
  }

  // SL/TP + entry lines for open positions (ported from the old terminal,
  // rebuilt on lightweight-charts' native price lines). The caller re-applies
  // the full set on position changes and live ticks, so the P&L labels stay
  // current — lines whose definition is unchanged are REUSED (not removed
  // and recreated), so a live tick that touched nothing keeps the same
  // underlying price-line instances. Line styles: dashed for the SL/TP
  // brackets, solid for the entry line.
  setLevelLines(lines = []) {
    for (const pl of this._levelLines || []) {
      try { this.series.removePriceLine(pl); } catch { /* already removed */ }
    }
    this._levelLines = [];
    if (!this.series) return this;
    for (const def of lines) {
      if (def == null || def.price == null) continue;
      const pl = this.series.createPriceLine({
        price: def.price,
        title: def.title || '',
        color: def.color || '#8895aa',
        lineWidth: def.lineWidth || 1,
        lineStyle: def.lineStyle ?? LineStyle.Dashed,
        axisLabelVisible: true,
        titleVisible: true,
        lineVisible: true,
      });
      this._levelLines.push(pl);
    }
    return this;
  }

    // Transient price line for drag previews (SL/TP handles on the entry bar).
  // Lives outside _levelLines so the committed label set is untouched; the
  // caller clears it on drag end.
  setLevelPreview(def = null) {
    this.clearLevelPreview();
    if (!def || def.price == null) return this;
    const pl = this.series.createPriceLine({
      price: def.price,
      title: def.title || '',
      color: def.color || '#8895aa',
      lineWidth: 1,
      lineStyle: def.lineStyle ?? LineStyle.Dashed,
      axisLabelVisible: true,
      titleVisible: true,
      lineVisible: true,
    });
    this._levelPreview = pl;
    return this;
  }

  clearLevelPreview() {
    if (this._levelPreview) {
      try { this.series.removePriceLine(this._levelPreview); } catch { /* already removed */ }
      this._levelPreview = null;
    }
    return this;
  }

  destroy() {
    this._fetchController?.abort();
    this._indicatorSeries?.forEach((series) => { try { series.remove(); } catch { /* already removed */ } });
    this._indicatorSeries = [];
    this.removeCompareSeries();
    this.clearLevelPreview();
    this.setLevelLines([]);
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
