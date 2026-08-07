export type ThemeMode = "dark" | "light";

export interface ThemePalette {
  background: string;
  surface: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentHover: string;
  positive: string;
  negative: string;
  warning: string;
  chartBackground: string;
  chartGrid: string;
  chartCrosshair: string;
  chartSelection: string;
  toolbarBackground: string;
  sidebarBackground: string;
  bottomPanelBackground: string;
  contextMenuBackground: string;
}

export interface ChartTheme {
  background: string;
  grid: string;
  crosshair: string;
  selection: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  positive: string;
  negative: string;
}
