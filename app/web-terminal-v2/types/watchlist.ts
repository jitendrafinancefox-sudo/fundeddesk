import type { Exchange } from "./chart";

export interface WatchlistSymbol {
  symbol: string;
  exchange: Exchange;
  addedAt: number;
}

export interface WatchlistGroup {
  id: string;
  name: string;
  symbols: WatchlistSymbol[];
}
