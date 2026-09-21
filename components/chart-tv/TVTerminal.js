'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import TVChartContainer from '@/components/chart-tv/TVChartContainer';
import { drawingScopeFor } from '@/components/chart/engine/DrawingSchema';
import { TV_TIMEFRAME_LABELS, resolveRelayInterval } from '@/components/chart-tv/TVChartSeries';
import ChartContextMenu from '@/components/chart/ui/ChartContextMenu';
import PropertiesPanel from '@/components/chart/ui/PropertiesPanel';
import DrawingFlyout from '@/components/chart/ui/DrawingFlyout';
import TVLeftToolbar from '@/components/chart-tv/TVLeftToolbar';
import LiveQuoteFeed from '@/components/chart-tv/LiveQuoteFeed';
import BuySellOverlay from '@/components/chart-tv/BuySellOverlay';
import EntryBar from '@/components/chart-tv/EntryBar';
import InstrumentCard from '@/components/chart-tv/InstrumentCard';
import OptionChainModal from '@/components/chart-tv/TVOptionChainDrawer';
import TVSymbolSearch from '@/components/chart-tv/TVSymbolSearch';
import TVTimeframeDropdown from '@/components/chart-tv/TVTimeframeDropdown';
import ScalperTicket from '@/components/chart-tv/ScalperTicket';
import AlertNotifications from '@/components/terminal/AlertNotifications';
import AccountManager from '@/components/terminal/AccountManager';
import PositionManager from '@/components/terminal/PositionManager';
import TradeHistory from '@/components/terminal/TradeHistory';
import Watchlist from '@/components/terminal/Watchlist';
import OrderPanel from '@/components/chart-tv/TVOrderPanel';
import OrderBook from '@/components/terminal/OrderBook';
import OrderManager from '@/components/terminal/OrderManager';
import AlertManager from '@/components/terminal/AlertManager';
import StatusBar from '@/components/terminal/StatusBar';
import DrawingManagerPanel from '@/components/chart/ui/DrawingManagerPanel';
import TVChartHotkeys from '@/components/chart-tv/TVChartHotkeys';
import { TV_DARK_THEME, TV_LIGHT_THEME } from '@/components/chart-tv/TVChartTheme';
import { INDEX_TOKEN, IS_MARKET_OPEN } from '@/components/terminal/constants';
import { marketData } from '@/services/marketData';
import { supabase } from '@/lib/supabaseClient';
import { useMarketData } from '@/hooks/useMarketData';
import { useAccountRisk } from '@/hooks/useAccountRisk';
import { usePortalDataOptional } from '@/components/portal/PortalDataProvider';
import { getPlanTypeLabel, getStatusMeta, getAccountLifecycleState, accountFinancials } from '@/lib/accounts';
import { getPhaseDisplayLabel, getRulesForAccount } from '@/lib/rules';
import { summarizeSimRisk, isWeekendNow } from '@/lib/simRisk';
import { PriceBus } from '@/stores/PriceBus';
import { TradingStore, useTradeState, fmtINR } from '@/stores/TradingStore';
import { pnlAt, signedINR } from '@/components/chart-tv/levelPnl';
import { isZoneType, isChannelType, isStrokeType, isPositionType, isTextType } from '@/components/chart/drawing/DrawingDefinitions';
import { Square, Columns2, Columns3, Columns4, Magnet, Undo2, Redo2, Trash2, Sprout, Bell, ListTree, Moon, Sun, Maximize2, Minimize2, ChevronLeft, ChevronUp, ChevronDown, Info, Zap } from 'lucide-react';

const CHARTS = [
  { key: 'a', label: 'NIFTY', token: '99926000', underlying: 'NIFTY' },
  { key: 'b', label: 'BANKNIFTY', token: '99926009', underlying: 'BANKNIFTY' },
];

// Layout system (ported semantics from the terminal's paneOps): panel slots
// are fixed keys 'a'..'d'; the current layout counts how many are visible.
// Shrinking keeps the first N panels; growing re-adds the next slots (their
// drawings restore from localStorage via the overlay serialization).
const PANEL_ORDER = ['a', 'b', 'c', 'd'];
const PANEL_DEF = { a: CHARTS[0], b: CHARTS[1], c: CHARTS[0], d: CHARTS[1] };
const LAYOUT_GRID = {
  1: { gridTemplateColumns: 'minmax(0, 1fr)', gridTemplateRows: 'minmax(0, 1fr)' },
  2: { gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gridTemplateRows: 'minmax(0, 1fr)' },
  3: { gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)', gridTemplateRows: 'minmax(0, 1fr)' },
  4: { gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1fr)' },
};

// Shared chrome styles — all colors flow through the app's CSS variables
// (globals.css), so the page matches the dark theme of the rest of the app
// and follows the site-wide light-theme-class toggle automatically.
const toolStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5,
  height: 26, padding: '0 8px', fontSize: 11, fontFamily: 'Inter, sans-serif',
  fontWeight: 600,
  border: '1px solid transparent', borderRadius: 5,
  background: 'transparent', color: 'var(--muted)',
  cursor: 'pointer', transition: 'background .12s, color .12s',
  whiteSpace: 'nowrap',
};
const toolActive = { ...toolStyle, background: 'rgba(77,124,254,.14)', borderColor: 'rgba(77,124,254,.35)', color: '#4D7CFE' };
const iconBtn = { ...toolStyle, width: 28, padding: 0 };
const iconActive = { ...iconBtn, background: 'rgba(77,124,254,.14)', borderColor: 'rgba(77,124,254,.35)', color: '#4D7CFE' };
// Timeframe pills — FundedDesk green marks the active one (Section 6).
const tfBtn = { ...toolStyle, minWidth: 32, padding: '0 7px' };
const tfBtnActive = { ...tfBtn, background: 'rgba(34,197,139,.16)', borderColor: 'rgba(34,197,139,.4)', color: 'var(--green)' };

const QUICK_TIMEFRAMES = ['1m', '5m', '15m', '1h', '1D'].map((tv) => ({ tv, relay: resolveRelayInterval(tv), label: TV_TIMEFRAME_LABELS[tv] }));

// Dark-themed metric tile for the P&L / Margin dock tabs — same real
// TradingStore.account fields AccountSummary reads, just split by topic.
function DockMetric({ label, value, accent }) {
  return (
    <div style={{ flex: '1 1 140px', minWidth: 120, padding: '10px 14px', borderRadius: 8, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', color: accent || 'var(--text)' }}>{value}</div>
    </div>
  );
}

// One row in the account context popover — label left, value right, real
// data only (every caller passes '—' for anything unavailable).
function AccountPanelRow({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '3px 0', fontSize: 11 }}>
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: accent || 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}

// Simulator-side rule/risk readout for the account popover — subscribes to
// TradingStore itself so only this small subtree re-renders per tick, not
// the whole terminal. Every figure here is derived from the SIMULATOR's own
// state (see lib/simRisk.js); it is a different, clearly-labeled number
// from the real-ledger risk shown above it (Phase 5's evaluateAccountRisk).
function SimRiskSection({ rules, capital }) {
  const account = useTradeState('account');
  const trades = useTradeState('trades');
  const sim = useMemo(() => summarizeSimRisk({ rules, account, trades, capital }), [rules, account, trades, capital]);
  if (!sim) return null;

  const nearLimit = (observed, limit) => observed != null && limit != null && observed >= limit * 0.8;
  let status = 'Healthy'; let statusColor = 'var(--green)';
  if (sim.maxDrawdown.limitPct == null && sim.dailyDrawdown.limitPct == null) {
    status = 'Unavailable'; statusColor = 'var(--muted)';
  } else if (sim.maxDrawdown.breached || sim.dailyDrawdown.breached || sim.weekendTradingBlocked) {
    status = 'Blocked'; statusColor = 'var(--red)';
  } else if (nearLimit(sim.maxDrawdown.observedPct, sim.maxDrawdown.limitPct) || nearLimit(sim.dailyDrawdown.observedPct, sim.dailyDrawdown.limitPct)) {
    status = 'Warning'; statusColor = 'var(--gold)';
  }

  return (
    <>
      <div style={{ height: 1, background: 'var(--line2)', margin: '6px 0' }} />
      <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
        Simulated trading rules
      </div>
      <AccountPanelRow label="Sim risk status" value={status} accent={statusColor} />
      <AccountPanelRow
        label="Sim max DD"
        value={sim.maxDrawdown.limitPct != null
          ? `${fmtINR(sim.maxDrawdown.observedAmount || 0)} / ${fmtINR(sim.maxDrawdown.limitAmount)}`
          : '—'}
        accent={sim.maxDrawdown.breached ? 'var(--red)' : undefined}
      />
      <AccountPanelRow
        label="Sim daily DD"
        value={sim.dailyDrawdown.limitPct != null && sim.dailyDrawdown.evaluable
          ? `${(sim.dailyDrawdown.observedPct ?? 0).toFixed(2)}% / ${sim.dailyDrawdown.limitPct}%`
          : sim.dailyDrawdown.limitPct != null ? 'Unavailable' : '—'}
        accent={sim.dailyDrawdown.breached ? 'var(--red)' : undefined}
      />
      <AccountPanelRow
        label="Sim profit progress"
        value={sim.profitTarget ? `${Math.max(0, sim.profitTarget.progressPct ?? 0).toFixed(0)}% of ${sim.profitTarget.pct}%` : 'No evaluation target'}
      />
      <AccountPanelRow label="Stop loss" value={sim.stopLossRequired ? 'Required' : 'Optional'} />
      <AccountPanelRow label="Stacking limit" value={sim.positionStackingLimit != null ? `${sim.positionStackingLimit} per side` : '—'} />
      {sim.weekendTradingBlocked && (
        <div style={{ marginTop: 6, padding: '6px 8px', borderRadius: 6, background: 'rgba(239,83,80,0.1)', color: 'var(--red)', fontSize: 10, fontWeight: 600 }}>
          Trading blocked — weekend trading is not permitted for this account.
        </div>
      )}
    </>
  );
}

const indexInstrument = (c) => ({ exchange: 'NSE', token: c.token, symbol: c.label, underlying: c.underlying, chartMode: 'index', selection: null });

const TVCHART_STATE_KEY = 'fundeddesk:tvchart:v1';
const loadTvChartState = () => { try { return JSON.parse(localStorage.getItem(TVCHART_STATE_KEY)) || null; } catch { return null; } };

export default function TVTerminal() {
  const rootsRef = useRef({});
  const chartsRef = useRef({});
  const handledRoots = useRef(new Set());   // panel keys whose hydrate pass is complete
  const restoredRoots = useRef(new WeakSet()); // per-root restore-once guard (new root mount = fresh restore)
  const [activeKey, setActiveKey] = useState('a');
  // Default is a single, dominant chart — multi-chart layouts (2/3/4) stay
  // available from the layout switcher, but the terminal opens on one chart
  // per the reference's "chart is the hero" hierarchy.
  const [layout, setLayout] = useState(1);
  const [panelKeys, setPanelKeys] = useState(PANEL_ORDER.slice(0, 1));
  const panelKeysRef = useRef(panelKeys);
  panelKeysRef.current = panelKeys;
  const [tool, setTool] = useState('cursor');
  const [intervals, setIntervals] = useState(() => {
    const saved = loadTvChartState();
    const out = {};
    PANEL_ORDER.forEach((k) => { out[k] = saved?.intervals?.[k] || 'FIVE_MINUTE'; });
    return out;
  });
  const [instruments, setInstruments] = useState(() => {
    const saved = loadTvChartState();
    const out = {};
    PANEL_ORDER.forEach((k) => { out[k] = saved?.[k] || indexInstrument(PANEL_DEF[k]); });
    return out;
  });
  // Fixed at 'volume' — no indicator picker is exposed in this terminal's header.
  const [indicators] = useState(PANEL_ORDER.reduce((m, k) => ({ ...m, [k]: ['volume'] }), {}));
  // True while a panel's chart is mid-fetch for its CURRENT symbol/timeframe
  // (set by TVChartContainer.onLoadingChange). Starts true for every panel —
  // the very first load is itself a load — and drives InstrumentCard's OHLC
  // gate: never show one symbol's O/H/L/C under another symbol's header
  // while its candles are still in flight (Phase 21A round 2).
  const [panelLoading, setPanelLoading] = useState(PANEL_ORDER.reduce((m, k) => ({ ...m, [k]: true }), {}));
  const [chainPanel, setChainPanel] = useState(null);
  const [chainUnderlying, setChainUnderlying] = useState('NIFTY');
  const [magnet, setMagnet] = useState(true);
  const [selectedCount, setSelectedCount] = useState(PANEL_ORDER.reduce((m, k) => ({ ...m, [k]: 0 }), {}));
  const [counts, setCounts] = useState(PANEL_ORDER.reduce((m, k) => ({ ...m, [k]: 0 }), {}));
  const [menu, setMenu] = useState(null);       // { chart, x, y, id, bounds }
  const [properties, setProperties] = useState(null); // { chart, id }
  const [flyout, setFlyout] = useState(null);   // { chart, x, y, id }
  const [live, setLive] = useState(true);
  const [seedError, setSeedError] = useState(null);
  const [painted, setPainted] = useState(null);
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [stockQuotes, setStockQuotes] = useState({});
  const [order, setOrder] = useState(null); // { key, side } — OrderPanel request
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const orderSubmittingRef = useRef(false);
  const draftRef = useRef({ lots: '1', sl: '', tp: '', orderType: 'Market', limitPrice: '' });
  const [dockTab, setDockTab] = useState('positions'); // 'positions' | 'orders' | 'history' | 'account' | 'pnl' | 'margin'
  // Bottom dock (Phase 21B, Section 3) — collapsed by default so the chart
  // gets maximum workspace on first load, per the reference. Purely a CSS/
  // layout state: the flex column below grows into the reclaimed space and
  // each panel's own ResizeObserver (TVChartResize.js, already wired since
  // Phase 1) picks up the new container size on its own — no chart
  // recreation, no new resize code needed.
  const [bottomDockOpen, setBottomDockOpen] = useState(false);
  // Scalper mode (Phase 21B, Section 4) — OFF by default; ON makes a chart
  // click open a floating quick order ticket instead of just moving the
  // crosshair. scalperPopup carries exactly what the ticket needs to render
  // and to place the eventual order: which panel was clicked, where to
  // anchor the floating card, and the clicked bar's own price (never a
  // fabricated bid/ask).
  const [scalperEnabled, setScalperEnabled] = useState(false);
  const [scalperPopup, setScalperPopup] = useState(null); // { panel, x, y, price }
  const [watchlistOpen, setWatchlistOpen] = useState(true);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [objectsOpen, setObjectsOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compare, setCompare] = useState(PANEL_ORDER.reduce((m, k) => ({ ...m, [k]: null }), {}));
  // Start in sync with the site-wide theme (ThemeToggle applies the .light-theme
  // class from localStorage before this page mounts; the icon then corrects
  // itself after hydration without a server/client mismatch).
  const [dark, setDark] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('light-theme'));
  }, []);
  const [relayStatus, setRelayStatus] = useState('connecting'); // relay health for StatusBar
  const objectsApiRef = useRef({ current: null });
  const chainN = useMarketData('NIFTY');
  const chainB = useMarketData('BANKNIFTY');
  const chains = { NIFTY: chainN.chain, BANKNIFTY: chainB.chain };
  const drawingsByInstrument = useRef({});

  // Real FundedDesk account context — present on /portal/terminal (inside
  // <PortalDataProvider>), absent on /tv-chart (a standalone route with no
  // account concept at all). Everything below degrades to null/no-op there,
  // preserving /tv-chart's existing account-free behavior exactly.
  const portalData = usePortalDataOptional();
  const selectedAccount = portalData?.selectedAccount || null;
  const selectedPlan = selectedAccount?.plans || null;
  const accountLifecycle = selectedAccount ? getAccountLifecycleState(selectedAccount, selectedPlan) : null;
  const accountFinance = selectedAccount ? accountFinancials(selectedAccount, selectedPlan) : null;
  const { risk: accountRisk } = useAccountRisk(selectedAccount);
  // The ONE canonical rule resolver — TradingStore only ever receives this
  // via setRules() below, never a copy of ONE_STEP_RULES/TWO_STEP_RULES/etc.
  const accountRules = useMemo(
    () => (selectedAccount && selectedPlan ? getRulesForAccount(selectedAccount, selectedPlan) : null),
    [selectedAccount, selectedPlan],
  );
  const [accountPanelOpen, setAccountPanelOpen] = useState(false);
  const accountPanelRef = useRef(null);

  useEffect(() => {
    if (!accountPanelOpen) return undefined;
    const onDown = (e) => { if (accountPanelRef.current && !accountPanelRef.current.contains(e.target)) setAccountPanelOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setAccountPanelOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [accountPanelOpen]);

  // Scope the simulator wallet to whichever account the portal has selected
  // — a no-op if it's already scoped there (see TradingStore.setAccountScope).
  // /tv-chart never runs this (selectedAccount is always null there), so it
  // keeps using the single pre-existing global wallet untouched.
  useEffect(() => {
    if (!portalData) return; // no account context at all — don't touch scope
    TradingStore.setAccountScope(selectedAccount?.login_id || null, accountFinance?.capital ?? null);
  }, [portalData, selectedAccount?.id, selectedAccount?.login_id, accountFinance?.capital]);

  // Rules travel separately from scope — same account can have its rules
  // re-resolved (e.g. phase1 -> phase2) without the wallet itself resetting.
  useEffect(() => {
    if (!portalData) return; // /tv-chart: no rules, no enforcement — unchanged behavior
    TradingStore.setRules(accountRules);
  }, [portalData, accountRules]);

  // Mirror option-chain LTPs into the PriceBus so the Buy/Sell overlay and
  // TradingStore have a live price for whichever contract is selected
  // (same pattern TerminalDataLayer uses on /portal/terminal).
  useEffect(() => {
    [chainN.chain, chainB.chain].forEach((chain) => {
      if (!chain?.rows) return;
      chain.rows.forEach((row) => {
        if (row.ceToken && row.ce != null) PriceBus.set(String(row.ceToken), { ltp: Number(row.ce) });
        if (row.peToken && row.pe != null) PriceBus.set(String(row.peToken), { ltp: Number(row.pe) });
      });
    });
  }, [chainN.chain, chainB.chain]);

  // Relay health → StatusBar connection state (real endpoint, not static).
  useEffect(() => {
    let alive = true;
    let timer = null;
    const poll = async () => {
      try {
        await marketData.health();
        if (alive) setRelayStatus('connected');
      } catch {
        if (alive) setRelayStatus('offline');
      }
      timer = setTimeout(poll, 10000);
    };
    poll();
    return () => { alive = false; clearTimeout(timer); };
  }, []);

  // Theme: re-theme the TV charts (candles/grid/scale) when toggled; the
  // page chrome follows the terminal's CSS variables (.light-theme = dark).
  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', dark);
    Object.values(chartsRef.current).forEach((chart) => chart?.setTheme?.(dark ? TV_DARK_THEME : TV_LIGHT_THEME));
  }, [dark]);

  // Fullscreen button state follows the browser (so Esc still exits cleanly).
  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  // Persist each panel's instrument + timeframe across reloads (same
  // localStorage pattern drawingPersistence uses — no new storage layer).
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(TVCHART_STATE_KEY, JSON.stringify({ ...instruments, intervals }));
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [instruments, intervals]);

  // Layout switcher (1/2/3/4 panels). Shrinking keeps the first N panels;
  // growing re-attaches the next slots. Removed panels drop their session
  // "seeded" flags so a later re-add restores + reseeds that chart fresh.
  const changeLayout = (count) => {
    const next = Math.max(1, Math.min(4, count));
    PANEL_ORDER.slice(next).forEach((k) => {
      sessionStorage.removeItem(`fd-seed-${rootsRef.current[k]?.chartKey || `tv-overlay-${k}`}`);
      handledRoots.current.delete(k);
    });
    if (!PANEL_ORDER.slice(0, next).includes(activeKey)) setActiveKey(next > 0 ? PANEL_ORDER[0] : 'a');
    setLayout(next);
    setPanelKeys(PANEL_ORDER.slice(0, next));
  };

  // Point the objects-tree panel at the ACTIVE panel's overlay root.
  useEffect(() => {
    if (rootsRef.current[activeKey]) objectsApiRef.current = rootsRef.current[activeKey];
  }, [activeKey]);

  // Watchlist data, mirroring the old terminal's TerminalDataLayer: items come
  // from supabase (search universe is internal to Watchlist), stock quotes are
  // heatmap polls, and per-token prices are derived from the two option chains.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        const { data, error } = await supabase
          .from('user_watchlist_items')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        if (!error && data && alive) setWatchlistItems(data);
      } catch { /* signed-out visitors just get the built-in indices */ }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    const poll = async () => {
      try {
        const [niftyData, bankData] = await Promise.all([
          marketData.heatmap('NIFTY', controller.signal),
          marketData.heatmap('BANKNIFTY', controller.signal),
        ]);
        if (!alive) return;
        const next = {};
        [...(niftyData || []), ...(bankData || [])].forEach((stock) => {
          if (stock.token) next[stock.token] = {
            ltp: stock.ltp,
            bid: stock.bid,
            ask: stock.ask,
            change: stock.dayChangePercent,
            prevClose: stock.prevClose,
          };
        });
        setStockQuotes(next);
      } catch (error) {
        if (error?.name !== 'AbortError') console.warn('Stock price poll failed', error);
      }
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => { clearInterval(id); controller.abort(); };
  }, []);

  const prices = useMemo(() => {
    const next = {};
    [['NIFTY', chainN.chain], ['BANKNIFTY', chainB.chain]].forEach(([index, chain]) => {
      if (!chain) return;
      if (chain.spot != null) next[INDEX_TOKEN[index]] = Number(chain.spot) || 0;
      (chain.rows || []).forEach((row) => {
        if (row.ceToken) next[row.ceToken] = Number(row.ce) || 0;
        if (row.peToken) next[row.peToken] = Number(row.pe) || 0;
      });
    });
    return next;
  }, [chainN.chain, chainB.chain]);

  // The relay's chain rows carry no `underlying` field of their own (see
  // curl-verified real shape: strike/ce/pe/ceToken/peToken only) — tagging
  // it here, where we still know which chain (NIFTY vs BANKNIFTY) each row
  // came from, is the ONE place this identity is resolved. Every downstream
  // reader (watchItemToInstrument below, Watchlist.js's search/display)
  // already reads row.underlying; before this fix it was always undefined,
  // which made watchItemToInstrument's `|| 'NIFTY'` fallback silently
  // mislabel every BANKNIFTY option opened from the Watchlist as NIFTY, and
  // made Watchlist's own search default to an empty string — no option
  // could ever be found by typing "NIFTY"/"BANKNIFTY", and matches rendered
  // with a blank underlying prefix.
  const optionChainRows = useMemo(() => [
    ...(chainN.chain?.rows || []).map((r) => (r.underlying ? r : { ...r, underlying: 'NIFTY' })),
    ...(chainB.chain?.rows || []).map((r) => (r.underlying ? r : { ...r, underlying: 'BANKNIFTY' })),
  ], [chainN.chain, chainB.chain]);

  const displayedItems = useMemo(() => {
    const items = [
      { token: INDEX_TOKEN.NIFTY, exchange: 'NSE', symbol_label: 'NIFTY 50', kind: 'index' },
      { token: INDEX_TOKEN.BANKNIFTY, exchange: 'NSE', symbol_label: 'BANKNIFTY', kind: 'index' },
    ];
    watchlistItems.forEach((w) => {
      if (w.token !== INDEX_TOKEN.NIFTY && w.token !== INDEX_TOKEN.BANKNIFTY) {
        items.push({ token: w.token, exchange: w.exch, symbol_label: w.symbol_label, kind: w.kind });
      }
    });
    return items;
  }, [watchlistItems]);

  const onAddWatchlist = (item) => {
    setWatchlistItems((prev) => prev.some((w) => w.token === item.token)
      ? prev
      : [...prev, { token: item.token, exch: item.exchange, symbol_label: item.symbol_label, kind: item.kind }]);
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        await supabase.from('user_watchlist_items').insert({
          user_id: session.user.id,
          token: item.token,
          exch: item.exchange,
          symbol_label: item.symbol_label,
          kind: item.kind,
        });
      } catch { /* local-only persistence is fine */ }
    })();
  };

  const onRemoveWatchlist = (token) => {
    setWatchlistItems((prev) => prev.filter((w) => w.token !== token));
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) return;
        await supabase.from('user_watchlist_items').delete()
          .eq('user_id', session.user.id)
          .eq('token', token);
      } catch { /* local-only removal is fine */ }
    })();
  };

  // Compare popover contents — same symbol universe the Watchlist uses
  // (indices + saved watchlist rows), enriched with live ltp/change the way
  // the old terminal's compareItems did (chain/spot price for indices, the
  // heatmap quote for stocks). The active panel's own instrument is excluded.
  const compareItems = useMemo(() => {
    const inst = instruments[activeKey];
    return displayedItems
      .filter((i) => i.token !== inst?.token)
      .map((i) => {
        const q = stockQuotes[i.token];
        return {
          ...i,
          ltp: prices[i.token] != null ? prices[i.token] : (q?.ltp ?? null),
          change: i.kind === 'index' ? null : (q?.change ?? null),
        };
      });
  }, [displayedItems, stockQuotes, prices, instruments, activeKey]);

  const applyCompare = async (item) => {
    const key = activeKey;
    const chart = chartsRef.current[key];
    if (!chart || !instruments[key]) return;
    if (item.token === instruments[key].token) { setCompareOpen(false); return; }
    try {
      await chart.setCompareOverlay({
        exchange: item.exchange,
        token: item.token,
        symbol: item.symbol_label,
        interval: intervals[key],
      });
      setCompare((prev) => ({ ...prev, [key]: item.symbol_label }));
      setCompareOpen(false);
    } catch (error) {
      console.warn('compare failed', key, error);
    }
  };

  const clearCompare = (key) => {
    chartsRef.current[key]?.removeCompareSeries();
    setCompare((prev) => ({ ...prev, [key]: null }));
  };

  useEffect(() => {
    if (!compareOpen) return undefined;
    const away = (e) => { if (!e.target.closest?.('[data-compare-popover], [data-compare-btn]')) setCompareOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setCompareOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [compareOpen]);

  // SL/TP + entry lines on each panel for positions open on that panel's
  // instrument, using the shared trading P&L formula
  // (level - avgPrice) * dir * qty (same math as PositionManager). The entry
  // line is blue solid at avgPrice (the line the EntryBar control bar sits
  // on); SL is a red dashed line and TP green dashed, each label carrying
  // the P&L amount at that level. All three are constant at fixed levels, so
  // setLevelLines reuses the underlying line instances across live ticks.
  const applyLevelLines = useCallback((key) => {
    const inst = instruments[key];
    const chart = chartsRef.current[key];
    if (!inst || !chart?.setLevelLines) return;
    const lines = [];
    for (const p of TradingStore.getSnapshot('positions') || []) {
      if (String(p.token) !== String(inst.token)) continue;
      if (p.sl != null) {
        lines.push({
          price: p.sl,
          title: `SL ${signedINR(pnlAt(p.sl, p))}`,
          color: '#ef5350',
          lineStyle: 2,
        });
      }
      if (p.tp != null) {
        lines.push({
          price: p.tp,
          title: `TP ${signedINR(pnlAt(p.tp, p))}`,
          color: '#26a69a',
          lineStyle: 2,
        });
      }
      lines.push({
        price: p.avgPrice,
        title: `${p.side} ${p.qty} @ ${Number(p.avgPrice).toFixed(2)}`,
        color: '#2962ff',
        lineStyle: 0,
      });
    }
    chart.setLevelLines(lines);
  }, [instruments]);

  // Apply on open/close/SL-TP edit (each replaces the positions slice, so
  // the subscription re-renders) and on instrument/layout changes.
  const positionsSlice = useTradeState('positions');
  const accountSlice = useTradeState('account');
  useEffect(() => {
    for (const key of panelKeys) applyLevelLines(key);
  }, [applyLevelLines, panelKeys, positionsSlice]);

  // Live price ticks mutate position.currentPrice in place (same slice
  // reference), so the current-price P&L label re-applies via PriceBus.
  useEffect(() => {
    const off = PriceBus.onAll(() => {
      if (!TradingStore.getSnapshot('positions')?.length) return;
      for (const key of panelKeys) applyLevelLines(key);
    });
    return off;
  }, [applyLevelLines, panelKeys]);

  // The chart canvases cover nearly the whole viewport and consume plain
  // mouse-wheel events (pan/zoom), so the page itself becomes unreachable by
  // scrolling. Route plain wheels over a chart to the page instead; keep
  // Ctrl/Cmd+wheel (and trackpad pinch) for the chart's zoom.
  useEffect(() => {
    const onWheelCapture = (event) => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest('[data-chart-key]')) return;
      if (event.ctrlKey || event.metaKey) {
        const panel = target.closest('[data-chart-key]').getAttribute('data-chart-key');
        const chart = chartsRef.current[panel]?.chart;
        if (!chart) return;
        event.preventDefault();
        event.stopPropagation();
        const factor = event.deltaMode === 1 ? 4 : 1;
        const spacing = chart.timeScale().options().barSpacing;
        const step = 1 / (1 + factor * Math.abs(event.deltaY) / 200);
        chart.applyOptions({ timeScale: { barSpacing: Math.min(60, Math.max(2, spacing * (event.deltaY < 0 ? 1 / step : step))) } });
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const factor = event.deltaMode === 1 ? 16 : 1;
      window.scrollBy(0, event.deltaY * factor);
    };
    document.addEventListener('wheel', onWheelCapture, { capture: true, passive: false });
    return () => document.removeEventListener('wheel', onWheelCapture, { capture: true });
  }, []);

  // Drawings are scoped per symbol+timeframe (DrawingSchema's own
  // drawingScopeFor, now actually wired in here — Phase 20): switching
  // either the instrument or the timeframe of a panel stashes the current
  // scope's drawings and restores the target scope's set, using only the
  // public root API. This is the SAME save/clear/restore mechanism that
  // already existed for instrument switches; it now also fires on
  // timeframe switches and keys by symbol+timeframe instead of
  // instrument-only, so NIFTY:1 and NIFTY:5 are isolated from each other
  // exactly like NIFTY and BANKNIFTY already were.
  const switchDrawingScope = (panel, { symbol, timeframe }) => {
    const root = rootsRef.current[panel];
    if (!root) return;
    const cur = instruments[panel];
    const curTf = intervals[panel];
    const scope = drawingScopeFor({ symbol: cur.symbol, timeframe: curTf });
    const saved = { ...(drawingsByInstrument.current[panel] || {}), [scope]: [...root.getDrawings()] };
    drawingsByInstrument.current[panel] = saved;
    root.clearAll();
    root.selection.clear();
    root.identity.symbol = symbol;
    root.identity.timeframe = timeframe;
    const targetScope = drawingScopeFor({ symbol, timeframe });
    const target = saved[targetScope] || [];
    target.forEach((d) => root.getInteraction().place(d));
    root.selection.clear();
    // counts[panel] updates on its own via the existing 'drawings:changed'
    // bus subscription (wired at chart-creation time) — no need to set it
    // here too; clearAll()/place() already emit that event.
  };

  const switchInstrument = (panel, next) => {
    switchDrawingScope(panel, { symbol: next.symbol, timeframe: intervals[panel] });
    setInstruments((prev) => ({ ...prev, [panel]: next }));
    // A new main symbol re-bases the chart: drop any compare overlay (its
    // 0% anchor would no longer line up with the new series).
    chartsRef.current[panel]?.removeCompareSeries();
    setCompare((prev) => ({ ...prev, [panel]: null }));
    // A Scalper ticket's price/symbol are only valid for the instrument it
    // was opened against — never let it linger across a symbol switch.
    setScalperPopup((prev) => (prev?.panel === panel ? null : prev));
  };

  const switchTimeframe = (panel, nextTf) => {
    const cur = instruments[panel];
    if (cur) switchDrawingScope(panel, { symbol: cur.symbol, timeframe: nextTf });
    setIntervals((prev) => ({ ...prev, [panel]: nextTf }));
    setScalperPopup((prev) => (prev?.panel === panel ? null : prev));
  };

  // Map a watchlist item onto this page's instrument shape (mirrors the old
  // terminal's itemToConfig). Option items resolve against the chain rows.
  const watchItemToInstrument = useMemo(() => (item) => {
    if (!item) return null;
    if (item.kind === 'index') {
      const entry = Object.entries(INDEX_TOKEN).find(([, token]) => token === item.token);
      if (!entry) return null;
      return { exchange: 'NSE', token: item.token, symbol: entry[0], underlying: entry[0], chartMode: 'index', selection: null };
    }
    if (item.kind === 'option') {
      const row = optionChainRows.find((r) => r.ceToken === item.token || r.peToken === item.token);
      if (!row) return null;
      const type = row.ceToken === item.token ? 'CE' : 'PE';
      const underlying = row.underlying || 'NIFTY';
      return {
        exchange: 'NFO', token: item.token, symbol: `${underlying} ${row.strike} ${type}`,
        underlying, chartMode: 'strike', selection: { underlying, strike: row.strike, type, token: item.token },
      };
    }
    if (item.kind === 'stock') {
      return { exchange: 'NSE', token: item.token, symbol: item.symbol_label, underlying: item.symbol_label, chartMode: 'index', selection: null };
    }
    return null;
  }, [optionChainRows]);

  const onSelectWatchlistItem = (item) => {
    const next = watchItemToInstrument(item);
    if (next) switchInstrument(activeKey, next);
  };

  // Order flow: BUY/SELL buttons (BuySellOverlay) open the reused OrderPanel
  // pre-filled with the panel's instrument and side; confirm places via
  // TradingStore with the chosen lots/SL/TP.
  const panelPrice = (key) => {
    const inst = instruments[key];
    if (!inst) return 0;
    const quote = PriceBus.get(inst.token)?.ltp;
    if (quote) return Number(quote);
    const candle = chartsRef.current[key]?.getLastCandle?.()?.close;
    if (candle) return Number(candle);
    if (inst.token === INDEX_TOKEN.NIFTY) return Number(chainN.chain?.spot) || 0;
    if (inst.token === INDEX_TOKEN.BANKNIFTY) return Number(chainB.chain?.spot) || 0;
    const row = optionChainRows.find((r) => r.ceToken === inst.token || r.peToken === inst.token);
    if (row) return Number(inst.selection?.type === 'CE' ? row.ce : row.pe) || 0;
    return 0;
  };

  // Real account lifecycle gate (only meaningful when a real account is in
  // context — /tv-chart has none and stays unrestricted, as before).
  const tradingBlockedReason = accountLifecycle && !accountLifecycle.isTradeable
    ? `Account status: ${accountLifecycle.statusLabel}`
    : null;
  // Simulator RULE gate — the certain-in-advance case only (weekend); every
  // other rule (drawdown, SL, stacking) is order-dependent and is checked
  // by TradingStore.placeOrder() itself when the order is actually submitted.
  const ruleBlockedReason = accountRules?.weekendTrading === false && isWeekendNow()
    ? 'Weekend trading is not permitted for this account.'
    : null;

  // Shared by Option Chain's plain-click (switch chart), Chart-icon hover
  // action, and the new B/S hover actions (Phase 21C, Section 4) — one
  // place turns a real chain row into the same instrument shape
  // switchInstrument already expects, using only real exchange/token/strike
  // identity from the row (never a fabricated identifier).
  const optionRowToInstrument = (row, type) => {
    const token = type === 'CE' ? row.ceToken : row.peToken;
    if (!token) return null;
    return {
      exchange: 'NFO',
      token: String(token),
      symbol: `${chainUnderlying} ${row.strike} ${type}`,
      underlying: chainUnderlying,
      chartMode: 'strike',
      selection: { underlying: chainUnderlying, strike: row.strike, type, token: String(token) },
    };
  };

  const openOrderPanel = (chartKey, side) => {
    if (tradingBlockedReason || ruleBlockedReason) {
      TradingStore.notify(`Trading blocked — ${tradingBlockedReason || ruleBlockedReason}`, 'error');
      return;
    }
    setScalperPopup(null);
    draftRef.current = { lots: '1', sl: '', tp: '', orderType: 'Market', limitPrice: '' };
    // A fresh ticket always starts submittable — this is the only place the
    // duplicate-submit guard resets, so a stray extra click on an already
    //-submitted ticket can never place a second order.
    orderSubmittingRef.current = false;
    setOrderSubmitting(false);
    setOrder({ key: chartKey, side });
  };

  const submitOrder = () => {
    if (!order || orderSubmittingRef.current) return;
    if (tradingBlockedReason || ruleBlockedReason) { TradingStore.notify(`Trading blocked — ${tradingBlockedReason || ruleBlockedReason}`, 'error'); setOrder(null); return; }
    const inst = instruments[order.key];
    if (!inst) return;
    orderSubmittingRef.current = true;
    setOrderSubmitting(true);
    const price = panelPrice(order.key) || undefined;
    const orderChain = chains[inst.underlying] || null;
    const orderType = (draftRef.current.orderType || 'Market').toUpperCase() === 'LIMIT' ? 'LIMIT' : 'MARKET';
    TradingStore.placeOrder({
      exchange: inst.exchange,
      token: inst.token,
      symbol: inst.symbol,
      underlying: inst.underlying || inst.symbol,
      kind: inst.chartMode === 'strike' ? 'option' : 'future',
      side: order.side,
      lots: Number(draftRef.current.lots) || 1,
      lotSize: orderChain?.lot || undefined,
      signalPrice: price,
      orderType,
      limitPrice: orderType === 'LIMIT' ? parseFloat(draftRef.current.limitPrice) || null : null,
      sl: parseFloat(draftRef.current.sl) || null,
      tp: parseFloat(draftRef.current.tp) || null,
    });
    setOrder(null);
  };

  // Scalper mode (Phase 21B): a chart click while enabled opens a floating
  // quick-order ticket anchored near the click, using the chart's own
  // native click subscription (TVChartEvents.js's onClick — separate from
  // the drawing overlay's pointer handling, so this can never interfere
  // with drawing placement). Gated on tool === 'cursor' so a click while a
  // drawing tool is selected still places the drawing instead of opening a
  // ticket. `payload.price` comes straight from the clicked bar's own
  // close (Lightweight Charts' crosshair payload) — never a fabricated
  // bid/ask.
  const handleScalperClick = (panel, payload) => {
    if (!scalperEnabled || tool !== 'cursor' || !payload) return;
    if (tradingBlockedReason || ruleBlockedReason) return;
    const container = chartsRef.current[panel]?.getContainer?.();
    if (!container || payload.x == null || payload.y == null) return;
    const rect = container.getBoundingClientRect();
    const price = payload.price ?? panelPrice(panel);
    if (!price) return;
    setScalperPopup({ panel, x: rect.left + payload.x, y: rect.top + payload.y, price });
  };

  const submitScalperOrder = (side, lots) => {
    if (!scalperPopup) return;
    const { panel, price } = scalperPopup;
    const inst = instruments[panel];
    if (!inst) return;
    if (tradingBlockedReason || ruleBlockedReason) {
      TradingStore.notify(`Trading blocked — ${tradingBlockedReason || ruleBlockedReason}`, 'error');
      setScalperPopup(null);
      return;
    }
    const orderChain = chains[inst.underlying] || null;
    TradingStore.placeOrder({
      exchange: inst.exchange,
      token: inst.token,
      symbol: inst.symbol,
      underlying: inst.underlying || inst.symbol,
      kind: inst.chartMode === 'strike' ? 'option' : 'future',
      side,
      lots: Number(lots) || 1,
      lotSize: orderChain?.lot || undefined,
      signalPrice: price,
      orderType: 'MARKET',
      limitPrice: null,
      sl: null,
      tp: null,
    });
    setScalperPopup(null);
  };

  useEffect(() => {
    const root = rootsRef.current[activeKey];
    root?.setTool(tool);
  }, [tool, activeKey]);

  useEffect(() => {
    Object.values(rootsRef.current).forEach((root) => root?.configureSnap({ magnet, mode: 'ohlc' }));
  }, [magnet]);

  // Real live ticks → the current bucket's candle on each panel. Ticks come
  // from the SAME feed BuySellOverlay/InstrumentCard display: LiveQuoteFeed
  // polls the relay /api/health every 2s and pushes real index spot into the
  // PriceBus, and option-chain LTPs mirror in from useMarketData's 1.5s poll
  // for strike charts. Each tick bucketed with the same floor(tick/seconds)
  // logic the history aggregation uses (candleAggregator.aggregateTick) and
  // applied via TVChart.updateCandle: same bucket → in-place close/high/low;
  // rolled bucket (market just opened a new period) → fresh candle at the
  // LTP; stale/earlier ticks ignored. Gated by IS_MARKET_OPEN — closed
  // sessions have no fresh relay values, so no candle moves on its own.
  useEffect(() => {
    if (!live) return undefined;
    const secondsFor = (interval) => ({
      ONE_MINUTE: 60, THREE_MINUTE: 180, FIVE_MINUTE: 300,
      FIFTEEN_MINUTE: 900, ONE_HOUR: 3600, FOUR_HOUR: 14400, ONE_DAY: 86400,
    }[interval] || 300);
    const off = PriceBus.onAll((token, quote) => {
      if (!IS_MARKET_OPEN()) return;
      const ltp = quote?.ltp;
      if (ltp == null || !Number.isFinite(Number(ltp))) return;
      const tokenStr = String(token);
      panelKeys.forEach((key) => {
        const chart = chartsRef.current[key];
        const inst = instruments[key];
        if (!chart || !inst || String(inst.token) !== tokenStr) return;
        // A symbol/timeframe switch is mid-flight: the candles still
        // installed on `chart` belong to the PREVIOUS identity, not `inst`.
        // Grafting this tick onto that stale last bar would splice the new
        // symbol's price into the old symbol's candle (the exact reported
        // bug — a candle whose range suddenly spans two different
        // instruments' price levels, wrecking autoscale). Wait for the
        // in-flight fetch to finish and install real candles instead.
        if (!chart.isCandlesReady?.()) return;
        const last = chart.getLastCandle();
        if (!last) return;
        const close = Number(Number(ltp).toFixed(2));
        const bt = Math.floor(Date.now() / 1000 / secondsFor(intervals[key])) * secondsFor(intervals[key]);
        if (bt < last.time) return; // stale tick from an already-closed bucket
        if (bt === last.time) {
          chart.updateCandle({ ...last, high: Math.max(last.high, close), low: Math.min(last.low, close), close });
        } else {
          chart.updateCandle({ time: bt, open: close, high: close, low: close, close });
        }
      });
    });
    return off;
  }, [live, panelKeys, instruments, intervals]);

  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape') { setMenu(null); setProperties(null); setFlyout(null); setChainPanel(null); setOrder(null); setAlertsOpen(false); setObjectsOpen(false); setScalperPopup(null); } };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const overlayProps = (chart) => ({
    snap: { magnet, mode: 'ohlc' },
    activeRef: { current: false },
    onReady: (root) => {
      rootsRef.current[chart.key] = root;
      objectsApiRef.current = root;
      root.setActive(true);
      setCounts((prev) => ({ ...prev, [chart.key]: root.getDrawings().length }));
      root.bus.on('drawings:changed', (list) => setCounts((prev) => ({ ...prev, [chart.key]: list.length })));
    },
    onSelectionChange: (ids) => setSelectedCount((prev) => ({ ...prev, [chart.key]: ids.length })),
    onContextMenu: (payload) => setMenu({ chart: chart.key, ...payload }),
    onProperties: (payload) => setProperties(payload ? { chart: chart.key, ...payload } : null),
  });

  const menuDrawing = menu?.id ? rootsRef.current[menu.chart]?.getDrawings().find((d) => d.id === menu.id) || null : null;
  const propertiesDrawing = properties?.id ? rootsRef.current[properties.chart]?.getDrawings().find((d) => d.id === properties.id) || null : null;
  const flyoutDrawing = flyout?.id ? rootsRef.current[flyout.chart]?.getDrawings().find((d) => d.id === flyout.id) || null : null;

  const runMenuAction = (action) => {
    const root = rootsRef.current[menu.chart];
    if (!root) return;
    const interaction = root.getInteraction();
    const id = menu?.id || null;
    if (action === 'properties' && id) setProperties({ chart: menu.chart, id });
    else if (action === 'duplicate') interaction?.duplicate();
    else if (action === 'copy') interaction?.copy();
    else if (action === 'paste') interaction?.paste();
    else if (action === 'delete') interaction?.delete();
    else if (action === 'lock' && id) (menuDrawing?.locked ? interaction?.unlock([id]) : interaction?.lock([id]));
    else if (action === 'hide' && id) interaction?.hide([id]);
    else if (action === 'front' && id) interaction?.zMove(id, 'front');
    else if (action === 'back' && id) interaction?.zMove(id, 'back');
    else if (action === 'forward' && id) interaction?.zMove(id, 'forward');
    else if (action === 'backward' && id) interaction?.zMove(id, 'backward');
    else if (action === 'clear') interaction?.clearAll();
    else if (action.startsWith('zone') && id) {
      const key = action === 'zoneExtendLeft' ? 'extendLeft' : action === 'zoneExtendRight' ? 'extendRight' : action === 'zoneShowLabel' ? 'showLabel' : 'showPrice';
      interaction?.updateStyle(id, { [key]: menuDrawing?.style?.[key] === false });
    }
    else if (action === 'channelDash' && id) interaction?.updateStyle(id, { dash: !menuDrawing?.style?.dash });
    else if (action === 'channelArrow' && id) interaction?.updateStyle(id, { arrow: !menuDrawing?.style?.arrow });
    else if (action === 'positionFlip' && id) interaction?.flipPosition(id);
    else if (action === 'positionShowLabels' && id) interaction?.updateStyle(id, { showLabels: menuDrawing?.style?.showLabels === false });
    else if (action === 'positionShowRR' && id) interaction?.updateStyle(id, { showRR: menuDrawing?.style?.showRR === false });
    else if (action === 'textAutoSizeReset' && id) interaction?.updateText(id, { autoSize: true });
    else if (action === 'textToggleSnap' && id) interaction?.updateText(id, { snapToCandle: menuDrawing?.text?.snapToCandle === false });
    else if (action === 'editPoints' && id) { root.setPointEdit(interaction?.togglePointEdit(id)); }
    else if (action === 'pointInsert' && id) interaction?.insertAnchorAt(id, menu.x, menu.y);
    else if (action === 'pointDelete' && id) interaction?.deleteAnchorAt(id, menu.x, menu.y);
    else if (action === 'pointSmooth' && id) interaction?.convertAnchorAt(id, menu.x, menu.y, true);
    else if (action === 'pointSharp' && id) interaction?.convertAnchorAt(id, menu.x, menu.y, false);
    setMenu(null);
  };

  const seedChart = (chartKey, root) => {
    const candles = root.getCandles();
    if (!candles?.length) return;
    const n = candles.length;
    const tail = (offset) => candles[Math.max(0, n - 1 - offset)];
    const c20 = tail(27); const c35 = tail(21); const c50 = tail(13);
    const c65 = tail(6); const c80 = tail(2); const c90 = tail(1);
    const mid = (a, b) => (a.price + b.price) / 2;
    const anchors = [];
    const mk = (drawingType, anchorPoints, style = {}, extra = {}) => {
      const drawing = {
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `seed-${Math.random().toString(36).slice(2, 10)}`,
        symbol: root.identity.symbol, timeframe: root.identity.timeframe,
        drawingType, anchorPoints, style, ...extra,
      };
      anchors.push(drawing);
    };
    mk('trend', [{ time: c20.time, price: c20.low }, { time: c80.time, price: c80.high }], { color: '#4d7cfe', lineWidth: 1.5 });
    mk('ray', [{ time: c35.time, price: c35.high }, { time: c65.time, price: c65.low }], { color: '#f5b93e', lineWidth: 1.2 });
    mk('hline', [{ time: c50.time, price: mid(c20, c50) }], { color: '#8a8f98', lineWidth: 1 });
    mk('extended', [{ time: c20.time, price: mid(c20, c80) * 0.998 }, { time: c80.time, price: mid(c20, c80) * 1.002 }], { color: '#a855f7', lineWidth: 1 });
    mk('rect', [{ time: c35.time, price: c80.high }, { time: c65.time, price: c50.low }], { color: '#22ab94', lineWidth: 1.5 });
    mk('parallelChannel', [{ time: c20.time, price: c20.low }, { time: c80.time, price: c80.low }, { time: c50.time, price: mid(c20, c50) }], { color: '#f23645', lineWidth: 1.2 });
    mk('fib', [{ time: c80.time, price: c80.low }, { time: c20.time, price: c20.high }], { color: '#4d7cfe', lineWidth: 1 });
    mk('longPosition', [{ time: c50.time, price: mid(c50, c80) }, { time: c50.time, price: mid(c50, c80) * 0.995 }, { time: c50.time, price: mid(c50, c80) * 1.005 }], { color: '#22ab94' }, { position: root.properties.defaultsFor('longPosition') });
    mk('text', [{ time: c65.time, price: c65.high }], { color: '#111827' }, { text: root.properties.defaultsFor('text') });
    mk('measure', [{ time: c20.time, price: c20.high }, { time: c35.time, price: c35.low }], { color: '#ef4444', lineWidth: 1.2 });
    anchors.forEach((drawing) => root.getInteraction().place(drawing));
    sessionStorage.setItem(`fd-seed-${root.chartKey}`, '1');
  };

  const probeStats = () => {
    const readLayers = (key) => {
      const layers = {};
      ['drawings', 'selection', 'handles', 'preview'].forEach((name) => {
        const c = document.querySelector(`[data-chart-key="${key}"] .fd-overlay-${name}`);
        const { data } = c.getContext('2d').getImageData(0, 0, c.width, c.height);
        let n = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n += 1;
        layers[name] = n;
      });
      return layers;
    };
    const stats = {};
    Object.entries(rootsRef.current).forEach(([key, root]) => {
      const canvas = document.querySelector(`[data-chart-key="${key}"] .fd-overlay-drawings`);
      if (!canvas) { stats[key] = 'no-canvas'; return; }
      try {
        const first = root.getDrawings()[0];
        let mapped = null;
        if (first) {
          const ts = root.viewport.tvChart.chart.timeScale();
          const range = ts.getVisibleLogicalRange();
          const lastC = root.getCandles().at(-1);
          const lastP = root.viewport.projection.anchorToPixel({ time: lastC?.time, price: lastC?.close });
          const p = root.viewport.projection.anchorToPixel(first.anchorPoints[0]);
          mapped = `anchor:${JSON.stringify(p)} nC:${root.getCandles().length} range:${range ? JSON.stringify({ f: Math.round(range.from), t: Math.round(range.to) }) : 'null'} lastP:${JSON.stringify(lastP)}`;
        }
        const layers = readLayers(key);
        const lastRender = root.renderer.debug?.lastRender ? `L:${root.renderer.debug.lastRender.count}/${root.renderer.debug.lastRender.painted} c:${root.renderer.debug.lastRender.firstColor} t:${root.renderer.debug.lastRender.firstType}` : 'L:none';
        const tp = root.getDrawings()[0] ? root.renderer.testPaint(root.getDrawings()[0]) : -1;
        const dbg = root.debug ? ` flushes:${root.debug.flushes} paints:${root.debug.paints} raf:${root.debug.rafFired} err:${root.debug.lastError ? String(root.debug.lastError).slice(0, 120) : 'none'}` : '';
        root.invalidate();
        setTimeout(() => {
          const after = readLayers(key);
          setPainted((prev) => ({ ...(prev || {}), [key]: `draw:${layers.drawings} ${lastRender} testOne:${tp} sel:${layers.selection} hand:${layers.handles} -> afterInvalidate draw:${after.drawings} sel:${after.selection}${dbg} ${mapped}` }));
        }, 800);
        stats[key] = `probe ${mapped}`;
      } catch (error) {
        stats[key] = `err:${error?.message || error}`;
      }
    });
    setPainted(stats);
  };

  // Hydrate every visible panel: restore saved drawings (once per mounted
  // root) BEFORE seeding demo content; seeding stays one-shot per tab session
  // via the fd-seed flag, which PaneManager's changeLayout clears for panels
  // that were removed so a re-added slot restores+seeds fresh.
  const hydrateAll = (attempt = 0) => {
    try {
      let pending = false;
      panelKeysRef.current.forEach((key) => {
        if (handledRoots.current.has(key)) return;
        const root = rootsRef.current[key];
        if (!root || !root.getCandles()?.length || !root.getDrawings) { pending = true; return; }
        // Claim BEFORE touching the root so concurrent hydrate passes (layout
        // switch + mount) never double-process a panel.
        handledRoots.current.add(key);
        if (root.getDrawings().length) return;
        // Persistence: drawings were saved to localStorage (OverlayRoot saves
        // on every change, mixing every symbol/timeframe ever drawn on this
        // panel into one chartKey bucket — see SerializationManager). Only
        // place the ones matching the panel's CURRENT symbol+timeframe scope
        // directly; stash the rest into the same in-session scope cache
        // switchDrawingScope() reads, so switching to their instrument/
        // timeframe later in this session still restores them instead of
        // dumping every saved drawing onto whatever loads first.
        if (!restoredRoots.current.has(root)) {
          const saved = root.serialization?.load?.() || [];
          if (saved.length) {
            restoredRoots.current.add(root);
            const curScope = drawingScopeFor({ symbol: instruments[key]?.symbol, timeframe: intervals[key] });
            const byScope = { ...(drawingsByInstrument.current[key] || {}) };
            saved.forEach((d) => {
              if (drawingScopeFor(d) === curScope) root.getInteraction()?.place(d);
              else { const s = drawingScopeFor(d); byScope[s] = [...(byScope[s] || []), d]; }
            });
            drawingsByInstrument.current[key] = byScope;
            return;
          }
        }
        // Demo content is one-shot per tab session: don't re-seed on reload.
        if (sessionStorage.getItem(`fd-seed-${root.chartKey}`)) return;
        seedChart(key, root);
      });
      if (pending && attempt < 40) { setTimeout(() => hydrateAll(attempt + 1), 250); return; }
      setSeedError(null);
    } catch (error) {
      setSeedError(String(error?.message || error));
      console.error('hydrate failed', error);
    }
  };

  useEffect(() => { hydrateAll(); }, []);
  useEffect(() => { const t = setTimeout(() => hydrateAll(), 900); const p = setTimeout(probeStats, 1600); return () => { clearTimeout(t); clearTimeout(p); }; }, [panelKeys]);

  const onSelectionBus = (chartKey, root) => {    root.bus.on('selection:changed', (ids) => {
      const rootNow = rootsRef.current[chartKey];
      if (ids.length === 1) {
        const drawing = rootNow?.getDrawings().find((d) => d.id === ids[0]);
        if (drawing && !isZoneType(drawing.drawingType) && !isStrokeType(drawing.drawingType) && !isTextType(drawing.drawingType) && !isPositionType(drawing.drawingType)) {
          const transform = rootNow.viewport.get();
          const points = drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
          if (points.length >= 2) {
            const xs = points.map((p) => p.x);
            const ys = points.map((p) => p.y);
            setFlyout({ chart: chartKey, x: (Math.min(...xs) + Math.max(...xs)) / 2, y: Math.min(...ys) - 8, id: ids[0] });
            return;
          }
        }
      }
      setFlyout(null);
    });
  };

  return (
    <main style={{
      height: '100vh', maxHeight: '100vh', overflow: 'hidden', boxSizing: 'border-box',
      background: 'var(--bg)', fontFamily: 'Inter, sans-serif',
      padding: 8, display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <TVChartHotkeys
        onBuy={() => openOrderPanel(activeKey, 'BUY')}
        onSell={() => openOrderPanel(activeKey, 'SELL')}
        setTool={setTool}
      />
      <LiveQuoteFeed baselineFor={(key) => chartsRef.current[key]?.getLastCandle?.()?.close ?? null} />
      <AlertNotifications />
      <header style={{
        display: 'flex', alignItems: 'center', gap: 6,
        height: 48, padding: '0 8px', flexShrink: 0,
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
      }}>
        {/* Brand */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          paddingRight: 10, marginRight: 2, flexShrink: 0,
          borderRight: '1px solid var(--line2)',
        }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6,
            background: 'var(--grad)', display: 'grid', placeItems: 'center',
            fontSize: 10, color: '#fff', fontWeight: 700, letterSpacing: '-0.02em',
          }}>
            FD
          </div>
        </div>

        {/* Symbol search (Phase 21B, Section 2A) — replaces the static
            symbol/exchange label with a real search over the existing
            watchlist/market-data instrument universe. */}
        <TVSymbolSearch
          activeSymbol={instruments[activeKey].symbol}
          optionChainRows={optionChainRows}
          onSelect={(item) => {
            const next = watchItemToInstrument(item);
            if (next) switchInstrument(activeKey, next);
          }}
        />

        {/* Layout switcher */}
        <div style={{ display: 'flex', gap: 2, alignItems: 'center', background: 'var(--bg2)', borderRadius: 5, padding: 2, flexShrink: 0 }} title="Chart layout">
          {[
            { n: 1, label: '1 chart', Icon: Square },
            { n: 2, label: '2 charts', Icon: Columns2 },
            { n: 3, label: '3 charts', Icon: Columns3 },
            { n: 4, label: '4 charts', Icon: Columns4 },
          ].map(({ n, label, Icon }) => (
            <button
              key={n}
              title={label}
              onClick={() => changeLayout(n)}
              style={layout === n ? iconActive : iconBtn}
            >
              <Icon size={12} />
            </button>
          ))}
        </div>

        {/* Timeframe (Phase 21B, Section 2B) — one compact dropdown
            replacing the always-visible 1m/5m/15m/1H/1D row. Calls the SAME
            switchTimeframe(panel, relay) the row called — every Phase 21A
            transition guarantee is unchanged. */}
        <TVTimeframeDropdown
          timeframes={QUICK_TIMEFRAMES}
          active={intervals[activeKey]}
          onSelect={(relay) => switchTimeframe(activeKey, relay)}
          label={`Timeframe — ${instruments[activeKey].symbol}`}
        />

        <span style={{ width: 1, height: 20, background: 'var(--line2)', flexShrink: 0, margin: '0 4px' }} />

        {/* Drawing / edit utilities — grouped with the view controls (layout,
            timeframe) they act alongside, not buried in the account cluster
            on the far right (Phase 21C, Section 8: every control needs a
            clear visual role). */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <button style={iconBtn} title="Undo (Ctrl+Z)" onClick={() => rootsRef.current[activeKey]?.undo()}><Undo2 size={13} /></button>
          <button style={iconBtn} title="Redo" onClick={() => rootsRef.current[activeKey]?.redo()}><Redo2 size={13} /></button>
        </div>

        <span style={{ flex: 1 }} />

        {/* Center-right — primary trading actions (Phase 21C, Section 8):
            Option Chain and Scalper are the terminal's two headline
            interactions, so they sit together, visually distinct from both
            the view controls on the left and the account/session/display
            utilities on the right. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            style={chainPanel != null
              ? { ...toolStyle, background: 'var(--brand)', color: '#052018', fontWeight: 700, height: 28 }
              : { ...toolStyle, border: '1px solid var(--line2)', fontWeight: 700, height: 28 }}
            title={`Option Chain — ${instruments[activeKey].underlying}`}
            aria-label="Toggle option chain"
            aria-expanded={chainPanel != null}
            onClick={() => setChainPanel((v) => {
              if (v != null) return null;
              setScalperPopup(null);
              const active = instruments[activeKey]?.underlying;
              setChainUnderlying(active === 'BANKNIFTY' ? 'BANKNIFTY' : 'NIFTY');
              return activeKey;
            })}
          >
            Option Chain
          </button>
          <button
            style={scalperEnabled
              ? { ...toolStyle, background: 'rgba(34,197,139,.16)', borderColor: 'rgba(34,197,139,.4)', color: 'var(--green)', fontWeight: 700, height: 28 }
              : { ...toolStyle, border: '1px solid var(--line2)', fontWeight: 700, height: 28 }}
            title="Scalper — click the chart to open a quick Buy/Sell ticket"
            aria-pressed={scalperEnabled}
            onClick={() => { setScalperEnabled((v) => !v); setScalperPopup(null); }}
          >
            <Zap size={12} /> Scalper
          </button>
        </div>

        <span style={{ flex: 1 }} />

        {/* Right cluster — account / session / display. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {selectedAccount && (
            <>
              <div ref={accountPanelRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setAccountPanelOpen((v) => !v)}
                  title="Account context"
                  aria-expanded={accountPanelOpen}
                  style={{ ...toolStyle, border: '1px solid var(--line2)', height: 24, fontWeight: 700 }}
                >
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: accountLifecycle?.isTradeable ? 'var(--green)' : 'var(--red)',
                  }} />
                  {selectedAccount.login_id || 'Account'}
                </button>
                {accountPanelOpen && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 6, width: 250, zIndex: 200,
                    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
                    boxShadow: '0 8px 24px rgba(0,0,0,.3)', padding: '10px 12px', fontFamily: 'Inter, sans-serif',
                  }}>
                    <AccountPanelRow label="Account" value={selectedAccount.login_id || '—'} />
                    <AccountPanelRow label="Program" value={getPlanTypeLabel(selectedPlan?.plan_type)} />
                    <AccountPanelRow label="Phase" value={getPhaseDisplayLabel(selectedPlan?.plan_type, selectedAccount.phase)} />
                    <AccountPanelRow label="Status" value={accountLifecycle?.statusLabel || '—'} accent={accountLifecycle?.isTradeable ? 'var(--green)' : 'var(--red)'} />
                    <AccountPanelRow label="Capital" value={accountFinance?.capital != null ? fmtINR(accountFinance.capital) : '—'} />
                    <div style={{ height: 1, background: 'var(--line2)', margin: '6px 0' }} />
                    <AccountPanelRow label="Daily DD limit" value={accountRisk?.drawdown.dailyDrawdownLimitPct != null ? `${accountRisk.drawdown.dailyDrawdownLimitPct}%` : '—'} />
                    <AccountPanelRow
                      label="Max DD"
                      value={accountRisk?.drawdown.maxDrawdownLimitPct != null
                        ? `${(accountRisk.drawdown.observedMaxDrawdownPct ?? 0).toFixed(1)}% / ${accountRisk.drawdown.maxDrawdownLimitPct}%`
                        : '—'}
                      accent={accountRisk?.drawdown.maxDrawdownLimitBreached ? 'var(--red)' : undefined}
                    />
                    <AccountPanelRow
                      label="Profit target"
                      value={accountRisk?.target.profitTargetPct != null ? `${accountRisk.target.profitTargetPct}%` : 'No evaluation target'}
                    />
                    <AccountPanelRow
                      label="Risk status"
                      value={!accountRisk ? '—' : accountRisk.evaluation.breached ? 'Breached' : accountRisk.evaluation.warnings.length ? 'Warning' : 'Healthy'}
                      accent={!accountRisk ? undefined : accountRisk.evaluation.breached ? 'var(--red)' : accountRisk.evaluation.warnings.length ? 'var(--gold)' : 'var(--green)'}
                    />
                    {tradingBlockedReason && (
                      <div style={{ marginTop: 8, padding: '6px 8px', borderRadius: 6, background: 'rgba(239,83,80,0.1)', color: 'var(--red)', fontSize: 10, fontWeight: 600 }}>
                        Trading unavailable — {tradingBlockedReason}
                      </div>
                    )}
                    <SimRiskSection rules={accountRules} capital={accountFinance?.capital} />
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line2)', fontSize: 9.5, color: 'var(--dim)', lineHeight: 1.5 }}>
                      Account, plan and rules are real. Market data is live where available. Orders, positions and P&L in this terminal are simulated — no broker or exchange order is sent.
                    </div>
                  </div>
                )}
              </div>
              <span style={{ width: 1, height: 20, background: 'var(--line2)', flexShrink: 0, margin: '0 2px' }} />
            </>
          )}
          <span
            role="note"
            title="Practice simulator. Orders, fills, positions and P&L here are simulated and stored only in this browser — nothing is sent to a broker or exchange, and none of it affects your evaluation or funded account. Prices are from a delayed/indicative market-data feed."
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, padding: '0 8px',
              borderRadius: 99, background: 'rgba(245,185,62,0.12)', border: '1px solid rgba(245,185,62,0.3)',
              color: 'var(--gold)', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', cursor: 'help', flexShrink: 0,
            }}
          >
            <Info size={11} aria-hidden="true" /> SIM
          </span>
          <span style={{ width: 1, height: 20, background: 'var(--line2)', flexShrink: 0, margin: '0 2px' }} />

          <button
            onClick={() => setLive((v) => !v)}
            title="Live ticks"
            style={{
              display: 'flex', alignItems: 'center', gap: 5, height: 24, padding: '0 8px',
              borderRadius: 99, border: 'none', cursor: 'pointer',
              background: live ? 'rgba(34,197,139,.13)' : 'rgba(240,82,95,.13)',
              color: live ? 'var(--green)' : 'var(--red)',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
            {live ? 'LIVE' : 'PAUSED'}
          </button>
          <button style={alertsOpen ? iconActive : iconBtn} title="Price / drawing / indicator alerts" onClick={() => setAlertsOpen((v) => !v)}><Bell size={13} /></button>
          <button style={objectsOpen ? iconActive : iconBtn} title="Drawing object tree" onClick={() => setObjectsOpen((v) => !v)}><ListTree size={13} /></button>
          <button style={iconBtn} title="Seed demo drawings on all charts" onClick={hydrateAll}><Sprout size={13} /></button>

          <span style={{ width: 1, height: 20, background: 'var(--line2)', flexShrink: 0, margin: '0 2px' }} />

          <button style={dark ? iconActive : iconBtn} title="Toggle dark / light theme" onClick={() => setDark((v) => !v)}>
            {dark ? <Moon size={13} /> : <Sun size={13} />}
          </button>
          <button
            style={iconBtn}
            title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            onClick={() => {
              if (document.fullscreenElement) { document.exitFullscreen(); } else { document.documentElement.requestFullscreen?.(); }
            }}
          >
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0 }}>
        <div title="ESC cancel · SHIFT constrain/multi · ALT duplicate · CTRL no-snap" style={{ display: 'flex' }}>
          <TVLeftToolbar
            tool={tool}
            setTool={setTool}
            magnet={magnet}
            onToggleMagnet={() => setMagnet((v) => !v)}
            onClearAll={() => rootsRef.current[activeKey]?.clearAll()}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 0, minHeight: 0 }}>
          <div style={{ display: 'grid', gap: 8, flex: 1, minHeight: 0, ...LAYOUT_GRID[layout] }}>
            {panelKeys.map((key) => {
              const chart = PANEL_DEF[key];
              return (
                <div
                  key={key}
                  data-chart-key={key}
                  style={{
                  position: 'relative',
                  minHeight: 0, minWidth: 0, overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                  border: activeKey === key ? '1px solid var(--blue)' : '1px solid var(--border)',
                  borderRadius: 8, padding: 6,
                }}
                  onMouseDown={() => {
                    setActiveKey(key);
                    Object.entries(rootsRef.current).forEach(([k, root]) => root?.setActive(k === key));
                  }}
                >
                  <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' }}>
                    <InstrumentCard
                      chart={instruments[key]}
                      getCandles={() => chartsRef.current[key]?.getCandles?.() || []}
                      ready={!panelLoading[key]}
                    />
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10.5, color: 'var(--muted)', flexShrink: 0 }}>
                      {compare[key] && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <span style={{ fontWeight: 600, color: 'var(--gold)' }}>vs {compare[key]}</span>
                          <button title="Remove compare" style={{ ...toolStyle, padding: '0 4px', fontSize: 10 }} onClick={() => clearCompare(key)}>×</button>
                        </span>
                      )}
                      <span>{counts[key]} objects · {selectedCount[key]} selected</span>
                      {instruments[key].chartMode === 'strike' && (
                        <button title={`Back to ${chart.label} index`} style={toolStyle} onClick={() => switchInstrument(key, indexInstrument(chart))}>Index</button>
                      )}
                    </span>
                  </div>
                  <BuySellOverlay
                    exchange={instruments[key].exchange}
                    token={instruments[key].token}
                    symbol={instruments[key].symbol}
                    underlying={instruments[key].underlying}
                    kind={instruments[key].chartMode === 'strike' ? 'option' : 'future'}
                    onOrder={(side) => openOrderPanel(key, side)}
                  />
                  {(positionsSlice || []).filter((p) => String(p.token) === String(instruments[key].token)).map((p) => (
                    <EntryBar key={p.id} chart={chartsRef.current[key]} position={p} />
                  ))}
                  <TVChartContainer
                    exchange={instruments[key].exchange}
                    token={instruments[key].token}
                    symbol={instruments[key].symbol}
                    interval={intervals[key]}
                    indicators={indicators[key]}
                    theme={dark ? TV_DARK_THEME : TV_LIGHT_THEME}
                    chartKey={`tv-overlay-${key}`}
                    overlay={overlayProps(chart)}
onReady={(chartApi, root) => {
                      chartsRef.current[key] = chartApi;
                      root?.setCandles(chartApi.getCandles());
                      onSelectionBus(key, root);
                    }}
                    onError={(error) => console.error(key, error)}
                    onLoadingChange={(loading) => setPanelLoading((prev) => (prev[key] === loading ? prev : { ...prev, [key]: loading }))}
                    onChartClick={(payload) => handleScalperClick(key, payload)}
                    style={{ width: '100%', flex: 1, minHeight: 0 }}
                  />
                  {propertiesDrawing && properties?.chart === key && (
                    <PropertiesPanel
                      drawing={propertiesDrawing}
                      onStyle={(patch) => rootsRef.current[properties.chart]?.getInteraction()?.updateStyle(properties.id, patch)}
                      onFib={(patch) => rootsRef.current[properties.chart]?.getInteraction()?.updateFib(properties.id, patch)}
                      onPosition={(patch) => rootsRef.current[properties.chart]?.getInteraction()?.updatePosition(properties.id, patch)}
                      onText={(patch) => rootsRef.current[properties.chart]?.getInteraction()?.updateText(properties.id, patch)}
                      onTextLive={(patch) => rootsRef.current[properties.chart]?.getInteraction()?.updateTextLive(properties.id, patch)}
                      onFlip={() => rootsRef.current[properties.chart]?.getInteraction()?.flipPosition(properties.id)}
                      onLockToggle={(locked) => (locked ? rootsRef.current[properties.chart]?.getInteraction()?.lock([properties.id]) : rootsRef.current[properties.chart]?.getInteraction()?.unlock([properties.id]))}
                      onPointEdit={(id) => { const root = rootsRef.current[properties.chart]; root?.setPointEdit(root.getInteraction()?.togglePointEdit(id)); }}
                      onClose={() => setProperties(null)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
        {watchlistOpen ? (
          <div style={{
            width: 300, flexShrink: 0, minHeight: 0,
            border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)',
          }}>
            <Watchlist
              items={displayedItems}
              prices={prices}
              stockQuotes={stockQuotes}
              optionChainRows={optionChainRows}
              activeToken={instruments[activeKey].token}
              activeInstrument={instruments[activeKey]}
              getActiveCandles={() => chartsRef.current[activeKey]?.getCandles?.() || []}
              onSelect={onSelectWatchlistItem}
              onAdd={onAddWatchlist}
              onRemove={onRemoveWatchlist}
              onClose={() => setWatchlistOpen(false)}
            />
          </div>
        ) : (
          <div style={{
            width: 32, flexShrink: 0, minHeight: 0,
            border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 6,
          }}>
            <button
              aria-label="Expand watchlist"
              title="Expand watchlist"
              onClick={() => setWatchlistOpen(true)}
              style={iconBtn}
            >
              <ChevronLeft size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Bottom dock — account / positions / order book from TradingStore
          (same store BuySellOverlay writes to). Mirrors the old terminal's
          bottom panel: tabbed sections for AccountSummary, PositionManager,
          and the OrderBook depth ladder + OrderManager.

          Phase 21B, Section 3: collapsible, default COLLAPSED. This is a
          pure CSS/layout-state change — the panel-grid flex item above
          (flex: 1, minHeight: 0) automatically grows into whatever height
          this dock gives up, and each chart's own ResizeObserver
          (TVChartResize.js, wired since chart-tv's first version) already
          picks up that new container size and calls chart.resize() on its
          own. No new resize code, no chart recreation. */}
      <div style={{
        flexShrink: 0,
        height: bottomDockOpen ? 280 : 34,
        transition: 'height .16s ease',
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--surface)',
        fontFamily: 'Inter, sans-serif',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '9px 16px',
          borderBottom: bottomDockOpen ? '1px solid var(--border)' : 'none',
          background: 'var(--bg2)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', borderRadius: 6, padding: 2, flexWrap: 'wrap' }}>
            {[['positions', 'Positions'], ['orders', 'Orders'], ['history', 'Trade History'], ['account', 'Account'], ['pnl', 'P&L'], ['margin', 'Margin']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => { setDockTab(id); if (!bottomDockOpen) setBottomDockOpen(true); }}
                style={dockTab === id && bottomDockOpen ? { ...tfBtnActive, height: 26 } : { ...tfBtn, height: 26 }}
              >
                {label}
              </button>
            ))}
          </div>
          <span style={{ flex: 1 }} />
          <button
            onClick={() => setBottomDockOpen((v) => !v)}
            title={bottomDockOpen ? 'Collapse dock' : 'Expand dock'}
            aria-expanded={bottomDockOpen}
            aria-label={bottomDockOpen ? 'Collapse account dock' : 'Expand account dock'}
            style={iconBtn}
          >
            {bottomDockOpen ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
        </div>
        <div style={{ display: bottomDockOpen ? 'flex' : 'none', flex: 1, minHeight: 0, overflow: 'auto' }}>
          {dockTab === 'positions' && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <PositionManager />
            </div>
          )}
          {dockTab === 'orders' && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 90, flexShrink: 0, borderBottom: '1px solid var(--border)', overflow: 'auto' }}>
                <OrderBook
                  token={instruments[activeKey].token}
                  kind={instruments[activeKey].chartMode === 'strike' ? 'option' : 'future'}
                  showBidAsk={false}
                />
              </div>
              <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                <OrderManager />
              </div>
            </div>
          )}
          {dockTab === 'history' && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <TradeHistory />
            </div>
          )}
          {dockTab === 'account' && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <AccountManager onLogout={() => {}} onOpenSection={() => {}} />
            </div>
          )}
          {dockTab === 'pnl' && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', gap: 10, padding: '12px 14px' }}>
              <DockMetric label="Unrealized P&L" value={fmtINR(accountSlice.unrealized)} accent={accountSlice.unrealized >= 0 ? 'var(--green)' : 'var(--red)'} />
              <DockMetric label="Realized P&L" value={fmtINR(accountSlice.realized)} accent={accountSlice.realized >= 0 ? 'var(--green)' : 'var(--red)'} />
              <DockMetric label="Daily P&L" value={fmtINR(accountSlice.dailyPnl)} accent={accountSlice.dailyPnl >= 0 ? 'var(--green)' : 'var(--red)'} />
              <DockMetric label="Open Positions" value={accountSlice.openPositions ?? '—'} />
              <DockMetric label="Open Orders" value={accountSlice.openOrders ?? '—'} />
            </div>
          )}
          {dockTab === 'margin' && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', gap: 10, padding: '12px 14px' }}>
              <DockMetric label="Available Margin" value={fmtINR(accountSlice.available)} />
              <DockMetric label="Used Margin" value={fmtINR(accountSlice.usedMargin)} />
              <DockMetric label="Free Margin" value={fmtINR(accountSlice.free)} />
              <DockMetric label="Wallet Balance" value={fmtINR(accountSlice.cash)} />
              <DockMetric label="Equity" value={fmtINR(accountSlice.equity)} />
            </div>
          )}
        </div>
      </div>

      {/* Alerts drawer — same AlertManager the old terminal uses; triggered
          alerts surface through the already-mounted AlertNotifications. */}
      {alertsOpen && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 760, maxWidth: '94vw',
          background: 'var(--surface)', borderLeft: '1px solid var(--border)', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          zIndex: 120, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <strong style={{ fontSize: 12, color: 'var(--text)' }}>Alerts — {instruments[activeKey].symbol}</strong>
            <button onClick={() => setAlertsOpen(false)} style={toolStyle}>close</button>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <AlertManager
              activePane={{
                id: activeKey,
                token: instruments[activeKey].token,
                symbol: instruments[activeKey].symbol,
                exchange: instruments[activeKey].exchange,
              }}
              chartKey={`tv-overlay-${activeKey}`}
            />
          </div>
        </div>
      )}

      {/* Objects tree drawer — DrawingManagerPanel reads the active overlay
          root's public API (same component used on /portal/terminal). */}
      {objectsOpen && (
        <div style={{
          position: 'fixed', top: 0, right: 0, bottom: 0, width: 320, maxWidth: '92vw',
          background: 'var(--surface)', borderLeft: '1px solid var(--border)', boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
          zIndex: 120, display: 'flex', flexDirection: 'column',
        }}>
          <DrawingManagerPanel apiRef={objectsApiRef} onClose={() => setObjectsOpen(false)} />
        </div>
      )}

      {/* Status bar — real relay health/latency from StatusBar's own polls. */}
      <StatusBar data={{ status: relayStatus }} />

      {scalperPopup && instruments[scalperPopup.panel] && (
        <ScalperTicket
          x={scalperPopup.x}
          y={scalperPopup.y}
          symbol={instruments[scalperPopup.panel].symbol}
          price={scalperPopup.price}
          lotSize={chains[instruments[scalperPopup.panel].underlying]?.lot || 1}
          onSubmit={submitScalperOrder}
          onClose={() => setScalperPopup(null)}
        />
      )}

      {order && instruments[order.key] && (
        <OrderPanel
          key={`${order.key}-${order.side}`}
          open
          selection={{
            lastPrice: panelPrice(order.key),
            underlying: instruments[order.key].underlying || instruments[order.key].symbol,
            strike: instruments[order.key].selection?.strike || '',
            type: instruments[order.key].selection?.type || (instruments[order.key].chartMode === 'strike' ? '' : 'FUT'),
          }}
          chain={chains[instruments[order.key].underlying] || null}
          side={order.side}
          lots={draftRef.current.lots}
          setLots={(v) => { draftRef.current = { ...draftRef.current, lots: v }; }}
          sl={draftRef.current.sl}
          setSl={(v) => { draftRef.current = { ...draftRef.current, sl: v }; }}
          tp={draftRef.current.tp}
          setTp={(v) => { draftRef.current = { ...draftRef.current, tp: v }; }}
          orderType={draftRef.current.orderType}
          setOrderType={(v) => { draftRef.current = { ...draftRef.current, orderType: v }; }}
          limitPrice={draftRef.current.limitPrice}
          setLimitPrice={(v) => { draftRef.current = { ...draftRef.current, limitPrice: v }; }}
          submitting={orderSubmitting}
          onClose={() => setOrder(null)}
          onSubmit={submitOrder}
        />
      )}

      {menu && (
        <ChartContextMenu
          x={menu.x} y={menu.y} id={menu.id}
          locked={menuDrawing?.locked} hidden={menuDrawing?.hidden}
          zone={menuDrawing && isZoneType(menuDrawing.drawingType) ? { extendLeft: menuDrawing.style?.extendLeft !== false, extendRight: menuDrawing.style?.extendRight !== false, showLabel: menuDrawing.style?.showLabel !== false, showPrice: menuDrawing.style?.showPrice !== false } : null}
          channel={menuDrawing && isChannelType(menuDrawing.drawingType) ? { extendLeft: menuDrawing.style?.extendLeft !== false, extendRight: menuDrawing.style?.extendRight !== false, dash: Boolean(menuDrawing.style?.dash), arrow: Boolean(menuDrawing.style?.arrow) } : null}
          stroke={menuDrawing && isStrokeType(menuDrawing.drawingType) ? { editing: rootsRef.current[menu.chart]?.getPointEditId() === menuDrawing.id, points: menuDrawing.anchorPoints.length } : null}
          position={menuDrawing && isPositionType(menuDrawing.drawingType) ? { showLabels: menuDrawing.style?.showLabels !== false, showRR: menuDrawing.style?.showRR !== false } : null}
          text={menuDrawing && isTextType(menuDrawing.drawingType) ? { autoSize: menuDrawing.text?.autoSize !== false, snapToCandle: menuDrawing.text?.snapToCandle !== false } : null}
          hasClipboard={Boolean(rootsRef.current[menu.chart]?.getInteraction()?.clipboard?.length)}
          bounds={menu.bounds}
          onAction={runMenuAction}
          onClose={() => setMenu(null)}
        />
      )}
      {flyout && flyoutDrawing && (
        <DrawingFlyout
          drawing={flyoutDrawing}
          position={{ x: flyout.x, y: flyout.y }}
          onStyle={(patch) => rootsRef.current[flyout.chart]?.getInteraction()?.updateStyle(flyout.id, patch)}
          onDelete={() => { rootsRef.current[flyout.chart]?.getInteraction()?.delete(); setFlyout(null); }}
          onClose={() => setFlyout(null)}
        />
      )}
      <OptionChainModal
        open={chainPanel != null}
        chain={chainPanel ? chains[chainUnderlying] : null}
        status={chainPanel ? (chainUnderlying === 'BANKNIFTY' ? chainB.status : chainN.status) : 'checking'}
        onRetry={() => (chainUnderlying === 'BANKNIFTY' ? chainB.refreshChain() : chainN.refreshChain())}
        underlying={chainUnderlying}
        onUnderlyingChange={setChainUnderlying}
        selection={chainPanel ? instruments[chainPanel].selection : null}
        onSelect={(row, type) => {
          const panel = chainPanel;
          const inst = optionRowToInstrument(row, type);
          if (!panel || !inst) return;
          switchInstrument(panel, inst);
          setChainPanel(null);
        }}
        onBuy={(row, type) => {
          const panel = chainPanel;
          const inst = optionRowToInstrument(row, type);
          if (!panel || !inst) return;
          switchInstrument(panel, inst);
          setChainPanel(null);
          openOrderPanel(panel, 'BUY');
        }}
        onSell={(row, type) => {
          const panel = chainPanel;
          const inst = optionRowToInstrument(row, type);
          if (!panel || !inst) return;
          switchInstrument(panel, inst);
          setChainPanel(null);
          openOrderPanel(panel, 'SELL');
        }}
        onClose={() => setChainPanel(null)}
      />
    </main>
  );
}
