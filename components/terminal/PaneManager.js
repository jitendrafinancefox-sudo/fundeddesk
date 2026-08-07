'use client';
import { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { PriceBus } from '@/stores/PriceBus';
import {
  initialState, migrateState,
  opActivatePane, opSetLayout, opOpenTab, opActivateTab, opCloseTab,
  opSetActivePaneSymbol, opSetSymbol, opSetActivePaneTimeframe, opSetTimeframe,
  opToggleIndicator, opClearIndicators, opSetTool, opToggleDrawings, opClearDrawings,
  opAddPane, opDuplicatePane, opRemovePane, opSwapPanes, opSetSizes,
} from './paneOps';

// Four isolated contexts:
//  - PaneListContext   — { layout, panes, sizes } — workspace topology.
//                        Consumers: ChartGrid (grid + splitters). Re-renders
//                        only when the list itself changes.
//  - ActivePaneContext — { activePaneId, activePane, activatePane } —
//                        Consumers: header/panels and each ChartPane (for
//                        the active outline). Re-renders only on focus change.
//  - PaneActionsContext — stable callbacks; never re-renders consumers.
//  - PanePriceContext   — live per-pane prices; per-tick updates never touch
//                         the other contexts, so chart panes are not
//                         re-rendered by live data.
const PaneListContext = createContext(null);
const ActivePaneContext = createContext(null);
const PaneActionsContext = createContext(null);
const PanePriceContext = createContext(null);

// Workspace topology (panes, layout, splitter sizes) without subscribing to
// active-pane or price changes.
export function usePaneList() {
  return useContext(PaneListContext);
}

// Active pane focus — subscribe here when a component only needs to know
// which pane is focused (ChartPane outlines, header readouts).
export function useActivePane() {
  return useContext(ActivePaneContext);
}

// Actions only — never re-renders when panes/prices change.
export function usePaneActions() {
  return useContext(PaneActionsContext);
}

// Combined accessor (state + actions) — matches the historical API so
// existing consumers keep working unchanged.
export function usePaneManager() {
  const list = useContext(PaneListContext);
  const active = useContext(ActivePaneContext);
  const actions = useContext(PaneActionsContext);
  return list && active && actions ? { ...list, ...active, ...actions } : null;
}

// Subscribe to the live price of a single pane; re-renders only on price ticks.
export function usePanePrice(paneId) {
  const ctx = useContext(PanePriceContext);
  return ctx ? ctx.prices[paneId] ?? null : null;
}

// Latest prices without subscribing (for submit-time reads).
export function usePanePriceRef() {
  const ctx = useContext(PanePriceContext);
  return ctx ? ctx.ref : { current: {} };
}

function loadSavedPanes() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('terminal-panes');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function persistPanes(state) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('terminal-panes', JSON.stringify(state));
  } catch {}
}

export function PaneManagerProvider({ children }) {
  const [state, setState] = useState(initialState);
  const [prices, setPrices] = useState({});
  const priceRef = useRef(prices);
  priceRef.current = prices;
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const saved = loadSavedPanes();
    const migrated = migrateState(saved);
    if (migrated) setState(migrated);
  }, []);

  useEffect(() => { persistPanes(state); }, [state]);

  // Every op is pure over the current state — stable callback identities
  // mean action consumers never re-render when state or prices change.
  const apply = useCallback((op) => setState((prev) => op(prev)), []);

  const activatePane = useCallback((paneId) => apply((s) => opActivatePane(s, paneId)), [apply]);
  const setLayout = useCallback((layout) => apply((s) => opSetLayout(s, layout)), [apply]);
  const openTab = useCallback((paneId, cfg) => apply((s) => opOpenTab(s, paneId, cfg)), [apply]);
  const activateTab = useCallback((paneId, tabId) => apply((s) => opActivateTab(s, paneId, tabId)), [apply]);
  const closeTab = useCallback((paneId, tabId) => apply((s) => opCloseTab(s, paneId, tabId)), [apply]);
  const setActivePaneSymbol = useCallback((exchange, token, symbol, chartMode = 'index', selection = null) => {
    apply((s) => opSetActivePaneSymbol(s, { exchange, token, symbol, chartMode, selection }));
  }, [apply]);
  const setPaneSymbol = useCallback((paneId, cfg) => apply((s) => opSetSymbol(s, paneId, cfg)), [apply]);
  const setActivePaneTimeframe = useCallback((timeframe) => apply((s) => opSetActivePaneTimeframe(s, timeframe)), [apply]);
  const setPaneTimeframe = useCallback((paneId, timeframe) => apply((s) => opSetTimeframe(s, paneId, timeframe)), [apply]);
  const togglePaneIndicator = useCallback((paneId, indicatorId) => apply((s) => opToggleIndicator(s, paneId, indicatorId)), [apply]);
  const clearPaneIndicators = useCallback((paneId) => apply((s) => opClearIndicators(s, paneId)), [apply]);
  const setPaneTool = useCallback((paneId, tool) => apply((s) => opSetTool(s, paneId, tool)), [apply]);
  const togglePaneDrawings = useCallback((paneId) => apply((s) => opToggleDrawings(s, paneId)), [apply]);
  const clearPaneDrawings = useCallback((paneId) => apply((s) => opClearDrawings(s, paneId)), [apply]);
  const addPane = useCallback((cfg) => apply((s) => opAddPane(s, cfg)), [apply]);
  const duplicatePane = useCallback((paneId) => apply((s) => opDuplicatePane(s, paneId)), [apply]);
  const removePane = useCallback((paneId) => apply((s) => opRemovePane(s, paneId)), [apply]);
  const swapPanes = useCallback((aId, bId) => apply((s) => opSwapPanes(s, aId, bId)), [apply]);
  const setPaneSizes = useCallback((layout, sizes) => apply((s) => opSetSizes(s, layout, sizes)), [apply]);

  // Live price tick: updates the price map only. The panes array is left
  // untouched so no chart pane re-renders on candle closes.
  const setPanePrice = useCallback((paneId, price) => {
    const token = stateRef.current.panes.find((p) => p.id === paneId)?.token;
    if (price != null && token != null) PriceBus.set(token, { ltp: price });
    setPrices((prev) => {
      if (prev[paneId] === price) return prev;
      return { ...prev, [paneId]: price };
    });
  }, []);

  const { layout, panes, activePaneId, sizes } = state;
  const activePane = panes.find((p) => p.id === activePaneId) || panes[0];

  // Memoized so price ticks and action calls never re-render consumers —
  // these objects change only on user actions.
  const list = useMemo(() => ({ layout, panes, sizes }), [layout, panes, sizes]);
  const active = useMemo(() => ({ activePaneId, activePane, activatePane }), [activePaneId, activePane, activatePane]);

  const actions = useMemo(() => ({
    setLayout,
    activatePane,
    openTab, activateTab, closeTab,
    setActivePaneSymbol, setPaneSymbol,
    setActivePaneTimeframe, setPaneTimeframe,
    togglePaneIndicator, clearPaneIndicators,
    setPaneTool, togglePaneDrawings, clearPaneDrawings,
    addPane, duplicatePane, removePane, swapPanes, setPaneSizes,
    setPanePrice,
  }), [setLayout, activatePane, openTab, activateTab, closeTab, setActivePaneSymbol, setPaneSymbol, setActivePaneTimeframe, setPaneTimeframe, togglePaneIndicator, clearPaneIndicators, setPaneTool, togglePaneDrawings, clearPaneDrawings, addPane, duplicatePane, removePane, swapPanes, setPaneSizes, setPanePrice]);

  return (
    <PaneListContext.Provider value={list}>
      <ActivePaneContext.Provider value={active}>
        <PaneActionsContext.Provider value={actions}>
          <PanePriceContext.Provider value={{ prices, ref: priceRef }}>
            {children}
          </PanePriceContext.Provider>
        </PaneActionsContext.Provider>
      </ActivePaneContext.Provider>
    </PaneListContext.Provider>
  );
}
