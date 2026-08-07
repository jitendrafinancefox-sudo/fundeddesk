import { create } from "zustand";
import type { ThemeMode } from "@v2/types/theme";
import { themeStorage } from "@v2/engine/storage";
import { isThemeMode } from "@v2/engine/workspace";

interface ThemeStoreState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  hydrate: () => void;
}

function loadInitialMode(): ThemeMode {
  const stored = themeStorage.get<ThemeMode>("mode", "dark");
  return isThemeMode(stored) ? stored : "dark";
}

export const useThemeStore = create<ThemeStoreState>()((set, get) => ({
  mode: loadInitialMode(),
  setMode: (mode) => {
    set({ mode });
    themeStorage.set("mode", mode);
  },
  toggleMode: () => get().setMode(get().mode === "dark" ? "light" : "dark"),
  hydrate: () => set({ mode: loadInitialMode() }),
}));
