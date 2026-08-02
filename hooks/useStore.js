import { useSyncExternalStore } from 'react';
export function useStore(store) { return useSyncExternalStore(store.subscribe, store.getState, store.getState); }
