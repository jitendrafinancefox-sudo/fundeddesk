export const TV_LIGHT_THEME = {
  background: '#ffffff',
  grid: '#f1f3f5',
  crosshair: '#8a8f98',
  scaleText: '#6b7280',
  border: '#f1f3f5',
  up: '#22ab94',
  down: '#f23645',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: 12,
};

export const TV_DARK_THEME = {
  background: '#131722',
  grid: '#1e222d',
  crosshair: '#758696',
  scaleText: '#b2b5be',
  border: '#2a2e39',
  up: '#26a69a',
  down: '#ef5350',
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontSize: 12,
};

export function buildChartOptions(theme = TV_LIGHT_THEME) {
  return {
    layout: {
      background: { color: theme.background },
      textColor: theme.scaleText,
      fontFamily: theme.fontFamily,
      fontSize: theme.fontSize,
      attributionLogo: false,
    },
    grid: {
      vertLines: { color: theme.grid },
      horzLines: { color: theme.grid },
    },
    crosshair: {
      mode: 'normal',
      vertLine: { color: theme.crosshair, labelBackgroundColor: theme.crosshair },
      horzLine: { color: theme.crosshair, labelBackgroundColor: theme.crosshair },
    },
    rightPriceScale: {
      borderColor: theme.border,
      borderVisible: true,
      textColor: theme.scaleText,
      scaleMargins: { top: 0.08, bottom: 0.08 },
    },
    timeScale: {
      borderColor: theme.border,
      borderVisible: true,
      textColor: theme.scaleText,
      rightOffset: 4,
      barSpacing: 8,
      minBarSpacing: 2,
      timeVisible: true,
      secondsVisible: false,
    },
    handleScroll: {
      mouseWheel: true,
      pressedMouseMove: true,
      horzTouchDrag: true,
      vertTouchDrag: true,
    },
    handleScale: {
      axisPressedMouseMove: true,
      mouseWheel: true,
      pinch: true,
      doubleTap: true,
    },
    kineticScroll: { mouse: true, touch: true },
  };
}

export function buildCandleSeriesOptions(theme = TV_LIGHT_THEME) {
  return {
    upColor: theme.up,
    downColor: theme.down,
    borderUpColor: theme.up,
    borderDownColor: theme.down,
    wickUpColor: theme.up,
    wickDownColor: theme.down,
    lastValueVisible: true,
    priceLineVisible: true,
    priceLineColor: theme.scaleText,
  };
}

export function applyTimeframeOptions(chart, interval) {
  const intraday = interval !== 'ONE_DAY';
  chart.applyOptions({
    timeScale: {
      timeVisible: intraday,
      secondsVisible: intraday && ['ONE_MINUTE', 'THREE_MINUTE'].includes(interval),
    },
  });
}
