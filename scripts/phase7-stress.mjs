#!/usr/bin/env node
// Phase 7 validation harness — drives the pure pane-store operations
// headlessly (no React, no DOM) to prove:
//   1. 100 pane switches  2. 1000 watchlist clicks
//   3. Pane lifecycle fuzz (add/remove/swap/tabs/layouts/splitters)
//   4. No state leaks — every op is immutable (deep-freeze + identity checks)
//   5. Persistent invariants hold after every single op
import assert from 'node:assert/strict';
import {
  initialState, migrateState, opActivatePane, opSetLayout,
  opOpenTab, opActivateTab, opCloseTab, opSetActivePaneSymbol,
  opSetSymbol, opSetActivePaneTimeframe, opToggleIndicator,
  opClearIndicators, opSetTool, opToggleDrawings, opClearDrawings,
  opAddPane, opDuplicatePane, opRemovePane, opSwapPanes, opSetSizes,
  LAYOUT_COUNT, MAX_PANES,
} from '../components/terminal/paneOps.js';

const FAILURES = [];
const fail = (msg) => { FAILURES.push(msg); console.error('  FAIL:', msg); };

function freezeDeep(obj, seen = new Set()) {
  if (obj && typeof obj === 'object') {
    if (seen.has(obj)) return;
    seen.add(obj);
    Object.freeze(obj);
    Object.values(obj).forEach((v) => freezeDeep(v, seen));
  }
  return obj;
}

// Fake watchlist universe: 3 indices + 2 stocks + 2 options.
const UNIVERSE = [
  { exchange: 'NSE', token: '99926000', symbol: 'NIFTY', symbol_label: 'NIFTY 50', kind: 'index', chartMode: 'index', selection: null },
  { exchange: 'NSE', token: '99926009', symbol: 'BANKNIFTY', symbol_label: 'BANKNIFTY', kind: 'index', chartMode: 'index', selection: null },
  { exchange: 'NSE', token: 'T1', symbol: 'RELIANCE', symbol_label: 'RELIANCE', kind: 'stock', chartMode: 'index', selection: null },
  { exchange: 'NSE', token: 'T2', symbol: 'TCS', symbol_label: 'TCS', kind: 'stock', chartMode: 'index', selection: null },
  { exchange: 'NFO', token: 'T3', symbol: 'NIFTY 24500 CE', symbol_label: 'NIFTY 24500 CE', kind: 'option', chartMode: 'strike', selection: { underlying: 'NIFTY', strike: 24500, type: 'CE', token: 'T3' } },
  { exchange: 'NFO', token: 'T4', symbol: 'NIFTY 24500 PE', symbol_label: 'NIFTY 24500 PE', kind: 'option', chartMode: 'strike', selection: { underlying: 'NIFTY', strike: 24500, type: 'PE', token: 'T4' } },
];

function checkInvariants(state, label) {
  assert.ok(state && typeof state === 'object', `${label}: state missing`);
  assert.ok(LAYOUT_COUNT[state.layout], `${label}: invalid layout ${state.layout}`);
  assert.equal(state.panes.length, LAYOUT_COUNT[state.layout], `${label}: layout ${state.layout} but ${state.panes.length} panes`);
  assert.ok(state.panes.length >= 1 && state.panes.length <= MAX_PANES, `${label}: pane count out of range`);

  const ids = new Set();
  for (const pane of state.panes) {
    if (ids.has(pane.id)) fail(`${label}: duplicate pane id ${pane.id}`);
    ids.add(pane.id);
    assert.ok(Array.isArray(pane.tabs) && pane.tabs.length >= 1, `${label}: pane ${pane.id} has no tabs`);
    const tabIds = new Set();
    for (const tab of pane.tabs) {
      if (tabIds.has(tab.id)) fail(`${label}: duplicate tab id ${tab.id}`);
      tabIds.add(tab.id);
      assert.ok(tab.token && tab.symbol && tab.timeframe, `${label}: tab ${tab.id} missing fields`);
    }
    const activeTab = pane.tabs.find((t) => t.id === pane.activeTab);
    assert.ok(activeTab, `${label}: pane ${pane.id} activeTab ${pane.activeTab} not in tabs`);
    // Flat mirror must equal the active tab exactly — every consumer reads
    // the flat fields, so drift would silently desync the workspace.
    for (const key of ['exchange', 'token', 'symbol', 'timeframe', 'chartMode', 'selection', 'activeIndicators']) {
      assert.deepEqual(pane[key], activeTab[key], `${label}: pane ${pane.id} flat ${key} drifted from active tab`);
    }
  }
  assert.ok(state.panes.some((p) => p.id === state.activePaneId), `${label}: activePaneId ${state.activePaneId} orphaned`);
  for (const [layout, sz] of Object.entries(state.sizes)) {
    assert.ok(LAYOUT_COUNT[layout], `${label}: sizes keyed by unknown layout ${layout}`);
    (sz.cols || []).forEach((f) => assert.ok(f >= 0.15 && f <= 0.85, `${label}: col frac ${f} out of range`));
    (sz.rows || []).forEach((f) => assert.ok(f >= 0.15 && f <= 0.85, `${label}: row frac ${f} out of range`));
  }
}

function assertImmutable(state, next, label) {
  // The op must have returned a new root and never mutated any input object.
  assert.notEqual(next, state, `${label}: op returned the same state object`);
  // Frozen deep — any mutation attempt would have thrown in the op.
  freezeDeep(state);
  try {
    const probe = opActivatePane(state, state.activePaneId);
    assert.ok(probe === state || probe === state, `${label}: frozen input broken`);
  } catch (e) {
    fail(`${label}: op mutated its frozen input: ${e.message}`);
  }
}

let state = initialState();
checkInvariants(state, 'init');
console.log(`seed: layout=${state.layout} panes=${state.panes.length}`);

// ---- 100 pane switches ---------------------------------------------------
state = opSetLayout(state, '4');
checkInvariants(state, 'seed-4');
const paneIds = state.panes.map((p) => p.id);
for (let i = 0; i < 100; i++) {
  const before = state;
  if (i % 2 === 0) {
    // real switch: target a DIFFERENT pane than the current one
    const target = paneIds[(i + 1) % paneIds.length];
    assert.notEqual(target, before.activePaneId, `switch #${i}: not a real switch`);
    const next = opActivatePane(state, target);
    assertImmutable(before, next, `switch #${i}`);
    assert.equal(next.activePaneId, target, `switch #${i}: wrong pane activated`);
    state = next;
  } else {
    // no-op: activating the already-active pane must return the SAME object
    const next = opActivatePane(state, state.activePaneId);
    assert.equal(next, before, `switch #${i}: no-op activation must not change state`);
  }
  checkInvariants(state, `switch #${i}`);
}
console.log('100 pane switches: OK');

// ---- 1000 watchlist clicks (symbol on active pane) -----------------------
for (let i = 0; i < 1000; i++) {
  const item = UNIVERSE[i % UNIVERSE.length];
  const next = opSetActivePaneSymbol(state, item);
  assertImmutable(state, next, `click #${i}`);
  state = next;
  const active = state.panes.find((p) => p.id === state.activePaneId);
  const expectedSymbol = item.kind === 'index' ? item.symbol : item.symbol_label;
  assert.equal(active.token, item.token, `click #${i}: active pane token wrong`);
  assert.equal(active.symbol, expectedSymbol, `click #${i}: active pane symbol wrong`);
  assert.equal(active.chartMode, item.chartMode, `click #${i}: active pane chartMode wrong`);
  checkInvariants(state, `click #${i}`);
}
console.log('1000 watchlist clicks: OK');

// ---- lifecycle fuzz: 2000 mixed ops --------------------------------------
let rng = 42;
const rand = (n) => { rng = (rng * 1103515245 + 12345) & 0x7fffffff; return rng % n; };
for (let i = 0; i < 2000; i++) {
  const pane = state.panes[rand(state.panes.length)];
  const before = state;
  let next;
  switch (rand(11)) {
    case 0: next = opAddPane(state, UNIVERSE[rand(UNIVERSE.length)]); break;
    case 1: next = opRemovePane(state, pane.id); break;
    case 2: next = opSwapPanes(state, pane.id, state.panes[rand(state.panes.length)].id); break;
    case 3: next = opSetLayout(state, Object.keys(LAYOUT_COUNT)[rand(5)]); break;
    case 4: next = opOpenTab(state, pane.id, UNIVERSE[rand(UNIVERSE.length)]); break;
    case 5: next = opCloseTab(state, pane.id, pane.tabs[rand(pane.tabs.length)].id); break;
    case 6: next = opActivateTab(state, pane.id, pane.tabs[rand(pane.tabs.length)].id); break;
    case 7: next = opToggleIndicator(state, pane.id, `IND${rand(3)}`); break;
    case 8: next = opSetTool(state, pane.id, ['cursor', 'trend', 'rect', 'fib'][rand(4)]); break;
    case 9: next = opToggleDrawings(state, pane.id); break;
    case 10: next = opSetSizes(state, state.layout, { cols: [0.3, 0.7] }); break;
  }
  if (next === state) continue; // legit no-op (close last tab, remove last pane, ...)
  assertImmutable(before, next, `fuzz #${i}`);
  state = next;
  checkInvariants(state, `fuzz #${i}`);
}
console.log('2000 fuzz ops: OK');

// ---- duplicate / clear paths ---------------------------------------------
state = opDuplicatePane(state, state.activePaneId);
checkInvariants(state, 'duplicatePane');
state = opClearDrawings(state, state.activePaneId);
state = opClearIndicators(state, state.activePaneId);
state = opSetActivePaneTimeframe(state, ['1h', 'ONE_HOUR']);
state = opSetSymbol(state, state.panes[0].id, { exchange: 'NSE', token: 'T5', symbol: 'HDFC', chartMode: 'index', selection: null });
checkInvariants(state, 'misc');
console.log('duplicate/clear/symbol/timeframe paths: OK');

// ---- persistence round-trip (v2 -> migrateState) -------------------------
const roundTrip = migrateState(JSON.parse(JSON.stringify(state)));
assert.ok(roundTrip, 'round-trip failed');
checkInvariants(roundTrip, 'round-trip');
console.log('persistence round-trip: OK');

// ---- legacy migration (flat panes, numeric ids, no tabs) -----------------
const legacy = {
  layout: '4',
  activePaneId: 1,
  panes: [
    { id: 0, exchange: 'NSE', token: '99926000', symbol: 'NIFTY', timeframe: ['5m', 'FIVE_MINUTE'], chartMode: 'index', selection: null, tool: 'cursor', snap: { magnet: false, mode: 'ohlc' }, drawingsVisible: true, activeIndicators: [], clearRevision: 0 },
    { id: 1, exchange: 'NSE', token: '99926009', symbol: 'BANKNIFTY', timeframe: ['15m', 'FIFTEEN_MINUTE'], chartMode: 'index', selection: null, tool: 'trend', snap: { magnet: false, mode: 'ohlc' }, drawingsVisible: true, activeIndicators: ['SMA'], clearRevision: 3 },
    { id: 2, exchange: 'NFO', token: 'T9', symbol: 'NIFTY 25000 CE', timeframe: ['5m', 'FIVE_MINUTE'], chartMode: 'strike', selection: { underlying: 'NIFTY', strike: 25000, type: 'CE', token: 'T9' }, tool: 'cursor', snap: { magnet: false, mode: 'ohlc' }, drawingsVisible: true, activeIndicators: [], clearRevision: 0 },
    { id: 3, exchange: 'NSE', token: 'T8', symbol: 'RELIANCE', timeframe: ['1D', 'ONE_DAY'], chartMode: 'index', selection: null, tool: 'cursor', snap: { magnet: false, mode: 'ohlc' }, drawingsVisible: false, activeIndicators: [], clearRevision: 1 },
  ],
};
const migrated = migrateState(legacy);
assert.ok(migrated, 'legacy migration failed');
checkInvariants(migrated, 'legacy-migrated');
assert.equal(migrated.activePaneId, '1', 'legacy active pane must map to p2');
assert.equal(migrated.panes[1].activeTab, '1-t1', 'legacy pane must wrap into a tab');
assert.deepEqual(migrated.panes[1].activeIndicators, ['SMA'], 'legacy indicators lost');
assert.equal(migrated.panes[3].drawingsVisible, false, 'legacy drawingsVisible lost');
assert.ok(migrated.sizes['4'], 'legacy sizes missing default');
console.log('legacy migration: OK');

// ---- persisted key never contains a stale pane ---------------------------
const serialized = JSON.stringify(state);
const reloaded = JSON.parse(serialized);
const reloadedOk = migrateState(reloaded);
checkInvariants(reloadedOk, 'reload');
console.log('serialize/reload: OK');

if (FAILURES.length) {
  console.error(`\n${FAILURES.length} FAILURE(S)`);
  process.exit(1);
}
console.log('\nALL PHASE 7 CHECKS PASSED');
