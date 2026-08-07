import { create } from "zustand";
import type { ChartConfig, ChartID, ChartInstance, CrosshairState, DrawingID, IndicatorSpec, OrderMarker, Position, SymbolInfo, Timeframe, Viewport, ZoomState, ScrollState } from "@v2/types";
import { createChartInstance, updateChartInstance } from "@v2/engine/chart";
import { eventBus } from "@v2/engine/events";
import { uid } from "@v2/utils/id";

interface ChartStoreState {
  charts: Record<ChartID, ChartInstance>;
  order: ChartID[];
  selectedChartId: ChartID | null;
  createChart: (config?: Partial<ChartConfig>) => ChartID;
  destroyChart: (chartId: ChartID) => void;
  selectChart: (chartId: ChartID | null) => void;
  setSymbol: (chartId: ChartID, symbol: SymbolInfo) => void;
  setTimeframe: (chartId: ChartID, timeframe: Timeframe) => void;
  setViewport: (chartId: ChartID, viewport: Viewport) => void;
  setZoom: (chartId: ChartID, zoom: ZoomState) => void;
  setScroll: (chartId: ChartID, scroll: ScrollState) => void;
  setCrosshair: (chartId: ChartID, crosshair: CrosshairState) => void;
  addIndicator: (chartId: ChartID, indicator: IndicatorSpec) => void;
  removeIndicator: (chartId: ChartID, indicatorId: string) => void;
  setOrderMarkers: (chartId: ChartID, markers: OrderMarker[]) => void;
  setPosition: (chartId: ChartID, position: Position | null) => void;
  syncDrawingIds: (chartId: ChartID, drawingIds: DrawingID[]) => void;
  setChartVisible: (chartId: ChartID, visible: boolean) => void;
  resetChart: (chartId: ChartID) => void;
}

function patchChart(charts: Record<ChartID, ChartInstance>, chartId: ChartID, patch: Partial<ChartInstance>): Record<ChartID, ChartInstance> {
  const chart = charts[chartId];
  if (!chart) {
    return charts;
  }
  return { ...charts, [chartId]: updateChartInstance(chart, patch) };
}

export const useChartStore = create<ChartStoreState>()((set, get) => ({
  charts: {},
  order: [],
  selectedChartId: null,

  createChart: (config = {}) => {
    const chart = createChartInstance({
      id: config.id ?? uid("chart"),
      symbol: config.symbol,
      timeframe: config.timeframe,
    });
    set((state) => ({
      charts: { ...state.charts, [chart.id]: chart },
      order: [...state.order, chart.id],
      selectedChartId: state.selectedChartId ?? chart.id,
    }));
    eventBus.emit("chart:created", chart.id);
    return chart.id;
  },

  destroyChart: (chartId) => {
    if (!get().charts[chartId]) {
      return;
    }
    set((state) => {
      const charts = { ...state.charts };
      delete charts[chartId];
      return {
        charts,
        order: state.order.filter((id) => id !== chartId),
        selectedChartId: state.selectedChartId === chartId ? (state.order[0] ?? null) : state.selectedChartId,
      };
    });
    eventBus.emit("chart:destroyed", chartId);
  },

  selectChart: (chartId) => {
    set({ selectedChartId: chartId });
    if (chartId) {
      eventBus.emit("chart:selected", chartId);
    }
  },

  setSymbol: (chartId, symbol) => {
    set((state) => ({ charts: patchChart(state.charts, chartId, { symbol }) }));
    eventBus.emit("symbol:changed", { chartId, symbol: symbol.symbol, exchange: symbol.exchange });
  },

  setTimeframe: (chartId, timeframe) => {
    set((state) => ({ charts: patchChart(state.charts, chartId, { timeframe }) }));
    eventBus.emit("timeframe:changed", { chartId, timeframe });
  },

  setViewport: (chartId, viewport) => set((state) => ({ charts: patchChart(state.charts, chartId, { viewport }) })),

  setZoom: (chartId, zoom) => set((state) => ({ charts: patchChart(state.charts, chartId, { zoom }) })),

  setScroll: (chartId, scroll) => set((state) => ({ charts: patchChart(state.charts, chartId, { scroll }) })),

  setCrosshair: (chartId, crosshair) => set((state) => ({ charts: patchChart(state.charts, chartId, { crosshair }) })),

  addIndicator: (chartId, indicator) => {
    set((state) => {
      const chart = state.charts[chartId];
      if (!chart) {
        return state;
      }
      return { charts: patchChart(state.charts, chartId, { indicators: [...chart.indicators, indicator] }) };
    });
  },

  removeIndicator: (chartId, indicatorId) => {
    set((state) => {
      const chart = state.charts[chartId];
      if (!chart) {
        return state;
      }
      return {
        charts: patchChart(state.charts, chartId, {
          indicators: chart.indicators.filter((indicator) => indicator.id !== indicatorId),
        }),
      };
    });
  },

  setOrderMarkers: (chartId, markers) => set((state) => ({ charts: patchChart(state.charts, chartId, { orderMarkers: markers }) })),

  setPosition: (chartId, position) => set((state) => ({ charts: patchChart(state.charts, chartId, { position }) })),

  syncDrawingIds: (chartId, drawingIds) => set((state) => ({ charts: patchChart(state.charts, chartId, { drawingIds }) })),

  setChartVisible: (chartId, visible) => set((state) => ({ charts: patchChart(state.charts, chartId, { isVisible: visible }) })),

  resetChart: (chartId) => {
    set((state) => {
      const chart = state.charts[chartId];
      if (!chart) {
        return state;
      }
      return {
        charts: patchChart(state.charts, chartId, {
          viewport: { left: 0, right: 200 },
          zoom: { scale: 1 },
          scroll: { offset: 0 },
          crosshair: { x: null, y: null, time: null, price: null, visible: false },
          indicators: [],
          orderMarkers: [],
          position: null,
        }),
      };
    });
  },
}));
