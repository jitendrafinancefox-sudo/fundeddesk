import type {
  ArrowDrawing,
  BaseDrawing,
  BrushDrawing,
  ChartID,
  Drawing,
  DrawingID,
  DrawingPoint,
  DrawingType,
  FibDrawing,
  GannDrawing,
  LongPositionDrawing,
  PitchforkDrawing,
  RectangleDrawing,
  RiskRewardDrawing,
  ShortPositionDrawing,
  TextDrawing,
  TrendlineDrawing,
} from "@v2/types";
import { uid } from "@v2/utils/id";

export const DRAWING_TYPES: DrawingType[] = [
  "trendline",
  "rectangle",
  "arrow",
  "text",
  "brush",
  "pitchfork",
  "fib",
  "gann",
  "risk-reward",
  "long-position",
  "short-position",
];

export const DEFAULT_DRAWING_COLOR = "#3B82F6";

export const DEFAULT_FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

function baseDrawing(chartId: ChartID, points: DrawingPoint[], overrides: Partial<BaseDrawing> = {}): BaseDrawing {
  const now = Date.now();
  return {
    id: uid("drawing"),
    chartId,
    type: overrides.type ?? "trendline",
    points,
    color: DEFAULT_DRAWING_COLOR,
    lineWidth: 2,
    opacity: 1,
    visible: true,
    locked: false,
    zIndex: 1,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createTrendlineDrawing(
  chartId: ChartID,
  points: DrawingPoint[],
  overrides: Partial<Omit<TrendlineDrawing, "type">> = {},
): TrendlineDrawing {
  return { ...baseDrawing(chartId, points, overrides), type: "trendline", extendLeft: false, extendRight: false, ...overrides };
}

export function createRectangleDrawing(
  chartId: ChartID,
  points: DrawingPoint[],
  overrides: Partial<Omit<RectangleDrawing, "type">> = {},
): RectangleDrawing {
  return { ...baseDrawing(chartId, points, overrides), type: "rectangle", fillOpacity: 0.15, ...overrides };
}

export function createArrowDrawing(
  chartId: ChartID,
  points: DrawingPoint[],
  overrides: Partial<Omit<ArrowDrawing, "type">> = {},
): ArrowDrawing {
  return { ...baseDrawing(chartId, points, overrides), type: "arrow", arrowSize: 8, ...overrides };
}

export function createTextDrawing(
  chartId: ChartID,
  points: DrawingPoint[],
  text: string,
  overrides: Partial<Omit<TextDrawing, "type" | "text">> = {},
): TextDrawing {
  return { ...baseDrawing(chartId, points, overrides), type: "text", text, fontSize: 13, ...overrides };
}

export function createBrushDrawing(
  chartId: ChartID,
  points: DrawingPoint[],
  overrides: Partial<Omit<BrushDrawing, "type">> = {},
): BrushDrawing {
  return { ...baseDrawing(chartId, points, overrides), type: "brush", brushOpacity: 0.2, ...overrides };
}

export function createPitchforkDrawing(
  chartId: ChartID,
  points: DrawingPoint[],
  overrides: Partial<Omit<PitchforkDrawing, "type">> = {},
): PitchforkDrawing {
  return { ...baseDrawing(chartId, points, overrides), type: "pitchfork", forkWidth: 2, extendRight: false, ...overrides };
}

export function createFibDrawing(
  chartId: ChartID,
  points: DrawingPoint[],
  overrides: Partial<Omit<FibDrawing, "type">> = {},
): FibDrawing {
  return {
    ...baseDrawing(chartId, points, overrides),
    type: "fib",
    levels: DEFAULT_FIB_LEVELS,
    showLabels: true,
    ...overrides,
  };
}

export function createGannDrawing(
  chartId: ChartID,
  points: DrawingPoint[],
  overrides: Partial<Omit<GannDrawing, "type">> = {},
): GannDrawing {
  return { ...baseDrawing(chartId, points, overrides), type: "gann", angle: 45, extendRight: false, ...overrides };
}

export function createRiskRewardDrawing(
  chartId: ChartID,
  points: DrawingPoint[],
  stopLoss: number,
  targets: number[],
  overrides: Partial<Omit<RiskRewardDrawing, "type" | "stopLoss" | "targets">> = {},
): RiskRewardDrawing {
  return { ...baseDrawing(chartId, points, overrides), type: "risk-reward", stopLoss, targets, ...overrides };
}

export function createLongPositionDrawing(
  chartId: ChartID,
  points: DrawingPoint[],
  entry: number,
  stop: number,
  targets: number[],
  overrides: Partial<Omit<LongPositionDrawing, "type" | "entry" | "stop" | "targets">> = {},
): LongPositionDrawing {
  return { ...baseDrawing(chartId, points, overrides), type: "long-position", entry, stop, targets, ...overrides };
}

export function createShortPositionDrawing(
  chartId: ChartID,
  points: DrawingPoint[],
  entry: number,
  stop: number,
  targets: number[],
  overrides: Partial<Omit<ShortPositionDrawing, "type" | "entry" | "stop" | "targets">> = {},
): ShortPositionDrawing {
  return { ...baseDrawing(chartId, points, overrides), type: "short-position", entry, stop, targets, ...overrides };
}

export function createDrawing(chartId: ChartID, type: DrawingType, points: DrawingPoint[] = []): Drawing {
  switch (type) {
    case "trendline":
      return createTrendlineDrawing(chartId, points);
    case "rectangle":
      return createRectangleDrawing(chartId, points);
    case "arrow":
      return createArrowDrawing(chartId, points);
    case "text":
      return createTextDrawing(chartId, points, "");
    case "brush":
      return createBrushDrawing(chartId, points);
    case "pitchfork":
      return createPitchforkDrawing(chartId, points);
    case "fib":
      return createFibDrawing(chartId, points);
    case "gann":
      return createGannDrawing(chartId, points);
    case "risk-reward":
      return createRiskRewardDrawing(chartId, points, points[0]?.price ?? 0, []);
    case "long-position":
      return createLongPositionDrawing(chartId, points, points[0]?.price ?? 0, 0, []);
    case "short-position":
      return createShortPositionDrawing(chartId, points, points[0]?.price ?? 0, 0, []);
  }
}

export function patchDrawing(drawing: Drawing, patch: Partial<Drawing>): Drawing {
  return { ...drawing, ...patch, updatedAt: Date.now() } as Drawing;
}

export function isDrawingId(value: unknown): value is DrawingID {
  return typeof value === "string" && value.startsWith("drawing-");
}
