"use client";

import { useLayoutStore } from "@v2/stores/layout-store";
import type { ChartID, LayoutKind } from "@v2/types";

export function useLayoutKind(): LayoutKind {
  return useLayoutStore((state) => state.kind);
}

export function useCellChartId(cellIndex: number): ChartID | null {
  return useLayoutStore((state) => state.template.chartIds[cellIndex] ?? null);
}

export function useTemplateChartIds(): (ChartID | null)[] {
  return useLayoutStore((state) => state.template.chartIds);
}
