import { create } from "zustand";
import type { Exchange, WatchlistGroup, WatchlistSymbol } from "@v2/types";
import { watchlistStorage } from "@v2/engine/storage";
import { uid } from "@v2/utils/id";

const WATCHLIST_STORAGE_KEY = "data";

interface WatchlistStoreState {
  groups: WatchlistGroup[];
  activeGroupId: string | null;
  setActiveGroup: (groupId: string | null) => void;
  addGroup: (name: string) => string;
  removeGroup: (groupId: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  addSymbol: (groupId: string, symbol: string, exchange: Exchange) => void;
  removeSymbol: (groupId: string, symbol: string) => void;
  setSymbols: (groupId: string, symbols: WatchlistSymbol[]) => void;
  hydrate: () => void;
}

function persist(groups: WatchlistGroup[], activeGroupId: string | null): void {
  watchlistStorage.set(WATCHLIST_STORAGE_KEY, { groups, activeGroupId });
}

export const useWatchlistStore = create<WatchlistStoreState>()((set, get) => ({
  groups: [{ id: "watchlist-default", name: "Favorites", symbols: [] }],
  activeGroupId: "watchlist-default",

  setActiveGroup: (groupId) => {
    set({ activeGroupId: groupId });
    persist(get().groups, groupId);
  },

  addGroup: (name) => {
    const group: WatchlistGroup = { id: uid("watchlist"), name, symbols: [] };
    const groups = [...get().groups, group];
    set({ groups, activeGroupId: group.id });
    persist(groups, group.id);
    return group.id;
  },

  removeGroup: (groupId) => {
    const groups = get().groups.filter((group) => group.id !== groupId);
    const activeGroupId = get().activeGroupId === groupId ? (groups[0]?.id ?? null) : get().activeGroupId;
    set({ groups, activeGroupId });
    persist(groups, activeGroupId);
  },

  renameGroup: (groupId, name) => {
    const groups = get().groups.map((group) => (group.id === groupId ? { ...group, name } : group));
    set({ groups });
    persist(groups, get().activeGroupId);
  },

  addSymbol: (groupId, symbol, exchange) => {
    const groups = get().groups.map((group) =>
      group.id === groupId && !group.symbols.some((entry) => entry.symbol === symbol)
        ? { ...group, symbols: [...group.symbols, { symbol, exchange, addedAt: Date.now() }] }
        : group,
    );
    set({ groups });
    persist(groups, get().activeGroupId);
  },

  removeSymbol: (groupId, symbol) => {
    const groups = get().groups.map((group) =>
      group.id === groupId ? { ...group, symbols: group.symbols.filter((entry) => entry.symbol !== symbol) } : group,
    );
    set({ groups });
    persist(groups, get().activeGroupId);
  },

  setSymbols: (groupId, symbols) => {
    const groups = get().groups.map((group) => (group.id === groupId ? { ...group, symbols } : group));
    set({ groups });
    persist(groups, get().activeGroupId);
  },

  hydrate: () => {
    const stored = watchlistStorage.get<{ groups: WatchlistGroup[]; activeGroupId: string | null }>(WATCHLIST_STORAGE_KEY, { groups: [], activeGroupId: null });
    if (stored.groups.length > 0) {
      set({ groups: stored.groups, activeGroupId: stored.activeGroupId ?? stored.groups[0].id });
    }
  },
}));
