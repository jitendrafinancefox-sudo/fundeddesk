import { createStore } from './createStore';

export const chartStore = createStore({ instance: null, series: null, instrumentKey: null, timeframe: null, status: 'idle' });
export const setChartRuntime = (patch) => chartStore.setState(patch);
