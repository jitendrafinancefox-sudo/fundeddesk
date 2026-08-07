import type { SymbolInfo } from "./chart";
import type { Order } from "./order";

export interface BrokerProvider {
  id: string;
  name: string;
}

export interface PlaceOrderRequest {
  symbol: SymbolInfo;
  side: "buy" | "sell";
  type: "market" | "limit" | "stop" | "stop-limit" | "bracket";
  qty: number;
  price?: number;
  stopPrice?: number;
  clientOrderId?: string;
}

export type BrokerConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export interface BrokerAdapter {
  readonly provider: BrokerProvider;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getConnectionStatus(): BrokerConnectionStatus;
  placeOrder(request: PlaceOrderRequest): Promise<Order>;
  cancelOrder(orderId: string): Promise<Order>;
  subscribeSymbol(symbol: SymbolInfo): () => void;
}
