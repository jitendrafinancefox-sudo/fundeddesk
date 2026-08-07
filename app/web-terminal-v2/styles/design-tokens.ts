import type { ThemeMode, ThemePalette } from "@v2/types/theme";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export const radius = {
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  "2xl": 16,
  full: 9999,
} as const;

export const fontSize = {
  xs: 10,
  sm: 11,
  md: 12,
  lg: 14,
  xl: 16,
  "2xl": 20,
  "3xl": 26,
} as const;

export const colors: Record<ThemeMode, ThemePalette> = {
  dark: {
    background: "#0B0E14",
    surface: "#12161F",
    surfaceRaised: "#1A1F2B",
    border: "#232936",
    borderStrong: "#2E3545",
    textPrimary: "#E6EAF2",
    textSecondary: "#9BA3B5",
    textMuted: "#5C667A",
    accent: "#3B82F6",
    accentHover: "#60A5FA",
    positive: "#16C784",
    negative: "#F0525F",
    warning: "#F5B93E",
    chartBackground: "#0B0E14",
    chartGrid: "#1A2030",
    chartCrosshair: "#3A4358",
    chartSelection: "#3B82F6",
    toolbarBackground: "#0F131C",
    sidebarBackground: "#0D1119",
    bottomPanelBackground: "#0F131C",
    contextMenuBackground: "#1A1F2B",
  },
  light: {
    background: "#FFFFFF",
    surface: "#F7F8FA",
    surfaceRaised: "#FFFFFF",
    border: "#E0E3EB",
    borderStrong: "#C6CBD9",
    textPrimary: "#131722",
    textSecondary: "#5C6780",
    textMuted: "#9598A3",
    accent: "#2962FF",
    accentHover: "#1E53E5",
    positive: "#16C784",
    negative: "#F0525F",
    warning: "#F5B93E",
    chartBackground: "#FFFFFF",
    chartGrid: "#F0F2F6",
    chartCrosshair: "#8B93A8",
    chartSelection: "#2962FF",
    toolbarBackground: "#FBFCFE",
    sidebarBackground: "#FBFCFE",
    bottomPanelBackground: "#F7F8FA",
    contextMenuBackground: "#FFFFFF",
  },
};

export const layout = {
  toolbarWidth: 44,
  sidebarWidth: 240,
  sidebarCollapsedWidth: 48,
  bottomPanelHeight: 260,
  priceScaleWidth: 72,
  timeScaleHeight: 28,
  topbarHeight: 48,
  chartGap: 2,
} as const;

export const iconSize = 16;

export const animationDuration = {
  fast: 120,
  base: 200,
  slow: 300,
} as const;

export const zIndex = {
  base: 0,
  chart: 10,
  grid: 20,
  priceScale: 30,
  timeAxis: 40,
  overlay: 50,
  crosshair: 60,
  selection: 70,
  drawings: 80,
  toolbar: 100,
  sidebar: 200,
  topbar: 300,
  bottomPanel: 400,
  contextMenu: 900,
  modal: 1000,
  toast: 1100,
} as const;

export const designTokens = {
  spacing,
  radius,
  fontSize,
  colors,
  layout,
  iconSize,
  animationDuration,
  zIndex,
} as const;

export type DesignTokens = typeof designTokens;
