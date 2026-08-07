import { create } from "zustand";
import type { AccountSummary } from "@v2/types";

interface AccountStoreState {
  account: AccountSummary | null;
  isConnected: boolean;
  setAccount: (account: AccountSummary | null) => void;
  patchAccount: (patch: Partial<AccountSummary>) => void;
  setConnected: (isConnected: boolean) => void;
  reset: () => void;
}

export const useAccountStore = create<AccountStoreState>()((set, get) => ({
  account: null,
  isConnected: false,

  setAccount: (account) => set({ account, isConnected: account !== null }),

  patchAccount: (patch) => {
    const current = get().account;
    if (!current) {
      return;
    }
    set({ account: { ...current, ...patch, updatedAt: Date.now() } });
  },

  setConnected: (isConnected) => set({ isConnected }),

  reset: () => set({ account: null, isConnected: false }),
}));
