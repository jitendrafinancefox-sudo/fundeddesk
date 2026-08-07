import { create } from "zustand";
import type { ChartID, LayoutKind, LayoutTemplate } from "@v2/types";
import { createLayoutTemplate, assignChartToCell, releaseCell, swapCells } from "@v2/engine/layout";

interface LayoutStoreState {
  kind: LayoutKind;
  template: LayoutTemplate;
  setLayout: (kind: LayoutKind, chartIds?: ChartID[]) => void;
  assignChart: (cellIndex: number, chartId: ChartID) => void;
  releaseChart: (cellIndex: number) => void;
  swapCharts: (firstIndex: number, secondIndex: number) => void;
  setTemplate: (template: LayoutTemplate) => void;
}

export const useLayoutStore = create<LayoutStoreState>()((set) => ({
  kind: 1,
  template: createLayoutTemplate(1),

  setLayout: (kind, chartIds = []) => {
    set({ kind, template: createLayoutTemplate(kind, chartIds) });
  },

  assignChart: (cellIndex, chartId) => {
    set((state) => ({ template: assignChartToCell(state.template, cellIndex, chartId) }));
  },

  releaseChart: (cellIndex) => {
    set((state) => ({ template: releaseCell(state.template, cellIndex) }));
  },

  swapCharts: (firstIndex, secondIndex) => {
    set((state) => ({ template: swapCells(state.template, firstIndex, secondIndex) }));
  },

  setTemplate: (template) => {
    set({ kind: template.kind, template });
  },
}));
