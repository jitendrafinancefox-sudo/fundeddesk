import { createStore } from './createStore';

// Scope keys are `${symbol}:${timeframe}`. Drawings contain data anchors only;
// screen coordinates are deliberately excluded from persisted state.
export const drawingStore = createStore({ byChart: {}, selectedId: null, visible: true, revision: 0 });
export const drawingScope = (symbol, timeframe) => `${symbol}:${timeframe}`;
export function updateDrawings(chartKey, updater) {
  drawingStore.setState((state) => ({
    byChart: { ...state.byChart, [chartKey]: updater(state.byChart[chartKey] || []) },
    revision: state.revision + 1,
  }));
}
