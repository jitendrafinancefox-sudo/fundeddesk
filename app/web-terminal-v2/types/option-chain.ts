export interface OptionQuote {
  ltp: number;
  change: number;
  changePct: number;
  bid: number;
  ask: number;
  oi: number;
  volume: number;
  iv: number;
}

export interface OptionStrike {
  strike: number;
  call: OptionQuote | null;
  put: OptionQuote | null;
}

export interface OptionChainState {
  symbol: string;
  expiry: string | null;
  expiries: string[];
  strikes: OptionStrike[];
  isLoading: boolean;
  error: string | null;
}
