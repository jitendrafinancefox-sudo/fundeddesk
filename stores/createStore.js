// Minimal external-store primitive: avoids a dependency while keeping domain state
// outside component trees and compatible with useSyncExternalStore.
export function createStore(initialState) {
  let state = initialState;
  const listeners = new Set();
  return {
    getState: () => state,
    setState: (patch) => {
      state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) };
      listeners.forEach((listener) => listener());
    },
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
  };
}
