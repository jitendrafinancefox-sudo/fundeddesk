import type { DrawingID } from "./drawing";
import type { Position } from "./account";
import type { ChartTheme } from "./theme";

export type ChartID = string;

export type Exchange = "NSE" | "BSE" | "MCX" | "NASDAQ" | "NYSE" | "AMEX" | string;

export interface SymbolInfo {
  symbol: string;
  exchange: Exchange;
  description?: string;
  instrumentToken?: number;
}

export type Timeframe = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "1D" | "1W";

export interface Viewport {
  left: number;
  right: number;
}

export interface ZoomState {
  scale: number;
}

export interface ScrollState {
  offset: number;
}

export interface CrosshairState {
  x: number | null;
  y: number | null;
  time: number | null;
  price: number | null;
  visible: boolean;
}

export type OrderSide = "buy" | "sell";

export type OrderMarkerStatus = "pending" | "open" | "filled" | "cancelled";

export interface OrderMarker {
  orderId: string;
  side: OrderSide;
  price: number;
  qty: number;
  status: OrderMarkerStatus;
}

export type PositionSide = "long" | "short";

export interface IndicatorSpec {
  id: string;
  type: string;
  params: Record<string, unknown>;
  overlay: boolean;
}

export interface ChartConfig {
  id?: ChartID;
  symbol?: SymbolInfo;
  timeframe?: Timeframe;
}

export interface ChartInstance {
  id: ChartID;
  symbol: SymbolInfo;
  timeframe: Timeframe;
  viewport: Viewport;
  zoom: ZoomState;
  scroll: ScrollState;
  crosshair: CrosshairState;
  drawingIds: DrawingID[];
  indicators: IndicatorSpec[];
  orderMarkers: OrderMarker[];
  position: Position | null;
  theme: ChartTheme;
  isVisible: boolean;
  createdAt: number;
  updatedAt: number;
}
