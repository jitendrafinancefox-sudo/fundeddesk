'use client';

// Pure, immutable operations over the workspace state. No React, no window,
// no side effects — every op returns a NEW state object (or the same object
// when nothing would change) and never mutates its inputs. This keeps the
// pane store deterministic, trivially testable headlessly, and guarantees
// React's memo boundaries get stable references for untouched subtrees.

import { INDEX_TOKEN, TIMEFRAMES } from './constants.js';

export const MAX_PANES = 4;
export const STATE_VERSION = 2;

export const LAYOUT_COUNT = { '1': 1, '2v': 2, '2h': 2, '3': 3, '4': 4 };
export const LAYOUT_FOR_COUNT = { 1: '1', 2: '2v', 3: '3', 4: '4' };

const DEFAULT_TIMEFRAME = TIMEFRAMES[2];
const MIN_FRAC = 0.15;

export function defaultSizes(layout) {
  if (layout === '2v') return { cols: [0.5, 0.5] };
  if (layout === '2h') return { rows: [0.5, 0.5] };
  if (layout === '3' || layout === '4') return { cols: [0.5, 0.5], rows: [0.5, 0.5] };
  return {};
}

function nextNum(ids, prefix) {
  let max = 0;
  ids.forEach((id) => {
    const n = Number(String(id).replace(prefix, ''));
    if (Number.isFinite(n) && n > max) max = n;
  });
  return max + 1;
}

// A tab owns everything chart-specific: symbol, exchange, timeframe,
// indicators, selection. A pane owns the tab list plus UI state (tool,
// snap, drawings visibility) that is shared across its tabs.
export function createTab(paneId, cfg, n) {
  return {
    id: `${paneId}-t${n}`,
    exchange: cfg?.exchange || 'NSE',
    token: cfg?.token || INDEX_TOKEN.NIFTY,
    symbol: cfg?.symbol || 'NIFTY',
    timeframe: cfg?.timeframe || DEFAULT_TIMEFRAME,
    chartMode: cfg?.chartMode || 'index',
    selection: cfg?.selection ?? null,
    activeIndicators: cfg?.activeIndicators || [],
    viewport: cfg?.viewport || null,
  };
}

export function createPane(panes, cfg) {
  const id = `p${nextNum(panes.map((p) => p.id), 'p')}`;
  const tab = createTab(id, cfg, 1);
  const { id: _tabId, ...flat } = tab;
  return {
    id,
    tabs: [tab],
    activeTab: tab.id,
    tool: 'cursor',
    snap: { magnet: false, mode: 'ohlc' },
    drawingsVisible: true,
    clearRevision: 0,
    ...flat,
  };
}

function findPane(state, paneId) {
  return state.panes.find((p) => p.id === paneId);
}

function findTab(pane, tabId) {
  return pane.tabs.find((t) => t.id === tabId);
}

// The pane's flat fields always mirror its active tab, so existing
// consumers (header, panels, engine props) keep working unchanged.
function mirrorTab(pane, tab) {
  return {
    ...pane,
    exchange: tab.exchange,
    token: tab.token,
    symbol: tab.symbol,
    timeframe: tab.timeframe,
    chartMode: tab.chartMode,
    selection: tab.selection,
    activeIndicators: tab.activeIndicators,
  };
}

function replacePane(state, paneId, nextPane) {
  return state.panes.map((p) => (p.id === paneId ? nextPane : p));
}

export function initialState() {
  const panes = [createPane([], {})];
  return {
    version: STATE_VERSION,
    layout: '1',
    panes,
    activePaneId: panes[0].id,
    sizes: {},
  };
}

// ---- navigation ---------------------------------------------------------

export function opActivatePane(state, paneId) {
  if (state.activePaneId === paneId || !findPane(state, paneId)) return state;
  return { ...state, activePaneId: paneId };
}

export function opSetLayout(state, layout) {
  if (layout === state.layout) return state;
  const count = LAYOUT_COUNT[layout];
  if (!count) return state;
  let panes = state.panes.slice();
  while (panes.length < count) panes.push(createPane(panes, {}));
  if (panes.length > count) panes = panes.slice(0, count);
  const activePaneId = panes.some((p) => p.id === state.activePaneId) ? state.activePaneId : panes[0].id;
  const sizes = state.sizes[layout] ? state.sizes : { ...state.sizes, [layout]: defaultSizes(layout) };
  return { ...state, layout, panes, activePaneId, sizes };
}

// ---- tabs ---------------------------------------------------------------

export function opOpenTab(state, paneId, cfg) {
  const pane = findPane(state, paneId);
  if (!pane) return state;
  const n = nextNum(pane.tabs.map((t) => t.id), `${paneId}-t`);
  const tab = createTab(paneId, cfg, n);
  const nextPane = mirrorTab(
    { ...pane, tabs: [...pane.tabs, tab], activeTab: tab.id, clearRevision: pane.clearRevision + 1 },
    tab
  );
  return { ...state, panes: replacePane(state, paneId, nextPane) };
}

export function opActivateTab(state, paneId, tabId) {
  const pane = findPane(state, paneId);
  if (!pane || pane.activeTab === tabId) return state;
  const tab = findTab(pane, tabId);
  if (!tab) return state;
  const nextPane = mirrorTab({ ...pane, activeTab: tabId, clearRevision: pane.clearRevision + 1 }, tab);
  return { ...state, panes: replacePane(state, paneId, nextPane) };
}

export function opCloseTab(state, paneId, tabId) {
  const pane = findPane(state, paneId);
  if (!pane || pane.tabs.length <= 1) return state;
  const index = pane.tabs.findIndex((t) => t.id === tabId);
  if (index === -1) return state;
  const tabs = pane.tabs.filter((t) => t.id !== tabId);
  const activeId = pane.activeTab === tabId ? tabs[Math.min(index, tabs.length - 1)].id : pane.activeTab;
  const tab = findTab({ ...pane, tabs }, activeId);
  const nextPane = mirrorTab(
    { ...pane, tabs, activeTab: activeId, clearRevision: pane.clearRevision + 1 },
    tab
  );
  return { ...state, panes: replacePane(state, paneId, nextPane) };
}

// ---- active-tab chart config -------------------------------------------

export function opSetSymbol(state, paneId, cfg) {
  const pane = findPane(state, paneId);
  if (!pane) return state;
  const tabId = pane.activeTab;
  const tab = findTab(pane, tabId);
  const next = {
    ...tab,
    exchange: cfg.exchange || tab.exchange,
    token: cfg.token,
    symbol: cfg.symbol,
    chartMode: cfg.chartMode || tab.chartMode,
    selection: cfg.selection !== undefined ? cfg.selection : tab.selection,
  };
  const tabs = pane.tabs.map((t) => (t.id === tabId ? next : t));
  const nextPane = mirrorTab({ ...pane, tabs, clearRevision: pane.clearRevision + 1 }, next);
  return { ...state, panes: replacePane(state, paneId, nextPane) };
}

export function opSetActivePaneSymbol(state, cfg) {
  return opSetSymbol(state, state.activePaneId, cfg);
}

export function opSetTimeframe(state, paneId, timeframe) {
  const pane = findPane(state, paneId);
  if (!pane) return state;
  const tabId = pane.activeTab;
  const next = { ...findTab(pane, tabId), timeframe };
  const tabs = pane.tabs.map((t) => (t.id === tabId ? next : t));
  const nextPane = mirrorTab({ ...pane, tabs }, next);
  return { ...state, panes: replacePane(state, paneId, nextPane) };
}

export function opSetActivePaneTimeframe(state, timeframe) {
  return opSetTimeframe(state, state.activePaneId, timeframe);
}

export function opToggleIndicator(state, paneId, indicatorId) {
  const pane = findPane(state, paneId);
  if (!pane) return state;
  const tabId = pane.activeTab;
  const tab = findTab(pane, tabId);
  const activeIndicators = tab.activeIndicators.includes(indicatorId)
    ? tab.activeIndicators.filter((id) => id !== indicatorId)
    : [...tab.activeIndicators, indicatorId];
  const next = { ...tab, activeIndicators };
  const tabs = pane.tabs.map((t) => (t.id === tabId ? next : t));
  const nextPane = mirrorTab({ ...pane, tabs }, next);
  return { ...state, panes: replacePane(state, paneId, nextPane) };
}

export function opClearIndicators(state, paneId) {
  const pane = findPane(state, paneId);
  if (!pane) return state;
  const tabId = pane.activeTab;
  const next = { ...findTab(pane, tabId), activeIndicators: [] };
  const tabs = pane.tabs.map((t) => (t.id === tabId ? next : t));
  const nextPane = mirrorTab({ ...pane, tabs }, next);
  return { ...state, panes: replacePane(state, paneId, nextPane) };
}

// ---- pane-level UI state ------------------------------------------------

export function opSetTool(state, paneId, tool) {
  const pane = findPane(state, paneId);
  if (!pane || pane.tool === tool) return state;
  return { ...state, panes: replacePane(state, paneId, { ...pane, tool }) };
}

export function opToggleDrawings(state, paneId) {
  const pane = findPane(state, paneId);
  if (!pane) return state;
  return { ...state, panes: replacePane(state, paneId, { ...pane, drawingsVisible: !pane.drawingsVisible }) };
}

export function opClearDrawings(state, paneId) {
  const pane = findPane(state, paneId);
  if (!pane) return state;
  return { ...state, panes: replacePane(state, paneId, { ...pane, clearRevision: pane.clearRevision + 1 }) };
}

// ---- pane lifecycle -----------------------------------------------------

export function opAddPane(state, cfg) {
  if (state.panes.length >= MAX_PANES) return opOpenTab(state, state.activePaneId, cfg);
  const pane = createPane(state.panes, cfg);
  const layout = LAYOUT_FOR_COUNT[state.panes.length + 1];
  const sizes = state.sizes[layout] ? state.sizes : { ...state.sizes, [layout]: defaultSizes(layout) };
  return { ...state, layout, sizes, panes: [...state.panes, pane], activePaneId: pane.id };
}

export function opDuplicatePane(state, paneId) {
  const pane = findPane(state, paneId);
  if (!pane) return state;
  const cfg = { ...findTab(pane, pane.activeTab) };
  if (state.panes.length >= MAX_PANES) return opOpenTab(state, paneId, cfg);
  const dup = createPane(state.panes, cfg);
  dup.tool = pane.tool;
  dup.snap = pane.snap;
  dup.drawingsVisible = pane.drawingsVisible;
  const layout = LAYOUT_FOR_COUNT[state.panes.length + 1];
  const sizes = state.sizes[layout] ? state.sizes : { ...state.sizes, [layout]: defaultSizes(layout) };
  return { ...state, layout, sizes, panes: [...state.panes, dup], activePaneId: dup.id };
}

export function opRemovePane(state, paneId) {
  if (state.panes.length <= 1 || !findPane(state, paneId)) return state;
  const panes = state.panes.filter((p) => p.id !== paneId);
  const activePaneId = state.activePaneId === paneId ? panes[panes.length - 1].id : state.activePaneId;
  const layout = LAYOUT_FOR_COUNT[panes.length];
  const sizes = state.sizes[layout] ? state.sizes : { ...state.sizes, [layout]: defaultSizes(layout) };
  return { ...state, layout, sizes, panes, activePaneId };
}

export function opSwapPanes(state, aId, bId) {
  if (aId === bId || !findPane(state, aId) || !findPane(state, bId)) return state;
  const panes = state.panes.map((p) => {
    if (p.id === aId) return findPane(state, bId);
    if (p.id === bId) return findPane(state, aId);
    return p;
  });
  return { ...state, panes };
}

export function opSetSizes(state, layout, sizes) {
  const current = state.sizes[layout] || {};
  const merged = { ...current, ...sizes };
  const clamp = (arr) => (arr ? arr.map((f) => Math.min(0.85, Math.max(MIN_FRAC, f))) : arr);
  merged.cols = clamp(merged.cols);
  merged.rows = clamp(merged.rows);
  if (JSON.stringify(merged) === JSON.stringify(current)) return state;
  return { ...state, sizes: { ...state.sizes, [layout]: merged } };
}

// ---- persistence --------------------------------------------------------

// Old saved workspaces had flat panes (no tabs, numeric ids). Wrap each
// flat pane into a single tab so v2 stores can be loaded transparently.
export function migrateState(saved) {
  if (!saved || typeof saved !== 'object') return null;
  const layout = LAYOUT_COUNT[saved.layout] ? saved.layout : '1';
  let panes = Array.isArray(saved.panes) ? saved.panes : [];
  if (!panes.length) return null;

  panes = panes.map((p, i) => {
    const id = String(p.id ?? `p${i + 1}`);
    const shared = {
      tool: p.tool || 'cursor',
      snap: p.snap || { magnet: false, mode: 'ohlc' },
      drawingsVisible: p.drawingsVisible !== false,
      clearRevision: p.clearRevision || 0,
    };
    const base = { exchange: p.exchange, token: p.token, symbol: p.symbol, timeframe: p.timeframe, chartMode: p.chartMode, selection: p.selection, activeIndicators: p.activeIndicators };
    let tabs = Array.isArray(p.tabs) && p.tabs.length
      ? p.tabs.map((t, j) => ({ id: String(t.id || `${id}-t${j + 1}`), ...t }))
      : [createTab(id, base, 1)];
    const activeTab = tabs.find((t) => t.id === String(p.activeTab || tabs[0].id)) || tabs[0];
    const { id: _tabId, ...flat } = activeTab;
    return { id, ...shared, tabs, activeTab: activeTab.id, ...flat };
  });

  const count = LAYOUT_COUNT[layout];
  while (panes.length < count) panes.push(createPane(panes, {}));
  if (panes.length > count) panes = panes.slice(0, count);

  const activePaneId = panes.some((p) => p.id === String(saved.activePaneId))
    ? String(saved.activePaneId)
    : panes[0].id;

  const sizes = {};
  Object.keys(LAYOUT_COUNT).forEach((l) => {
    sizes[l] = { ...defaultSizes(l), ...(saved.sizes?.[l] || {}) };
  });

  return { version: STATE_VERSION, layout, panes, activePaneId, sizes };
}
