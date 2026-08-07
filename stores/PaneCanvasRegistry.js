// Registry of mounted chart canvases keyed by pane id. Lets global hotkeys
// (Alt+1..4 drawing tools) and the replay playhead target the ACTIVE pane's
// engine without touching React state.
const panes = new Map();

export const PaneCanvasRegistry = {
  register(paneId, api) {
    panes.set(paneId, api);
  },
  unregister(paneId) {
    panes.delete(paneId);
  },
  get(paneId) {
    return panes.get(paneId) || null;
  },
};
