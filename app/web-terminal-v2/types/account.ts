import type { SymbolInfo } from "./chart";

export interface AccountSummary {
  id: string;
  name: string;
  currency: string;
  equity: number;
  balance: number;
  availableMargin: number;
  usedMargin: number;
  buyingPower: number;
  pnl: {
    realized: number;
    unrealized: number;
  };
  updatedAt: number;
}

export interface Position {
  id: string;
  symbol: SymbolInfo;
  side: "long" | "short";
  qty: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPct: number;
  openedAt: number;
}
