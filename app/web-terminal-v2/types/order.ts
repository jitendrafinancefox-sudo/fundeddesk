import type { SymbolInfo } from "./chart";

export type OrderType = "market" | "limit" | "stop" | "stop-limit" | "bracket";

export type OrderStatus = "draft" | "pending" | "open" | "filled" | "cancelled" | "rejected";

export type TimeInForce = "day" | "gtc" | "ioc";

export interface Order {
  id: string;
  symbol: SymbolInfo;
  side: "buy" | "sell";
  type: OrderType;
  qty: number;
  price: number | null;
  stopPrice: number | null;
  timeInForce: TimeInForce;
  status: OrderStatus;
  filledQty: number;
  avgFillPrice: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface OrderDraft {
  symbol: SymbolInfo;
  side: "buy" | "sell";
  type: OrderType;
  qty: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: TimeInForce;
}
