'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import TVChartContainer from '@/components/chart-tv/TVChartContainer';
import { TV_TIMEFRAME_LABELS, resolveRelayInterval } from '@/components/chart-tv/TVChartSeries';
import ChartContextMenu from '@/components/chart/ui/ChartContextMenu';
import PropertiesPanel from '@/components/chart/ui/PropertiesPanel';
import DrawingFlyout from '@/components/chart/ui/DrawingFlyout';
import TVLeftToolbar from '@/components/chart-tv/TVLeftToolbar';
import LiveQuoteFeed from '@/components/chart-tv/LiveQuoteFeed';
import BuySellOverlay from '@/components/chart-tv/BuySellOverlay';
import InstrumentCard from '@/components/chart-tv/InstrumentCard';
import OptionChainModal from '@/components/terminal/OptionChainModal';
import IndicatorMenu from '@/components/terminal/IndicatorMenu';
import AlertNotifications from '@/components/terminal/AlertNotifications';
import AccountManager from '@/components/terminal/AccountManager';
import PositionManager from '@/components/terminal/PositionManager';
import Watchlist from '@/components/terminal/Watchlist';
import OrderPanel from '@/components/terminal/OrderPanel';
import OrderBook from '@/components/terminal/OrderBook';
import OrderManager from '@/components/terminal/OrderManager';
import AlertManager from '@/components/terminal/AlertManager';
import StatusBar from '@/components/terminal/StatusBar';
import DrawingManagerPanel from '@/components/chart/ui/DrawingManagerPanel';
import TVChartHotkeys from '@/components/chart-tv/TVChartHotkeys';
import { TV_DARK_THEME, TV_LIGHT_THEME } from '@/components/chart-tv/TVChartTheme';
import { INDEX_TOKEN } from '@/components/terminal/constants';
import { marketData } from '@/services/marketData';
import { supabase } from '@/lib/supabaseClient';
import { useMarketData } from '@/hooks/useMarketData';
import { PriceBus } from '@/stores/PriceBus';
import { TradingStore } from '@/stores/TradingStore';
import { isZoneType, isChannelType, isStrokeType, isPositionType, isTextType } from '@/components/chart/drawing/DrawingDefinitions';

const CHARTS = [
  { key: 'a', label: 'NIFTY', token: '99926000', underlying: 'NIFTY' },
  { key: 'b', label: 'BANKNIFTY', token: '99926009', underlying: 'BANKNIFTY' },
];

const toolStyle = { padding: '5px 10px', fontSize: 11, fontFamily: 'Inter, sans-serif', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--muted)', cursor: 'pointer' };
const toolActive = { ...toolStyle, background: '#22ab94', border: '1px solid #22ab94', color: '#ffffff' };

const QUICK_TIMEFRAMES = ['1m', '5m', '15m', '1h', '1D'].map((tv) => ({ tv, relay: resolveRelayInterval(tv), label: TV_TIMEFRAME_LABELS[tv] }));

const indexInstrument = (c) => ({ exchange: 'NSE', token: c.token, symbol: c.label, underlying: c.underlying, chartMode: 'index', selection: null });

const TVCHART_STATE_KEY = 'fundeddesk:tvchart:v1';
const loadTvChartState = () => { try { return JSON.parse(localStorage.getItem(TVCHART_STATE_KEY)) || null; } catch { return null; } };

export default function TVOverlayPage() {
  const rootsRef = useRef({});
  const chartsRef = useRef({});
  const [activeKey, setActiveKey] = useState('a');
  const [tool, setTool] = useState('cursor');
  const [intervals, setIntervals] = useState(() => {
    const saved = loadTvChartState();
    return { a: saved?.intervals?.a || 'FIVE_MINUTE', b: saved?.intervals?.b || 'FIVE_MINUTE' };
  });
  const [instruments, setInstruments] = useState(() => {
    const saved = loadTvChartState();
    return { a: saved?.a || indexInstrument(CHARTS[0]), b: saved?.b || indexInstrument(CHARTS[1]) };
  });
  const [indicators, setIndicators] = useState({ a: [], b: [] });
  const [chainPanel, setChainPanel] = useState(null);
  const [magnet, setMagnet] = useState(true);
  const [selectedCount, setSelectedCount] = useState({ a: 0, b: 0 });
  const [counts, setCounts] = useState({ a: 0, b: 0 });
  const [menu, setMenu] = useState(null);       // { chart, x, y, id, bounds }
  const [properties, setProperties] = useState(null); // { chart, id }
  const [flyout, setFlyout] = useState(null);   // { chart, x, y, id }
  const [live, setLive] = useState(true);
  const [seedError, setSeedError] = useState(null);
  const [painted, setPainted] = useState(null);
  const [watchlistItems, setWatchlistItems] = useState([]);
  const [stockQuotes, setStockQuotes] = useState({});
  const [order, setOrder] = useState(null); // { key, side } — OrderPanel request
  const draftRef = useRef({ lots: '1', sl: '', tp: '' });
  const [dockTab, setDockTab] = useState('positions'); // 'account' | 'positions' | 'book'
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [objectsOpen, setObjectsOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [relayStatus, setRelayStatus] = useState('connecting'); // relay health for StatusBar
  const objectsApiRef = useRef({ current: null });
  const chainN = useMarketData('NIFTY');
  const chainB = useMarketData('BANKNIFTY');
  const chains = { NIFTY: chainN.chain, BANKNIFTY: chainB.chain };
  const drawingsByInstrument = useRef({});

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

  // Persist each panel's instrument + timeframe across reloads (same
  // localStorage pattern drawingPersistence uses — no new storage layer).
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(TVCHART_STATE_KEY, JSON.stringify({ a: instruments.a, b: instruments.b, intervals }));
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [instruments, intervals]);

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

  const optionChainRows = useMemo(() => [
    ...(chainN.chain?.rows || []),
    ...(chainB.chain?.rows || []),
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

  // Drawings are NOT scoped per instrument by the overlay engine on this
  // page (drawingScopeFor exists but is unconsumed), so switching a panel's
  // instrument stashes the current instrument's drawings and restores the
  // target instrument's set — using only the public root API.
  const switchInstrument = (panel, next) => {
    const root = rootsRef.current[panel];
    if (root) {
      const cur = instruments[panel];
      const scope = `${cur.exchange}:${cur.token}`;
      const saved = { ...(drawingsByInstrument.current[panel] || {}), [scope]: [...root.getDrawings()] };
      drawingsByInstrument.current[panel] = saved;
      root.clearAll();
      root.selection.clear();
      root.identity.symbol = next.symbol;
      const target = saved[`${next.exchange}:${next.token}`] || [];
      target.forEach((d) => root.getInteraction().place(d));
      root.selection.clear();
      setCounts((prev) => ({ ...prev, [panel]: target.length }));
    }
    setInstruments((prev) => ({ ...prev, [panel]: next }));
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

  const openOrderPanel = (chartKey, side) => {
    draftRef.current = { lots: '1', sl: '', tp: '' };
    setOrder({ key: chartKey, side });
  };

  const submitOrder = () => {
    if (!order) return;
    const inst = instruments[order.key];
    if (!inst) return;
    const price = panelPrice(order.key) || undefined;
    TradingStore.placeOrder({
      exchange: inst.exchange,
      token: inst.token,
      symbol: inst.symbol,
      underlying: inst.underlying || inst.symbol,
      kind: inst.chartMode === 'strike' ? 'option' : 'future',
      side: order.side,
      lots: Number(draftRef.current.lots) || 1,
      signalPrice: price,
      sl: parseFloat(draftRef.current.sl) || null,
      tp: parseFloat(draftRef.current.tp) || null,
    });
    setOrder(null);
  };

  useEffect(() => {
    const root = rootsRef.current[activeKey];
    root?.setTool(tool);
  }, [tool, activeKey]);

  useEffect(() => {
    Object.values(rootsRef.current).forEach((root) => root?.configureSnap({ magnet, mode: 'ohlc' }));
  }, [magnet]);

  useEffect(() => {
    if (!live) return undefined;
    const timer = setInterval(() => {
      const chart = chartsRef.current.a;
      const root = rootsRef.current.a;
      if (!chart || !root) return;
      const last = chart.getLastCandle();
      if (!last) return;
      const drift = (Math.random() - 0.48) * 0.003;
      const close = Number((last.close * (1 + drift)).toFixed(2));
      chart.updateCandle({ ...last, high: Math.max(last.high, close), low: Math.min(last.low, close), close });
    }, 1500);
    return () => clearInterval(timer);
  }, [live]);

  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape') { setMenu(null); setProperties(null); setFlyout(null); setChainPanel(null); } };
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

  const seedAll = (attempt = 0) => {
    try {
      const entries = Object.entries(rootsRef.current);
      if (!entries.length) return;
      let pending = false;
      entries.forEach(([key, root]) => {
        if (root.getDrawings().length) return;
        if (!root.getCandles()?.length) { pending = true; return; }
        // Persistence: drawings were saved to localStorage (OverlayRoot saves
        // on every change); restore them before ever seeding demo content.
        if (!sessionStorage.getItem(`fd-restored-${root.chartKey}`)) {
          sessionStorage.setItem(`fd-restored-${root.chartKey}`, '1');
          const saved = root.serialization?.load?.() || [];
          if (saved.length) { saved.forEach((d) => root.getInteraction()?.place(d)); return; }
        }
        // Demo content is one-shot per tab session: don't re-seed on reload.
        if (sessionStorage.getItem(`fd-seed-${root.chartKey}`)) return;
        seedChart(key, root);
      });
      if (pending && attempt < 40) { setTimeout(() => seedAll(attempt + 1), 250); return; }
      setSeedError(null);
      setTimeout(() => {
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
      }, 800);
    } catch (error) {
      setSeedError(String(error?.message || error));
      console.error('seed failed', error);
    }
  };

  useEffect(() => { seedAll(); }, []);

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
    <main style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'Inter, sans-serif', padding: 12 }}>
      <TVChartHotkeys
        onBuy={() => openOrderPanel(activeKey, 'BUY')}
        onSell={() => openOrderPanel(activeKey, 'SELL')}
        setTool={setTool}
      />
      <LiveQuoteFeed live={live} baselineFor={(key) => chartsRef.current[key]?.getLastCandle?.()?.close ?? null} />
      <AlertNotifications />
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 10 }}>
        <strong style={{ fontSize: 14, color: 'var(--text)', marginRight: 8 }}>Phase 9 — Overlay Engine</strong>
        <button style={magnet ? toolActive : toolStyle} title="Snap to OHLC" onClick={() => setMagnet((v) => !v)}>magnet {magnet ? 'on' : 'off'}</button>
        <button style={toolStyle} title="Undo (Ctrl+Z)" onClick={() => rootsRef.current[activeKey]?.undo()}>undo</button>
        <button style={toolStyle} title="Redo" onClick={() => rootsRef.current[activeKey]?.redo()}>redo</button>
        <button style={toolStyle} title="Clear all drawings" onClick={() => rootsRef.current[activeKey]?.clearAll()}>clear</button>
        <button style={toolStyle} title="Seed demo drawings on both charts" onClick={seedAll}>seed</button>
        <button style={live ? toolActive : toolStyle} onClick={() => setLive((v) => !v)}>live {live ? 'on' : 'off'}</button>
        <button style={alertsOpen ? toolActive : toolStyle} title="Price / drawing / indicator alerts" onClick={() => setAlertsOpen((v) => !v)}>alerts</button>
        <button style={objectsOpen ? toolActive : toolStyle} title="Drawing object tree" onClick={() => setObjectsOpen((v) => !v)}>objects</button>
        <button style={dark ? toolActive : toolStyle} title="Toggle dark / light theme" onClick={() => setDark((v) => !v)}>theme {dark ? 'dark' : 'light'}</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
          active: <b style={{ color: 'var(--text)' }}>{instruments[activeKey].symbol}</b>
          {' · '}objects {counts.a + counts.b} ({counts.a}+{counts.b})
          {' · '}selected {selectedCount.a + selectedCount.b}
          {' · '}ESC cancel · SHIFT constrain/multi · ALT duplicate · CTRL no-snap
          {seedError ? <b style={{ color: '#f23645' }}> seed error: {seedError}</b> : null}
          {painted ? <span> painted: {Object.entries(painted).map(([k, v]) => `${k}:${v}`).join(' ')}</span> : null}
        </span>
      </header>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <TVLeftToolbar tool={tool} setTool={setTool} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {CHARTS.map((chart) => (
              <div
                key={chart.key}
                data-chart-key={chart.key}
                style={{ position: 'relative', border: activeKey === chart.key ? '1px solid #22ab94' : '1px solid var(--border)', borderRadius: 8, padding: 6 }}
                onPointerEnter={() => {
                  setActiveKey(chart.key);
                  Object.entries(rootsRef.current).forEach(([key, root]) => root?.setActive(key === chart.key));
                }}
              >
                <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                  <b style={{ color: 'var(--text)' }}>{instruments[chart.key].symbol}</b>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{counts[chart.key]} objects · {selectedCount[chart.key]} selected</span>
                    <span style={{ display: 'flex', gap: 3 }}>
                      {QUICK_TIMEFRAMES.map((tf) => (
                        <button
                          key={tf.tv}
                          title={tf.label}
                          style={intervals[chart.key] === tf.relay ? toolActive : toolStyle}
                          onClick={() => setIntervals((prev) => ({ ...prev, [chart.key]: tf.relay }))}
                        >
                          {tf.label}
                        </button>
                      ))}
                    </span>
                    <IndicatorMenu
                      active={indicators[chart.key]}
                      setActive={(next) => setIndicators((prev) => ({ ...prev, [chart.key]: next }))}
                    />
                    <button title={`Option Chain — ${chart.underlying}`} style={chainPanel === chart.key ? toolActive : toolStyle} onClick={() => setChainPanel(chart.key)}>Option Chain</button>
                    {instruments[chart.key].chartMode === 'strike' && (
                      <button title={`Back to ${chart.label} index`} style={toolStyle} onClick={() => switchInstrument(chart.key, indexInstrument(chart))}>Index</button>
                    )}
                  </span>
                </div>
                <BuySellOverlay
                  exchange={instruments[chart.key].exchange}
                  token={instruments[chart.key].token}
                  symbol={instruments[chart.key].symbol}
                  underlying={instruments[chart.key].underlying}
                  kind={instruments[chart.key].chartMode === 'strike' ? 'option' : 'future'}
                  onOrder={(side) => openOrderPanel(chart.key, side)}
                />
                <TVChartContainer
                  exchange={instruments[chart.key].exchange}
                  token={instruments[chart.key].token}
                  symbol={instruments[chart.key].symbol}
                  interval={intervals[chart.key]}
                  indicators={indicators[chart.key]}
                  chartKey={`tv-overlay-${chart.key}`}
                  overlay={overlayProps(chart)}
                  onReady={(chartApi, root) => {
                    chartsRef.current[chart.key] = chartApi;
                    root?.setCandles(chartApi.getCandles());
                    onSelectionBus(chart.key, root);
                  }}
                  onError={(error) => console.error(chart.key, error)}
                  style={{ width: '100%', height: 'calc(100vh - 130px)', minHeight: 380 }}
                />
              </div>
            ))}
          </div>
          <InstrumentCard
            chart={instruments[activeKey]}
            getCandles={() => chartsRef.current[activeKey]?.getCandles?.() || []}
          />
        </div>
        <div style={{ width: 300, flexShrink: 0, height: 'calc(100vh - 130px)', minHeight: 380, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)' }}>
          <Watchlist
            items={displayedItems}
            prices={prices}
            stockQuotes={stockQuotes}
            optionChainRows={optionChainRows}
            activeToken={instruments[activeKey].token}
            onSelect={onSelectWatchlistItem}
            onAdd={onAddWatchlist}
            onRemove={onRemoveWatchlist}
          />
        </div>
      </div>

      {/* Bottom dock — account / positions / order book from TradingStore
          (same store BuySellOverlay writes to). Mirrors the old terminal's
          bottom panel: tabbed sections for AccountSummary, PositionManager,
          and the OrderBook depth ladder + OrderManager. */}
      <div style={{
        marginTop: 10,
        border: '1px solid var(--border)',
        borderRadius: 8,
        background: 'var(--surface)',
        fontFamily: 'Inter, sans-serif',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '8px 14px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg2)',
        }}>
          {[['account', 'Account'], ['positions', 'Positions'], ['book', 'Order Book']].map(([id, label]) => (
            <button key={id} onClick={() => setDockTab(id)} style={dockTab === id ? toolActive : toolStyle}>{label}</button>
          ))}
          <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>
            Live from TradingStore — place a Buy/Sell on either chart and it appears here instantly.
          </span>
        </div>
        <div style={{ display: 'flex', maxHeight: 340 }}>
          {dockTab === 'account' && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <AccountManager onLogout={() => {}} onOpenSection={() => {}} />
            </div>
          )}
          {dockTab === 'positions' && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <PositionManager />
            </div>
          )}
          {dockTab === 'book' && (
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', maxHeight: 340 }}>
              <div style={{ height: 230, flexShrink: 0, borderBottom: '1px solid #e0e3eb' }}>
                <OrderBook
                  token={instruments[activeKey].token}
                  kind={instruments[activeKey].chartMode === 'strike' ? 'option' : 'future'}
                />
              </div>
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                <OrderManager />
              </div>
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
          chain={{ lot: 25, expiry: '—' }}
          side={order.side}
          lots={draftRef.current.lots}
          setLots={(v) => { draftRef.current = { ...draftRef.current, lots: v }; }}
          sl={draftRef.current.sl}
          setSl={(v) => { draftRef.current = { ...draftRef.current, sl: v }; }}
          tp={draftRef.current.tp}
          setTp={(v) => { draftRef.current = { ...draftRef.current, tp: v }; }}
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
      {propertiesDrawing && properties && (
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
      <OptionChainModal
        open={chainPanel != null}
        chain={chainPanel ? chains[instruments[chainPanel].underlying] : null}
        selection={chainPanel ? instruments[chainPanel].selection : null}
        onSelect={(row, type) => {
          const panel = chainPanel;
          if (!panel) return;
          const base = instruments[panel];
          const token = type === 'CE' ? row.ceToken : row.peToken;
          if (!token) return;
          switchInstrument(panel, {
            exchange: 'NFO',
            token: String(token),
            symbol: `${base.underlying} ${row.strike} ${type}`,
            underlying: base.underlying,
            chartMode: 'strike',
            selection: { underlying: base.underlying, strike: row.strike, type, token: String(token) },
          });
          setChainPanel(null);
        }}
        onClose={() => setChainPanel(null)}
      />
    </main>
  );
}
