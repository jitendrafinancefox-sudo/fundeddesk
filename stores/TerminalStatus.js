// Minimal pub/sub store for the status bar — mouse price/time, connection,
// latency, FPS and memory. Values are written by chart panes / status pollers
// and read by the StatusBar. Kept outside React so per-frame FPS samples and
// mouse moves never re-render the pane tree.
const state = {
  cursor: null, // { price, time } — snapped candle under the crosshair
  connection: null, // 'connected' | 'reconnecting' | 'offline' | null
  ping: null, // ms, last health round-trip
  fps: null, // smoothed frame rate
  memory: null, // MB used by the tab, when available
};
const listeners = new Set();

export const terminalStatus = {
  subscribe(fn) {
    listeners.add(fn);
    fn(state);
    return () => listeners.delete(fn);
  },
  set(patch) {
    Object.assign(state, patch);
    listeners.forEach((fn) => fn(state));
  },
  get() {
    return state;
  },
};
