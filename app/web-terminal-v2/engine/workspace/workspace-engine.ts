import type { Workspace, LayoutKind, ThemeMode, ChartID } from "@v2/types";
import { LAYOUT_KINDS } from "@v2/engine/layout";
import { uid } from "@v2/utils/id";

export const WORKSPACE_VERSION = 1;

export function createWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  const now = Date.now();
  return {
    id: uid("workspace"),
    name: "Default Workspace",
    layoutKind: 1,
    openChartIds: [],
    watchlistGroupIds: [],
    activeWatchlistGroupId: null,
    bottomPanel: {
      isOpen: false,
      activeTab: "orders",
      height: 260,
    },
    selectedChartId: null,
    theme: "dark",
    version: WORKSPACE_VERSION,
    savedAt: now,
    ...overrides,
  };
}

export function isLayoutKind(value: unknown): value is LayoutKind {
  return typeof value === "number" && LAYOUT_KINDS.includes(value as LayoutKind);
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "dark" || value === "light";
}

export function reconcileWorkspace(workspace: Workspace): Workspace {
  let next = workspace;

  if (!isLayoutKind(next.layoutKind)) {
    next = { ...next, layoutKind: 1 };
  }

  if (!isThemeMode(next.theme)) {
    next = { ...next, theme: "dark" };
  }

  const validChartIds = new Set<ChartID>(next.openChartIds);
  next = { ...next, openChartIds: next.openChartIds.filter((id) => validChartIds.has(id)) };

  return next;
}

export function serializeWorkspace(workspace: Workspace): string {
  return JSON.stringify(workspace);
}

export function deserializeWorkspace(raw: string): Workspace | null {
  try {
    const parsed = JSON.parse(raw) as Partial<Workspace>;
    if (typeof parsed.id !== "string" || typeof parsed.name !== "string") {
      return null;
    }
    const base = createWorkspace();
    return reconcileWorkspace({
      ...base,
      ...parsed,
      bottomPanel: { ...base.bottomPanel, ...(parsed.bottomPanel ?? {}) },
    });
  } catch {
    return null;
  }
}
