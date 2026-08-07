'use client';
import { useRef, useCallback, useState, memo, useEffect, useMemo } from 'react';
import { ChevronUp } from 'lucide-react';
import TerminalRoot from '@/components/terminal/TerminalRoot';
import TerminalHeader from '@/components/terminal/TerminalHeader';
import Workspace from '@/components/terminal/Workspace';
import ChartGrid from '@/components/terminal/ChartGrid';
import LeftToolbar from '@/components/terminal/LeftToolbar';
import Watchlist from '@/components/terminal/Watchlist';
import OrderPanel from '@/components/terminal/OrderPanel';
import ScalperPanel from '@/components/terminal/ScalperPanel';
import OptionChainModal from '@/components/terminal/OptionChainModal';
import { PaneManagerProvider, usePaneManager, usePanePriceRef, usePanePrice } from '@/components/terminal/PaneManager';
import { useLayout } from '@/components/terminal/LayoutContext';
import TerminalDataLayer from '@/components/terminal/TerminalDataLayer';
import TerminalActions from '@/components/terminal/TerminalActions';
import AccountManager, { AccountSummary } from '@/components/terminal/AccountManager';
import PositionManager from '@/components/terminal/PositionManager';
import OrderManager from '@/components/terminal/OrderManager';
import RiskPanel from '@/components/terminal/RiskPanel';
import OrderBook from '@/components/terminal/OrderBook';
import TradeHistory from '@/components/terminal/TradeHistory';
import AlertManager from '@/components/terminal/AlertManager';
import AlertNotifications from '@/components/terminal/AlertNotifications';
import HotkeyManager from '@/components/terminal/Hotkeys';
import StatusBar from '@/components/terminal/StatusBar';
import { TradingStore } from '@/stores/TradingStore';
import { INDEX_TOKEN, TIMEFRAMES } from './constants';

// Live price readout for the header. Subscribes only to the price context,
// so per-tick updates re-render this tiny span — never the chart panes.
const PanePriceText = memo(function PanePriceText({ paneId }) {
  const price = usePanePrice(paneId);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const text = mounted && price != null
    ? price.toLocaleString('en-IN', { minimumFractionDigits: 2 })
    : '—';
  return (
    <span style={{
      fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 12,
      color: mounted && price != null ? '#26a69a' : '#b2b5be',
      fontVariantNumeric: 'tabular-nums',
    }}>
      ₹{text}
    </span>
  );
});

function TerminalContent() {
  const rootRef = useRef(null);
  const {
    layout, setLayout,
    activePaneId, activePane,
    setActivePaneSymbol,
    setActivePaneTimeframe,
    setPaneTool,
    togglePaneDrawings,
    clearPaneDrawings,
    togglePaneIndicator,
    addPane,
    duplicatePane,
  } = usePaneManager();
  const priceRef = usePanePriceRef();
  const ltp = usePanePrice(activePaneId);

  const {
    bottom, setBottomTab, toggleBottom, toggleWatchlist,
  } = useLayout();

  const [scalperOpen, setScalperOpen] = useState(false);

  const getPrice = useCallback(() => priceRef.current[activePaneId] ?? null, [activePaneId, priceRef]);
  const actionsRef = useRef(null);

  const underlying = activePane.token === INDEX_TOKEN.NIFTY
    ? 'NIFTY'
    : activePane.token === INDEX_TOKEN.BANKNIFTY
    ? 'BANKNIFTY'
    : activePane.selection?.underlying
    || (activePane.symbol?.includes('BANKNIFTY') ? 'BANKNIFTY' : 'NIFTY');

  // Build a chart config from a watchlist item. Shared by plain selection
  // (active pane) and by the "open in new pane" gesture so both go through
  // exactly the same mapping.
  const itemToConfig = useCallback((item, chain) => {
    if (item.position) {
      return { exchange: 'NFO', token: item.token, symbol: item.symbol_label, chartMode: 'strike', selection: item.position };
    }
    if (item.kind === 'index') {
      const entry = Object.entries(INDEX_TOKEN).find(([, t]) => t === item.token);
      if (entry) return { exchange: 'NSE', token: item.token, symbol: entry[0], chartMode: 'index', selection: null };
      return null;
    }
    if (item.kind === 'option') {
      const row = (chain?.rows || []).find((r) => r.ceToken === item.token || r.peToken === item.token);
      if (row) {
        const type = row.ceToken === item.token ? 'CE' : 'PE';
        return {
          exchange: 'NFO', token: item.token, symbol: `${underlying} ${row.strike} ${type}`,
          chartMode: 'strike', selection: { underlying, strike: row.strike, type, token: item.token },
        };
      }
      return null;
    }
    if (item.kind === 'stock') {
      return { exchange: 'NSE', token: item.token, symbol: item.symbol_label, chartMode: 'index', selection: null };
    }
    return null;
  }, [underlying]);

  const selectContract = useCallback((row, type) => {
    const token = type === 'CE' ? row.ceToken : row.peToken;
    if (!token) return;
    setActivePaneSymbol('NFO', token, `${underlying} ${row.strike} ${type}`, 'strike', {
      underlying, strike: row.strike, type, token,
    });
  }, [underlying, setActivePaneSymbol]);

  const selectUnderlying = useCallback((chain) => (item) => {
    const cfg = itemToConfig(item, chain);
    if (cfg) setActivePaneSymbol(cfg.exchange, cfg.token, cfg.symbol, cfg.chartMode, cfg.selection);
  }, [underlying, itemToConfig, setActivePaneSymbol]);

  const handleChartOrder = useCallback((side, lots) => {
    const actions = actionsRef.current;
    if (!actions) return;
    actions.setSide(side || 'BUY');
    if (lots) actions.setLots(String(lots));
    actions.setOrderOpen(true);
  }, []);

  // The chart area needs no live market data — render it once so chain
  // refreshes never re-render the pane tree.
  const chartArea = useMemo(() => <ChartGrid onOrder={handleChartOrder} />, [handleChartOrder]);

  return (
    <div ref={rootRef} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TerminalActions rootRef={rootRef} activePane={activePane} getPrice={getPrice}>
        {(actions) => {
          actionsRef.current = actions;
          return (
          <TerminalDataLayer underlying={underlying}>
            {(data) => {
              // Header change pill: option selection → chain prev; otherwise
              // the watchlist quote (stocks only — index prev is unavailable).
              const change = (() => {
                const token = activePane.token;
                if (activePane.selection?.type) {
                  const row = (data.chain?.rows || []).find((r) => r.ceToken === token || r.peToken === token);
                  if (row) {
                    const isCE = row.ceToken === token;
                    const last = isCE ? +row.ce : +row.pe;
                    const prev = isCE ? row.prevCe : row.prevPe;
                    if (last && prev) return { pct: ((last - prev) / prev) * 100 };
                  }
                  return null;
                }
                const q = data.stockQuotes?.[token];
                if (q?.ltp && q?.prevClose) return { pct: ((q.ltp - q.prevClose) / q.prevClose) * 100 };
                return null;
              })();

              // Compare popover — watchlist instruments vs the active symbol.
              const compareItems = data.displayedItems
                .filter((i) => i.token !== activePane.token)
                .map((i) => {
                  const q = data.stockQuotes?.[i.token];
                  const chainPx = data.prices?.[i.token];
                  return {
                    ...i,
                    ltp: chainPx || q?.ltp || null,
                    change: q?.change ?? null,
                  };
                });

              return (
              <>
                <TerminalHeader
                  underlying={activePane.symbol}
                  timeframe={activePane.timeframe[0]}
                  setTimeframe={(tf) => {
                    const found = TIMEFRAMES.find((t) => t[0] === tf);
                    if (found) setActivePaneTimeframe(found);
                  }}
                  chain={data.chain}
                  status={data.status}
                  fullscreen={actions.fullscreen}
                  onFullscreen={actions.toggleFullscreen}
                  layout={layout}
                  setLayout={setLayout}
                  onOptionChain={() => actions.setOptionChainOpen(true)}
                  onOrder={(side) => { actions.setSide(side || 'BUY'); actions.setOrderOpen(true); }}
                  onToggleObjects={() => {
                    window.dispatchEvent(new CustomEvent('fd:objects:toggle'));
                  }}
                  onScalper={() => setScalperOpen(true)}
                  priceNode={<PanePriceText paneId={activePaneId} />}
                  activeIndicators={activePane.activeIndicators}
                  setActiveIndicators={(fn) => {
                    if (typeof fn === 'function') {
                      const result = fn(activePane.activeIndicators);
                      if (result !== activePane.activeIndicators) {
                        const added = result.filter((id) => !activePane.activeIndicators.includes(id));
                        const removed = activePane.activeIndicators.filter((id) => !result.includes(id));
                        added.forEach((id) => togglePaneIndicator(activePaneId, id));
                        removed.forEach((id) => togglePaneIndicator(activePaneId, id));
                      }
                    }
                  }}
                  onSelectSymbol={selectUnderlying(data.chain)}
                  onPickTool={(tool) => setPaneTool(activePaneId, tool)}
                  onFlash={actions.flash}
                  onReplay={() => window.dispatchEvent(new CustomEvent('fd:replay:toggle'))}
                  onToggleWatchlist={toggleWatchlist}
                  change={change}
                  compareItems={compareItems}
                  ltp={ltp}
                  onOpenAccount={() => {
                    setBottomTab('account');
                    if (!bottom.open) toggleBottom();
                  }}
                />
                <Workspace
                  left={
                    <LeftToolbar
                      tool={activePane.tool}
                      setTool={(t) => setPaneTool(activePaneId, t)}
                      visible={activePane.drawingsVisible}
                      setVisible={() => togglePaneDrawings(activePaneId)}
                      onClear={() => clearPaneDrawings(activePaneId)}
                    />
                  }
                  chartArea={chartArea}
                  right={
                    <Watchlist
                      items={data.displayedItems}
                      prices={data.prices}
                      stockQuotes={data.stockQuotes}
                      onSelect={selectUnderlying(data.chain)}
                      onAdd={(item) => data.addWatchlistItem(item, actions.flash)}
                      onRemove={(token) => data.removeWatchlistItem(token, actions.flash)}
                      optionChainRows={data.chain?.rows || []}
                      activeToken={activePane.token}
                      onClose={toggleWatchlist}
                      onOpenNewPane={(item) => {
                        const cfg = itemToConfig(item, data.chain);
                        if (cfg) addPane(cfg);
                      }}
                      onDuplicateChart={() => duplicatePane(activePaneId)}
                    />
                  }
                  bottomBar={
                    <BottomBar
                      activeTab={bottom.tab}
                      open={bottom.open}
                      onToggle={toggleBottom}
                      onTabChange={(tab) => {
                        if (tab === bottom.tab) {
                          toggleBottom();
                        } else {
                          setBottomTab(tab);
                          if (!bottom.open) toggleBottom();
                        }
                      }}
                    />
                  }
                  bottom={
                    <BottomPanelContent
                      tab={bottom.tab}
                      activePane={activePane}
                      underlying={underlying}
                      onOrder={(side) => { actions.setSide(side); actions.setOrderOpen(true); }}
                    />
                  }
                  statusBar={<StatusBar data={data} />}
                />
                  <HotkeyManager
                    onBuy={() => { actions.setSide('BUY'); actions.setOrderOpen(true); actions.flash('ok', 'Buy order panel — Ctrl+B'); }}
                    onSell={() => { actions.setSide('SELL'); actions.setOrderOpen(true); actions.flash('ok', 'Sell order panel — Ctrl+S'); }}
                    flash={actions.flash}
                    onToggleWatchlist={toggleWatchlist}
                    onToggleDockTab={(tab) => {
                      if (tab === bottom.tab) { toggleBottom(); return; }
                      setBottomTab(tab);
                      if (!bottom.open) toggleBottom();
                    }}
                  />
                <AlertNotifications />
                <OptionChainModal
                  open={actions.optionChainOpen}
                  chain={data.chain}
                  selection={activePane.selection}
                  onSelect={selectContract}
                  onClose={() => actions.setOptionChainOpen(false)}
                />
                <OrderPanel
                  open={actions.orderOpen}
                  selection={activePane.selection}
                  chain={data.chain}
                  side={actions.side}
                  setSide={actions.setSide}
                  lots={actions.lots}
                  setLots={actions.setLots}
                  sl={actions.sl}
                  setSl={actions.setSl}
                  tp={actions.tp}
                  setTp={actions.setTp}
                  onClose={() => actions.setOrderOpen(false)}
                  onSubmit={() => {
                    actions.submitOrder();
                    const selection = activePane.selection;
                    const signalPrice = getPrice();
                    if (!selection || !signalPrice) return;
                    TradingStore.placeOrder({
                      exchange: activePane.exchange,
                      token: activePane.token,
                      symbol: activePane.symbol,
                      underlying,
                      kind: 'option',
                      side: actions.side,
                      lots: Number(actions.lots) || 1,
                      signalPrice,
                      sl: parseFloat(actions.sl) || null,
                      tp: parseFloat(actions.tp) || null,
                    });
                  }}
                />
                <ScalperPanel
                  open={scalperOpen}
                  selection={activePane.selection}
                  chain={data.chain}
                  prices={data.prices}
                  onClose={() => setScalperOpen(false)}
                  onSubmit={() => { setScalperOpen(false); actions.setOrderOpen(true); }}
                />
              </>
            );
            }}
          </TerminalDataLayer>
          );
        }}
      </TerminalActions>
    </div>
  );
}

export default function TradingTerminal() {
  return (
    <PaneManagerProvider>
      <TerminalRoot>
        <TerminalContent />
      </TerminalRoot>
    </PaneManagerProvider>
  );
}

function BottomBar({ activeTab, onTabChange, open, onToggle }) {
  const tabs = [
    { id: 'account', label: 'Account Manager' },
    { id: 'trade', label: 'Trade' },
    { id: 'orders', label: 'Orders' },
    { id: 'positions', label: 'Positions' },
    { id: 'history', label: 'History' },
    { id: 'funds', label: 'Funds' },
    { id: 'holdings', label: 'Holdings' },
    { id: 'alerts', label: 'Alerts' },
  ];

  return (
    <>
      {/* Collapse arrow — ▼ collapsed / ▲ expanded. Only collapses the body,
          never hides tabs. */}
      <button
        onClick={onToggle}
        title={open ? 'Collapse panel' : 'Expand panel'}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 24, height: 24, borderRadius: 4, flexShrink: 0,
          background: 'transparent', border: 'none',
          color: '#787b86', cursor: 'pointer', marginRight: 2,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <ChevronUp size={14} style={{ transform: open ? 'none' : 'rotate(180deg)', transition: 'transform 0.15s' }} />
      </button>

      {/* Tabs — always all visible, span naturally left -> right */}
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            padding: '0 10px',
            height: '100%',
            flexShrink: 0,
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === tab.id ? '2px solid #2962ff' : '2px solid transparent',
            color: activeTab === tab.id ? '#2962ff' : '#787b86',
            fontWeight: activeTab === tab.id ? 600 : 500,
            cursor: 'pointer',
            transition: 'all 0.1s',
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
          }}
          onMouseEnter={(e) => { if (activeTab !== tab.id) e.currentTarget.style.color = '#222222'; }}
          onMouseLeave={(e) => { if (activeTab !== tab.id) e.currentTarget.style.color = '#787b86'; }}
        >
          {tab.label}
        </button>
      ))}
    </>
  );
}

function BottomPanelContent({ tab, activePane, underlying, onOrder }) {
  if (tab === 'account') {
    return <AccountManager onLogout={() => {}} onOpenSection={(id) => {}} />;
  }

  if (tab === 'trade') {
    const kind = activePane.selection ? 'option' : 'index';
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', minWidth: 0 }}>
        <div style={{ flex: 1.15, minWidth: 0, borderRight: '1px solid #e0e3eb', display: 'flex' }}>
          <RiskPanel selection={activePane.selection} underlying={underlying} token={activePane.token} kind={kind} />
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>
          <OrderBook token={activePane.token} kind={kind} />
        </div>
      </div>
    );
  }

  if (tab === 'orders') {
    return <OrderManager />;
  }

  if (tab === 'positions') {
    return <PositionManager />;
  }

  if (tab === 'history') {
    return <TradeHistory />;
  }

  if (tab === 'alerts') {
    return <AlertManager activePane={activePane} />;
  }

  if (tab === 'funds') {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
        <div style={{ padding: '8px 14px', borderBottom: '1px solid #e0e3eb', fontSize: 12, fontWeight: 700, color: '#222222', fontFamily: 'Inter, sans-serif' }}>
          Funds & Margin
        </div>
        <AccountSummary />
        <div style={{ flex: 1 }} />
      </div>
    );
  }

  if (tab === 'holdings') {
    return (
      <div className="terminal-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
          <thead>
            <tr style={{ position: 'sticky', top: 0, background: '#f8f9fa', zIndex: 10 }}>
              <th style={thStyle}>Symbol</th>
              <th style={thStyle}>Qty</th>
              <th style={thStyle}>Buy Price</th>
              <th style={thStyle}>Current</th>
              <th style={thStyle}>P&L</th>
              <th style={thStyle}>Time</th>
              <th style={thStyle}>Exchange</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colSpan="7" style={{ padding: 20, textAlign: 'center', color: '#787b86' }}>No holdings</td></tr>
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}

const thStyle = {
  textAlign: 'left',
  padding: '6px 10px',
  fontWeight: 600,
  fontSize: 11,
  color: '#787b86',
  borderBottom: '1px solid #e0e3eb',
  fontFamily: 'Inter, sans-serif',
};

const tdStyle = {
  padding: '6px 10px',
  borderBottom: '1px solid #e0e3eb',
  fontSize: 11,
  fontWeight: 500,
  color: '#222222',
  fontVariantNumeric: 'tabular-nums',
  fontFamily: 'Inter, sans-serif',
};
