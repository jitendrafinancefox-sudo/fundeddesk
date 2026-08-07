import type { ChartID } from "./chart";
import type { Drawing } from "./drawing";
import type { LayoutKind } from "./layout-types";
import type { Order } from "./order";
import type { Workspace } from "./workspace";
import type { Position } from "./account";

export interface SymbolChangedPayload {
  chartId: ChartID;
  symbol: string;
  exchange: string;
}

export interface TimeframeChangedPayload {
  chartId: ChartID;
  timeframe: string;
}

export interface DrawingRemovedPayload {
  chartId: ChartID;
  drawingId: string;
}

export interface TickPayload {
  chartId: ChartID;
  symbol: string;
  price: number;
  time: number;
}

export interface EventMap {
  "chart:created": ChartID;
  "chart:destroyed": ChartID;
  "chart:selected": ChartID;
  "symbol:changed": SymbolChangedPayload;
  "timeframe:changed": TimeframeChangedPayload;
  "drawing:added": Drawing;
  "drawing:updated": Drawing;
  "drawing:removed": DrawingRemovedPayload;
  "layout:changed": LayoutKind;
  "workspace:loaded": Workspace;
  "workspace:saved": Workspace;
  "order:placed": Order;
  "order:updated": Order;
  "position:updated": Position;
  "tick:received": TickPayload;
}

export type EventKey = keyof EventMap;
