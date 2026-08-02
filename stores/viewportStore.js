import { createStore } from './createStore';

// Viewports are chart-local. A chart engine writes snapshots here; other
// subsystems may observe them but must never mutate the engine directly.
export const viewportStore = createStore({ byChart: {} });
export const setViewport = (chartId, patch) => viewportStore.setState((state) => ({
  byChart: { ...state.byChart, [chartId]: { ...(state.byChart[chartId] || {}), ...patch } },
}));
export const removeViewport = (chartId) => viewportStore.setState((state) => {
  const byChart = { ...state.byChart }; delete byChart[chartId]; return { byChart };
});
