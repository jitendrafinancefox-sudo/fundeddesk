import type { ChartID } from "./chart";

export type DrawingID = string;

export type DrawingType =
  | "trendline"
  | "rectangle"
  | "arrow"
  | "text"
  | "brush"
  | "pitchfork"
  | "fib"
  | "gann"
  | "risk-reward"
  | "long-position"
  | "short-position";

export interface DrawingPoint {
  time: number;
  price: number;
}

export interface BaseDrawing {
  id: DrawingID;
  chartId: ChartID;
  type: DrawingType;
  points: DrawingPoint[];
  color: string;
  lineWidth: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  zIndex: number;
  createdAt: number;
  updatedAt: number;
}

export interface TrendlineDrawing extends BaseDrawing {
  type: "trendline";
  extendLeft: boolean;
  extendRight: boolean;
}

export interface RectangleDrawing extends BaseDrawing {
  type: "rectangle";
  fillOpacity: number;
}

export interface ArrowDrawing extends BaseDrawing {
  type: "arrow";
  arrowSize: number;
}

export interface TextDrawing extends BaseDrawing {
  type: "text";
  text: string;
  fontSize: number;
}

export interface BrushDrawing extends BaseDrawing {
  type: "brush";
  brushOpacity: number;
}

export interface PitchforkDrawing extends BaseDrawing {
  type: "pitchfork";
  forkWidth: number;
  extendRight: boolean;
}

export interface FibDrawing extends BaseDrawing {
  type: "fib";
  levels: number[];
  showLabels: boolean;
}

export interface GannDrawing extends BaseDrawing {
  type: "gann";
  angle: number;
  extendRight: boolean;
}

export interface RiskRewardDrawing extends BaseDrawing {
  type: "risk-reward";
  stopLoss: number;
  targets: number[];
}

export interface LongPositionDrawing extends BaseDrawing {
  type: "long-position";
  entry: number;
  stop: number;
  targets: number[];
}

export interface ShortPositionDrawing extends BaseDrawing {
  type: "short-position";
  entry: number;
  stop: number;
  targets: number[];
}

export type Drawing =
  | TrendlineDrawing
  | RectangleDrawing
  | ArrowDrawing
  | TextDrawing
  | BrushDrawing
  | PitchforkDrawing
  | FibDrawing
  | GannDrawing
  | RiskRewardDrawing
  | LongPositionDrawing
  | ShortPositionDrawing;
