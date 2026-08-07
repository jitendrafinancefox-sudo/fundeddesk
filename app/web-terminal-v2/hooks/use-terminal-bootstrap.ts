"use client";

import { useEffect, useRef } from "react";
import { useWorkspaceStore } from "@v2/stores/workspace-store";
import { useChartStore } from "@v2/stores/chart-store";
import { useLayoutStore } from "@v2/stores/layout-store";
import { useSettingsStore } from "@v2/stores/settings-store";
import { useWatchlistStore } from "@v2/stores/watchlist-store";
import { nextFreeCellIndex } from "@v2/engine/layout";
import type { ChartID } from "@v2/types";

function ensureChartsAndLayout(): void {
  const workspace = useWorkspaceStore.getState().workspace;
  if (!workspace) {
    return;
  }

  const chartStore = useChartStore.getState();
  const layoutStore = useLayoutStore.getState();

  const missing: ChartID[] = [];
  for (const chartId of workspace.openChartIds) {
    if (!chartStore.charts[chartId]) {
      missing.push(chartId);
    }
  }

  for (const chartId of missing) {
    chartStore.createChart({ id: chartId });
  }

  const cells = layoutStore.template.chartIds;
  const needsCell: ChartID[] = [];
  for (const chartId of workspace.openChartIds) {
    if (!cells.includes(chartId)) {
      needsCell.push(chartId);
    }
  }

  if (needsCell.length > 0) {
    const nextCells = [...cells];
    for (const chartId of needsCell) {
      const freeIndex = nextFreeCellIndex({ ...layoutStore.template, chartIds: nextCells });
      if (freeIndex === -1) {
        break;
      }
      nextCells[freeIndex] = chartId;
    }
    layoutStore.setTemplate({
      ...layoutStore.template,
      chartIds: nextCells,
      kind: workspace.layoutKind,
    });
  } else if (layoutStore.template.kind !== workspace.layoutKind) {
    layoutStore.setLayout(workspace.layoutKind, workspace.openChartIds);
  }

  if (workspace.selectedChartId) {
    chartStore.selectChart(workspace.selectedChartId);
  }
}

export function useTerminalBootstrap(): void {
  const loaded = useWorkspaceStore((state) => state.loaded);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) {
      return;
    }
    ran.current = true;
    useSettingsStore.getState().hydrate();
    useWatchlistStore.getState().hydrate();
    useWorkspaceStore.getState().loadWorkspace();
    ensureChartsAndLayout();
  }, [loaded]);
}
