import type { LayoutKind, LayoutTemplate, GridTemplate } from "@v2/types";
import type { ChartID } from "@v2/types";

export const LAYOUT_GRIDS: Record<LayoutKind, GridTemplate> = {
  1: { kind: 1, columns: 1, rows: 1, cells: 1 },
  2: { kind: 2, columns: 2, rows: 1, cells: 2 },
  3: { kind: 3, columns: 3, rows: 1, cells: 3 },
  4: { kind: 4, columns: 2, rows: 2, cells: 4 },
  6: { kind: 6, columns: 3, rows: 2, cells: 6 },
  8: { kind: 8, columns: 4, rows: 2, cells: 8 },
};

export const LAYOUT_KINDS: LayoutKind[] = [1, 2, 3, 4, 6, 8];

export function getGridTemplate(kind: LayoutKind): GridTemplate {
  return LAYOUT_GRIDS[kind];
}

export function getLayoutGridStyle(kind: LayoutKind): {
  gridTemplateColumns: string;
  gridTemplateRows: string;
} {
  const { columns, rows } = LAYOUT_GRIDS[kind];
  return {
    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
  };
}

export function createLayoutTemplate(kind: LayoutKind, chartIds: ChartID[] = []): LayoutTemplate {
  const grid = getGridTemplate(kind);
  const cells: (ChartID | null)[] = Array.from({ length: grid.cells }, (_, index) => chartIds[index] ?? null);
  return { kind, grid, chartIds: cells };
}

export function assignChartToCell(template: LayoutTemplate, cellIndex: number, chartId: ChartID): LayoutTemplate {
  const chartIds = [...template.chartIds];
  chartIds[cellIndex] = chartId;
  return { ...template, chartIds };
}

export function releaseCell(template: LayoutTemplate, cellIndex: number): LayoutTemplate {
  const chartIds = [...template.chartIds];
  chartIds[cellIndex] = null;
  return { ...template, chartIds };
}

export function swapCells(template: LayoutTemplate, firstIndex: number, secondIndex: number): LayoutTemplate {
  const chartIds = [...template.chartIds];
  const temp = chartIds[firstIndex];
  chartIds[firstIndex] = chartIds[secondIndex];
  chartIds[secondIndex] = temp;
  return { ...template, chartIds };
}

export function isCellFree(template: LayoutTemplate, cellIndex: number): boolean {
  return template.chartIds[cellIndex] === null;
}

export function getOccupiedCellCount(template: LayoutTemplate): number {
  return template.chartIds.filter((chartId) => chartId !== null).length;
}

export function nextFreeCellIndex(template: LayoutTemplate): number {
  return template.chartIds.findIndex((chartId) => chartId === null);
}
