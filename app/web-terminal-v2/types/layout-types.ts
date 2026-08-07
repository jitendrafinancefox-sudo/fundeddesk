import type { ChartID } from "./chart";

export type LayoutKind = 1 | 2 | 3 | 4 | 6 | 8;

export interface GridTemplate {
  kind: LayoutKind;
  columns: number;
  rows: number;
  cells: number;
}

export interface LayoutTemplate {
  kind: LayoutKind;
  grid: GridTemplate;
  chartIds: (ChartID | null)[];
}

export type BottomPanelTab =
  | "orders"
  | "positions"
  | "account"
  | "watchlist"
  | "option-chain"
  | "news";
