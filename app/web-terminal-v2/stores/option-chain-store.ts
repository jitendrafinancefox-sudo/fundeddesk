import { create } from "zustand";
import type { OptionStrike } from "@v2/types";

interface OptionChainStoreState {
  symbol: string;
  expiry: string | null;
  expiries: string[];
  strikes: OptionStrike[];
  isLoading: boolean;
  error: string | null;
  setSymbol: (symbol: string) => void;
  setExpiry: (expiry: string | null) => void;
  setExpiries: (expiries: string[]) => void;
  setStrikes: (strikes: OptionStrike[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useOptionChainStore = create<OptionChainStoreState>()((set) => ({
  symbol: "",
  expiry: null,
  expiries: [],
  strikes: [],
  isLoading: false,
  error: null,

  setSymbol: (symbol) => set({ symbol }),
  setExpiry: (expiry) => set({ expiry }),
  setExpiries: (expiries) => set({ expiries }),
  setStrikes: (strikes) => set({ strikes }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  reset: () => set({ symbol: "", expiry: null, expiries: [], strikes: [], isLoading: false, error: null }),
}));
