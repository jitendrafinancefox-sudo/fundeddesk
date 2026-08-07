import { create } from "zustand";
import type { ChartID, Drawing, DrawingID, DrawingPoint, DrawingType } from "@v2/types";
import { createDrawing, patchDrawing } from "@v2/engine/drawing";
import { useChartStore } from "@v2/stores/chart-store";
import { eventBus } from "@v2/engine/events";

interface DrawingStoreState {
  drawings: Record<ChartID, Drawing[]>;
  selectedDrawingId: DrawingID | null;
  hoveredDrawingId: DrawingID | null;
  activeTool: DrawingType | null;
  createDrawing: (chartId: ChartID, type: DrawingType, points?: DrawingPoint[]) => DrawingID;
  addDrawing: (chartId: ChartID, drawing: Drawing) => void;
  updateDrawing: (chartId: ChartID, drawingId: DrawingID, patch: Partial<Drawing>) => void;
  deleteDrawing: (chartId: ChartID, drawingId: DrawingID) => void;
  clearChartDrawings: (chartId: ChartID) => void;
  setActiveTool: (tool: DrawingType | null) => void;
  selectDrawing: (drawingId: DrawingID | null) => void;
  setHoveredDrawing: (drawingId: DrawingID | null) => void;
}

function syncChartDrawingIds(chartId: ChartID, drawingIds: DrawingID[]): void {
  useChartStore.getState().syncDrawingIds(chartId, drawingIds);
}

export const useDrawingStore = create<DrawingStoreState>()((set, get) => ({
  drawings: {},
  selectedDrawingId: null,
  hoveredDrawingId: null,
  activeTool: null,

  createDrawing: (chartId, type, points = []) => {
    const drawing = createDrawing(chartId, type, points);
    get().addDrawing(chartId, drawing);
    return drawing.id;
  },

  addDrawing: (chartId, drawing) => {
    set((state) => {
      const existing = state.drawings[chartId] ?? [];
      return {
        drawings: { ...state.drawings, [chartId]: [...existing, drawing] },
      };
    });
    syncChartDrawingIds(chartId, get().drawings[chartId].map((d) => d.id));
    eventBus.emit("drawing:added", drawing);
  },

  updateDrawing: (chartId, drawingId, patch) => {
    set((state) => {
      const drawings = state.drawings[chartId] ?? [];
      return {
        drawings: {
          ...state.drawings,
          [chartId]: drawings.map((drawing) =>
            drawing.id === drawingId ? patchDrawing(drawing, patch) : drawing,
          ),
        },
      };
    });
    const updated = (get().drawings[chartId] ?? []).find((drawing) => drawing.id === drawingId);
    if (updated) {
      eventBus.emit("drawing:updated", updated);
    }
  },

  deleteDrawing: (chartId, drawingId) => {
    set((state) => {
      const drawings = state.drawings[chartId] ?? [];
      return {
        drawings: {
          ...state.drawings,
          [chartId]: drawings.filter((drawing) => drawing.id !== drawingId),
        },
        selectedDrawingId: state.selectedDrawingId === drawingId ? null : state.selectedDrawingId,
      };
    });
    syncChartDrawingIds(chartId, (get().drawings[chartId] ?? []).map((d) => d.id));
    eventBus.emit("drawing:removed", { chartId, drawingId });
  },

  clearChartDrawings: (chartId) => {
    set((state) => {
      const next = { ...state.drawings };
      delete next[chartId];
      return { drawings: next, selectedDrawingId: null };
    });
    syncChartDrawingIds(chartId, []);
  },

  setActiveTool: (tool) => set({ activeTool: tool }),
  selectDrawing: (drawingId) => set({ selectedDrawingId: drawingId }),
  setHoveredDrawing: (drawingId) => set({ hoveredDrawingId: drawingId }),
}));
