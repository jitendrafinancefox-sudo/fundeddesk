import type { ChartID } from "./chart";
import type { BottomPanelTab, LayoutKind } from "./layout-types";
import type { ThemeMode } from "./theme";

export interface BottomPanelState {
  isOpen: boolean;
  activeTab: BottomPanelTab;
  height: number;
}

export interface Workspace {
  id: string;
  name: string;
  layoutKind: LayoutKind;
  openChartIds: ChartID[];
  watchlistGroupIds: string[];
  activeWatchlistGroupId: string | null;
  bottomPanel: BottomPanelState;
  selectedChartId: ChartID | null;
  theme: ThemeMode;
  version: number;
  savedAt: number;
}
