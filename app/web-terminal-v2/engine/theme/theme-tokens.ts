import type { ThemeMode, ThemePalette } from "@v2/types/theme";
import { darkPalette, lightPalette } from "@v2/engine/theme/palettes";

const PALETTES: Record<ThemeMode, ThemePalette> = {
  dark: darkPalette,
  light: lightPalette,
};

export const CSS_VAR_PREFIX = "--v2-";

export function getPalette(mode: ThemeMode): ThemePalette {
  return PALETTES[mode];
}

export function buildThemeCssVars(palette: ThemePalette): Record<string, string> {
  return Object.fromEntries(
    Object.entries(palette).map(([key, value]) => [`${CSS_VAR_PREFIX}${key}`, value]),
  );
}

export function applyThemeVars(mode: ThemeMode, root: HTMLElement = document.documentElement): void {
  const vars = buildThemeCssVars(getPalette(mode));
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}
