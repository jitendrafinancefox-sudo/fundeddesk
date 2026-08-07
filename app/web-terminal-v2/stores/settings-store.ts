import { create } from "zustand";
import type { LayoutKind, Timeframe } from "@v2/types";
import { settingsStorage } from "@v2/engine/storage";

const SETTINGS_STORAGE_KEY = "data";

export interface TerminalSettings {
  defaultTimeframe: Timeframe;
  defaultChartCount: LayoutKind;
  showGrid: boolean;
  showWatermark: boolean;
  confirmOrderDialogs: boolean;
  soundEnabled: boolean;
  quoteFeed: "poll" | "stream";
}

export const DEFAULT_SETTINGS: TerminalSettings = {
  defaultTimeframe: "15m",
  defaultChartCount: 1,
  showGrid: true,
  showWatermark: true,
  confirmOrderDialogs: true,
  soundEnabled: false,
  quoteFeed: "poll",
};

interface SettingsStoreState {
  settings: TerminalSettings;
  updateSettings: (patch: Partial<TerminalSettings>) => void;
  resetSettings: () => void;
  hydrate: () => void;
}

export const useSettingsStore = create<SettingsStoreState>()((set, get) => ({
  settings: DEFAULT_SETTINGS,

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    settingsStorage.set(SETTINGS_STORAGE_KEY, settings);
  },

  resetSettings: () => {
    set({ settings: DEFAULT_SETTINGS });
    settingsStorage.set(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
  },

  hydrate: () => {
    const stored = settingsStorage.get<TerminalSettings>(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
    set({ settings: { ...DEFAULT_SETTINGS, ...stored } });
  },
}));
