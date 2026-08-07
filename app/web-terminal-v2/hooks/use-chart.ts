"use client";

import { useChartStore } from "@v2/stores/chart-store";
import type { ChartID, ChartInstance } from "@v2/types";

export function useChart(chartId: ChartID | null): ChartInstance | null {
  return useChartStore((state) => (chartId ? state.charts[chartId] ?? null : null));
}

export function useChartIds(): ChartID[] {
  return useChartStore((state) => state.order);
}

export function useSelectedChart(): ChartInstance | null {
  const chartId = useChartStore((state) => state.selectedChartId);
  return useChart(chartId);
}

export function useSelectedChartId(): ChartID | null {
  return useChartStore((state) => state.selectedChartId);
}
