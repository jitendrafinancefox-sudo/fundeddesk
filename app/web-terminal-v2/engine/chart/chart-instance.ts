import type {
  ChartConfig,
  ChartID,
  ChartInstance,
  CrosshairState,
  IndicatorSpec,
  OrderMarker,
  Position,
  SymbolInfo,
  Timeframe,
  Viewport,
  ZoomState,
  ScrollState,
  DrawingID,
} from "@v2/types";
import { colors } from "@v2/styles/design-tokens";
import { uid } from "@v2/utils/id";

export const DEFAULT_TIMEFRAME: Timeframe = "15m";

export const DEFAULT_SYMBOL: SymbolInfo = {
  symbol: "NIFTY 50",
  exchange: "NSE",
  description: "Nifty 50 Index",
};

export const DEFAULT_VIEWPORT: Viewport = { left: 0, right: 200 };

export const DEFAULT_ZOOM: ZoomState = { scale: 1 };

export const DEFAULT_SCROLL: ScrollState = { offset: 0 };

export const DEFAULT_CROSSHAIR: CrosshairState = {
  x: null,
  y: null,
  time: null,
  price: null,
  visible: false,
};

export function createChartTheme(overrides: Partial<ChartInstance["theme"]> = {}): ChartInstance["theme"] {
  const palette = colors.dark;
  return {
    background: palette.chartBackground,
    grid: palette.chartGrid,
    crosshair: palette.chartCrosshair,
    selection: palette.chartSelection,
    textPrimary: palette.textPrimary,
    textSecondary: palette.textSecondary,
    accent: palette.accent,
    positive: palette.positive,
    negative: palette.negative,
    ...overrides,
  };
}

export function createChartInstance(config: ChartConfig): ChartInstance {
  const now = Date.now();
  return {
    id: config.id ?? uid("chart"),
    symbol: config.symbol ?? DEFAULT_SYMBOL,
    timeframe: config.timeframe ?? DEFAULT_TIMEFRAME,
    viewport: DEFAULT_VIEWPORT,
    zoom: DEFAULT_ZOOM,
    scroll: DEFAULT_SCROLL,
    crosshair: DEFAULT_CROSSHAIR,
    drawingIds: [] as DrawingID[],
    indicators: [] as IndicatorSpec[],
    orderMarkers: [] as OrderMarker[],
    position: null,
    theme: createChartTheme(),
    isVisible: true,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateChartInstance(
  chart: ChartInstance,
  patch: Partial<ChartInstance>,
): ChartInstance {
  return { ...chart, ...patch, updatedAt: Date.now() };
}

export function isChartId(value: unknown): value is ChartID {
  return typeof value === "string" && value.startsWith("chart-");
}
