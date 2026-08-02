import { createStore } from './createStore';

export const tradingStore = createStore({ positions: [], realized: 0, breached: false, activeAccount: null });
export const setTradingState = (patch) => tradingStore.setState(patch);
