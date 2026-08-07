"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import type { ThemeMode, ThemePalette } from "@v2/types/theme";
import { useThemeStore } from "@v2/stores/theme-store";
import { getPalette, applyThemeVars } from "@v2/engine/theme/theme-tokens";

interface TerminalThemeContextValue {
  mode: ThemeMode;
  palette: ThemePalette;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

const TerminalThemeContext = createContext<TerminalThemeContextValue | null>(null);

export function TerminalThemeProvider({ children }: { children: ReactNode }) {
  const mode = useThemeStore((state) => state.mode);
  const setMode = useThemeStore((state) => state.setMode);
  const toggleMode = useThemeStore((state) => state.toggleMode);

  useEffect(() => {
    applyThemeVars(mode);
  }, [mode]);

  const value = useMemo<TerminalThemeContextValue>(
    () => ({ mode, palette: getPalette(mode), setMode, toggleMode }),
    [mode, setMode, toggleMode],
  );

  return <TerminalThemeContext.Provider value={value}>{children}</TerminalThemeContext.Provider>;
}

export function useTerminalTheme(): TerminalThemeContextValue {
  const context = useContext(TerminalThemeContext);
  if (!context) {
    throw new Error("useTerminalTheme must be used within TerminalThemeProvider");
  }
  return context;
}

export function useTerminalPalette(): ThemePalette {
  return useTerminalTheme().palette;
}
