import { create } from "zustand";
import type { BottomPanelState, ChartID, LayoutKind, ThemeMode, Workspace } from "@v2/types";
import { createWorkspace, reconcileWorkspace, serializeWorkspace, deserializeWorkspace } from "@v2/engine/workspace";
import { workspaceStorage } from "@v2/engine/storage";
import { eventBus } from "@v2/engine/events";

const WORKSPACE_STORAGE_KEY = "current";

interface WorkspaceStoreState {
  workspace: Workspace | null;
  loaded: boolean;
  createWorkspace: (overrides?: Partial<Workspace>) => Workspace;
  loadWorkspace: () => Workspace | null;
  saveWorkspace: (patch: Partial<Workspace>) => void;
  resetWorkspace: () => void;
  setSelectedChart: (chartId: ChartID | null) => void;
  setBottomPanel: (patch: Partial<BottomPanelState>) => void;
  setLayoutKind: (layoutKind: LayoutKind) => void;
  setTheme: (theme: ThemeMode) => void;
  setWatchlist: (groupIds: string[], activeGroupId: string | null) => void;
  openChart: (chartId: ChartID) => void;
  closeChart: (chartId: ChartID) => void;
}

function persist(workspace: Workspace): void {
  workspaceStorage.set(WORKSPACE_STORAGE_KEY, serializeWorkspace(workspace));
}

export const useWorkspaceStore = create<WorkspaceStoreState>()((set, get) => ({
  workspace: null,
  loaded: false,

  createWorkspace: (overrides = {}) => {
    const workspace = reconcileWorkspace(createWorkspace(overrides));
    set({ workspace, loaded: true });
    return workspace;
  },

  loadWorkspace: () => {
    const raw = workspaceStorage.getRaw(WORKSPACE_STORAGE_KEY);
    let workspace: Workspace | null = null;
    if (raw !== null) {
      workspace = deserializeWorkspace(raw);
    }
    if (!workspace) {
      workspace = get().createWorkspace();
    } else {
      workspace = reconcileWorkspace(workspace);
      set({ workspace, loaded: true });
    }
    eventBus.emit("workspace:loaded", workspace);
    return workspace;
  },

  saveWorkspace: (patch) => {
    const current = get().workspace;
    if (!current) {
      return;
    }
    const next = reconcileWorkspace({ ...current, ...patch, savedAt: Date.now() });
    persist(next);
    set({ workspace: next });
    eventBus.emit("workspace:saved", next);
  },

  resetWorkspace: () => {
    const workspace = get().createWorkspace();
    persist(workspace);
  },

  setSelectedChart: (chartId) => get().saveWorkspace({ selectedChartId: chartId }),

  setBottomPanel: (patch) => {
    const current = get().workspace;
    if (!current) {
      return;
    }
    get().saveWorkspace({ bottomPanel: { ...current.bottomPanel, ...patch } });
  },

  setLayoutKind: (layoutKind) => get().saveWorkspace({ layoutKind }),

  setTheme: (theme) => get().saveWorkspace({ theme }),

  setWatchlist: (groupIds, activeGroupId) => get().saveWorkspace({ watchlistGroupIds: groupIds, activeWatchlistGroupId: activeGroupId }),

  openChart: (chartId) => {
    const current = get().workspace;
    if (!current || current.openChartIds.includes(chartId)) {
      return;
    }
    get().saveWorkspace({ openChartIds: [...current.openChartIds, chartId] });
  },

  closeChart: (chartId) => {
    const current = get().workspace;
    if (!current) {
      return;
    }
    get().saveWorkspace({
      openChartIds: current.openChartIds.filter((id) => id !== chartId),
      selectedChartId: current.selectedChartId === chartId ? null : current.selectedChartId,
    });
  },
}));
