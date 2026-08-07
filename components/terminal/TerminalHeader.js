'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, BarChart3, Maximize2, Minimize2, Square, Columns2, Columns3, Columns4, ChevronDown, Moon, Sun, User, Settings, Slash, TrendingUp, PenLine, Type, ArrowRight, Gauge, History, GitCompare, MousePointer2 } from 'lucide-react';
import IndicatorMenu from './IndicatorMenu';
import { allStockSymbols } from '@/services/marketData';
import { INDEX_TOKEN, TIMEFRAMES } from './constants';
import { terminalStatus } from '@/stores/TerminalStatus';
import { T } from './theme';

const LAYOUTS = [
  ['1', Square, '1 chart'],
  ['2v', Columns2, '2 vertical'],
  ['2h', Columns2, '2 horizontal'],
  ['3', Columns3, '3 charts'],
  ['4', Columns4, '4 charts'],
];

// Quick drawing tools surfaced in the header Drawing menu (same ids the
// LeftToolbar and hotkeys use — Alt+1..4).
const DRAW_TOOLS = [
  ['cursor', MousePointer2, 'Pointer'],
  ['trendline', Slash, 'Trendline'],
  ['rectangle', Square, 'Rectangle'],
  ['fib', TrendingUp, 'Fib'],
  ['measure', Gauge, 'Measure'],
  ['brush', PenLine, 'Brush'],
  ['text', Type, 'Text'],
  ['arrow', ArrowRight, 'Arrow'],
];

const btnBase = {
  display: 'flex',
  alignItems: 'center',
  gap: 5,
  height: 28,
  padding: '0 8px',
  borderRadius: 4,
  fontSize: 12,
  fontFamily: T.font.family,
  fontWeight: 500,
  border: 'none',
  cursor: 'pointer',
  transition: 'background 0.1s',
  whiteSpace: 'nowrap',
  color: T.colors.muted,
  background: 'transparent',
};

const hoverBtn = {
  onMouseEnter: (e) => { e.currentTarget.style.background = T.colors.bgHover; },
  onMouseLeave: (e) => { e.currentTarget.style.background = 'transparent'; },
};

function Popover({ onClose, children, width = 240 }) {
  const ref = useRef(null);
  useEffect(() => {
    const away = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [onClose]);
  return (
    <div ref={ref} style={{
      position: 'absolute',
      top: 38,
      zIndex: 300,
      width,
      background: T.colors.bg,
      border: T.border.thin,
      borderRadius: T.radius.lg,
      boxShadow: T.shadow.lg,
      overflow: 'hidden',
      padding: '4px 0',
    }}>
      {children}
    </div>
  );
}

export default function TerminalHeader({
  underlying, timeframe, setTimeframe, status, breached,
  onOrder, onOptionChain, onFullscreen, fullscreen,
  layout, setLayout, selectedPrice, priceNode,
  onToggleObjects, onScalper,
  activeIndicators, setActiveIndicators,
  onSelectSymbol, onOpenAccount,
  onPickTool, onFlash, onReplay, onToggleWatchlist,
  change, compareItems, ltp,
}) {
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawOpen, setDrawOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [universe, setUniverse] = useState([]);
  const [dark, setDark] = useState(false);
  const [latency, setLatency] = useState(null);
  const searchBoxRef = useRef(null);
  const searchInputRef = useRef(null);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => terminalStatus.subscribe((s) => setLatency(s.ping)), []);

  useEffect(() => {
    const controller = new AbortController();
    allStockSymbols(controller.signal).then((stocks) => {
      setUniverse([
        { token: INDEX_TOKEN.NIFTY, exchange: 'NSE', symbol_label: 'NIFTY 50', symbol: 'NIFTY', kind: 'index' },
        { token: INDEX_TOKEN.BANKNIFTY, exchange: 'NSE', symbol_label: 'BANKNIFTY', symbol: 'BANKNIFTY', kind: 'index' },
        ...stocks.map((s) => ({ token: s.token, exchange: s.exch, symbol_label: s.symbol, symbol: s.symbol, kind: 'stock' })),
      ]);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const away = (e) => { if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) setSearchOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setSearchOpen(false); };
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    setTimeout(() => searchInputRef.current?.focus(), 30);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [searchOpen]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('light-theme', next);
  };

  const symbol = underlying === 'NIFTY' ? 'NIFTY 50' : 'BANKNIFTY';
  const price = mounted && selectedPrice != null
    ? selectedPrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })
    : '—';

  const results = query.trim()
    ? universe
        .filter((u) => u.symbol?.toLowerCase().includes(query.trim().toLowerCase()) || u.symbol_label?.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 10)
    : [];

  const changeUp = change?.pct != null ? change.pct >= 0 : null;

  const pickTool = (tool) => {
    onPickTool?.(tool);
    setDrawOpen(false);
    onFlash?.('ok', `${DRAW_TOOLS.find(([id]) => id === tool)?.[2] || tool} tool`);
  };

  return (
    <div
      data-testid="terminal-header"
      style={{
        height: 44,
        flexShrink: 0,
        borderBottom: T.border.thin,
        background: T.colors.bg,
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
        gap: 4,
        zIndex: 100,
        position: 'relative',
        fontFamily: T.font.family,
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        paddingRight: 8, marginRight: 4, flexShrink: 0,
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: 5,
          background: 'linear-gradient(96deg,#16C784,#0E9F68)',
          display: 'grid', placeItems: 'center',
          fontSize: 10, color: '#fff', fontWeight: 700, letterSpacing: '-0.02em',
        }}>
          FD
        </div>
      </div>

      {/* Symbol — click opens search */}
      <div ref={searchBoxRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setSearchOpen((v) => !v)}
          title="Search symbol"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            height: 32, padding: '0 8px', borderRadius: 4, border: 'none',
            background: 'transparent', color: T.colors.text, cursor: 'pointer',
            fontFamily: T.font.family, fontSize: 13, fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
          {...hoverBtn}
        >
          {symbol}
          <ChevronDown size={11} color={T.colors.dim} />
        </button>
        {searchOpen && (
          <div style={{
            position: 'absolute', left: 0, top: 36, width: 260, zIndex: 300,
            background: T.colors.bg, border: T.border.thin, borderRadius: T.radius.lg,
            boxShadow: T.shadow.lg, overflow: 'hidden',
          }}>
            <div style={{ padding: 8, borderBottom: T.border.soft }}>
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search NIFTY, stocks..."
                style={{
                  width: '100%', height: 30, padding: '0 10px', boxSizing: 'border-box',
                  border: T.border.soft, borderRadius: 4, outline: 'none',
                  fontFamily: T.font.family, fontSize: 12, color: T.colors.text,
                  background: T.colors.bgAlt,
                }}
              />
            </div>
            <div className="terminal-scroll" style={{ maxHeight: 240, overflowY: 'auto', overflowX: 'hidden' }}>
              {results.length === 0 && query.trim() && (
                <div style={{ padding: 12, fontSize: 12, color: T.colors.muted, textAlign: 'center' }}>No results</div>
              )}
              {results.map((item) => (
                <button
                  key={item.token + item.kind}
                  onClick={() => { onSelectSymbol?.(item); setSearchOpen(false); setQuery(''); }}
                  style={{
                    width: '100%', padding: '7px 12px', textAlign: 'left', border: 'none',
                    borderBottom: T.border.soft, background: 'transparent', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontFamily: T.font.family,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = T.colors.blueBg; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.colors.text }}>{item.symbol_label}</span>
                  <span style={{ fontSize: 10, color: T.colors.dim }}>{item.exchange}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* LTP */}
      <div style={{
        display: 'flex', alignItems: 'center',
        height: 32, padding: '0 8px', flexShrink: 0,
      }}>
        {priceNode || (
          <span style={{ fontFamily: T.font.family, fontWeight: 600, fontSize: 12, color: mounted ? T.colors.up : T.colors.dim }}>
            ₹{price}
          </span>
        )}
      </div>

      {/* Change pill */}
      <div style={{ flexShrink: 0 }}>
        {change?.pct != null ? (
          <span style={{
            fontSize: 11, fontWeight: 600,
            padding: '3px 8px', borderRadius: 4,
            fontVariantNumeric: 'tabular-nums',
            background: changeUp ? T.colors.upBg : T.colors.downBg,
            color: changeUp ? T.colors.up : T.colors.down,
          }}>
            {changeUp ? '+' : ''}{change.pct.toFixed(2)}%
          </span>
        ) : null}
      </div>

      {/* Timeframes — pill selector */}
      <div style={{
        display: 'flex', gap: 0,
        background: T.colors.bgAlt, borderRadius: 5, padding: 2,
        marginLeft: 4, flexShrink: 0,
      }}>
        {TIMEFRAMES.map(([tf]) => (
          <button
            key={tf}
            onClick={() => setTimeframe(tf)}
            style={{
              padding: '3px 7px', borderRadius: 4, fontSize: 11, fontWeight: 600,
              fontFamily: T.font.family,
              background: timeframe === tf ? T.colors.blue : 'transparent',
              color: timeframe === tf ? '#ffffff' : T.colors.muted,
              border: 'none', cursor: 'pointer', transition: 'all 0.1s',
            }}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* Indicators */}
      <IndicatorMenu active={activeIndicators} setActive={setActiveIndicators} />

      {/* Drawing — quick tools */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setDrawOpen((v) => !v)}
          title="Drawing tools"
          style={{ ...btnBase, color: drawOpen ? T.colors.blue : T.colors.muted }}
          {...hoverBtn}
        >
          <PenLine size={13} strokeWidth={1.8} /> Drawing
        </button>
        {drawOpen && (
          <Popover onClose={() => setDrawOpen(false)} width={170}>
            {DRAW_TOOLS.map(([id, Icon, label]) => (
              <button
                key={id}
                onClick={() => pickTool(id)}
                style={{
                  width: '100%', padding: '7px 12px', textAlign: 'left', border: 'none',
                  background: 'transparent', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                  fontFamily: T.font.family, fontSize: 12, color: T.colors.text,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.colors.blueBg; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon size={13} color={T.colors.muted} />
                {label}
              </button>
            ))}
          </Popover>
        )}
      </div>

      {/* Compare — watchlist instruments vs current symbol */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setCompareOpen((v) => !v)}
          title="Compare with watchlist"
          style={{ ...btnBase, color: compareOpen ? T.colors.blue : T.colors.muted }}
          {...hoverBtn}
        >
          <GitCompare size={13} strokeWidth={1.8} /> Compare
        </button>
        {compareOpen && (
          <Popover onClose={() => setCompareOpen(false)} width={260}>
            <div style={{ padding: '6px 12px 4px', fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: T.colors.dim, fontFamily: T.font.family }}>
              VS {symbol} {ltp != null ? `₹${ltp.toLocaleString('en-IN')}` : ''}
            </div>
            {(compareItems || []).length === 0 && (
              <div style={{ padding: 12, fontSize: 11, color: T.colors.muted }}>Watchlist is empty</div>
            )}
            {(compareItems || []).slice(0, 12).map((item) => (
              <div
                key={item.token}
                onClick={() => { onSelectSymbol?.(item); setCompareOpen(false); }}
                style={{
                  width: '100%', padding: '6px 12px', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  fontFamily: T.font.family, fontSize: 12, color: T.colors.text,
                  fontVariantNumeric: 'tabular-nums',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.colors.blueBg; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.symbol_label}
                </span>
                <span style={{ color: T.colors.muted }}>{item.ltp != null ? item.ltp.toFixed(2) : '—'}</span>
                <span style={{
                  width: 64, textAlign: 'right',
                  color: item.change == null ? T.colors.dim : (item.change >= 0 ? T.colors.up : T.colors.down),
                  fontWeight: 600,
                }}>
                  {item.change != null ? (item.change >= 0 ? '+' : '') + item.change.toFixed(2) + '%' : '—'}
                </span>
              </div>
            ))}
          </Popover>
        )}
      </div>

      {/* Replay */}
      <button
        onClick={() => { onReplay?.(); onFlash?.('ok', 'Replay session'); }}
        title="Replay the session"
        style={{ ...btnBase }}
        {...hoverBtn}
      >
        <History size={13} strokeWidth={1.8} /> Replay
      </button>

      {/* Objects */}
      <button onClick={onToggleObjects} title="Drawing object tree"
        style={btnBase} {...hoverBtn}
      >
        <Square size={13} strokeWidth={1.8} /> Objects
      </button>

      {/* Layout switcher */}
      <div style={{
        display: 'flex', gap: 1, background: T.colors.bgAlt, borderRadius: 4, padding: 2,
        flexShrink: 0,
      }}>
        {LAYOUTS.map(([id, Icon, title]) => (
          <button key={id} title={title} onClick={() => setLayout(id)}
            style={{
              width: 24, height: 22, borderRadius: 4,
              display: 'grid', placeItems: 'center', cursor: 'pointer',
              color: layout === id ? '#ffffff' : T.colors.muted,
              background: layout === id ? T.colors.blue : 'transparent',
              border: 'none', transition: 'all 0.1s',
            }}
          >
            <Icon size={12} strokeWidth={2} />
          </button>
        ))}
      </div>

      {/* Scalper */}
      <button onClick={onScalper}
        style={{
          ...btnBase, background: T.colors.blueBg, color: T.colors.blue,
          fontWeight: 600, flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(41,98,255,0.14)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = T.colors.blueBg; }}
      >
        <BarChart3 size={13} strokeWidth={2} /> Scalper
      </button>

      {/* Option Chain */}
      <button onClick={onOptionChain}
        style={{
          ...btnBase, background: T.colors.blue, color: '#ffffff',
          fontWeight: 600, flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#1e53e5'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = T.colors.blue; }}
      >
        <BarChart3 size={13} strokeWidth={2} /> Option Chain
      </button>

      <div style={{ flex: 1 }} />

      {/* Right cluster — Broker Status | Latency | Connection | Fullscreen | Settings | Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        {/* Broker Status */}
        <span title="Broker status" style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
          padding: '3px 6px', borderRadius: 4,
          background: status === 'connected' ? T.colors.upBg : T.colors.downBg,
          color: status === 'connected' ? T.colors.up : T.colors.down,
          fontFamily: T.font.family,
        }}>
          {status === 'connected' ? 'LIVE' : 'OFFLINE'}
        </span>

        {/* Latency */}
        <span title="Relay latency" style={{
          ...btnBase, padding: '0 6px', fontSize: 10, color: T.colors.muted,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {latency != null ? `${latency}ms` : '—'}
        </span>

        {/* Connection */}
        <span title="Connection" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 6px' }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: status === 'connected' ? T.colors.up : T.colors.down,
            boxShadow: status === 'connected' ? `0 0 0 2px ${T.colors.upSoft}` : `0 0 0 2px ${T.colors.downSoft}`,
          }} />
          <span style={{
            fontSize: 10, fontWeight: 600,
            color: status === 'connected' ? T.colors.up : T.colors.down,
            fontFamily: T.font.family,
          }}>
            {status === 'connected' ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
        </span>

        {/* Fullscreen */}
        <button onClick={onFullscreen} title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          style={{ ...btnBase, width: 28, padding: 0, justifyContent: 'center' }}
          {...hoverBtn}
        >
          {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>

        {/* Settings */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setSettingsOpen((v) => !v)} title="Settings"
            style={{ ...btnBase, width: 28, padding: 0, justifyContent: 'center', color: settingsOpen ? T.colors.blue : T.colors.muted }}
            {...hoverBtn}
          >
            <Settings size={14} />
          </button>
          {settingsOpen && (
            <Popover onClose={() => setSettingsOpen(false)} width={200}>
              <button
                onClick={() => { toggleTheme(); setSettingsOpen(false); }}
                style={{
                  width: '100%', padding: '8px 12px', textAlign: 'left', border: 'none',
                  background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  fontFamily: T.font.family, fontSize: 12, color: T.colors.text,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.colors.bgHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                {dark ? <Sun size={13} color={T.colors.muted} /> : <Moon size={13} color={T.colors.muted} />}
                {dark ? 'Light mode' : 'Dark mode'}
              </button>
              <button
                onClick={() => { onToggleWatchlist?.(); setSettingsOpen(false); }}
                style={{
                  width: '100%', padding: '8px 12px', textAlign: 'left', border: 'none',
                  background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  fontFamily: T.font.family, fontSize: 12, color: T.colors.text,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.colors.bgHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Search size={13} color={T.colors.muted} />
                Toggle watchlist
              </button>
              <button
                onClick={() => { onToggleObjects?.(); setSettingsOpen(false); }}
                style={{
                  width: '100%', padding: '8px 12px', textAlign: 'left', border: 'none',
                  background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  fontFamily: T.font.family, fontSize: 12, color: T.colors.text,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.colors.bgHover; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Square size={13} color={T.colors.muted} />
                Drawing object tree
              </button>
            </Popover>
          )}
        </div>

        {/* Profile */}
        <button onClick={onOpenAccount} title="Account"
          style={{
            ...btnBase, width: 28, padding: 0, justifyContent: 'center',
            background: T.colors.blueBg, color: T.colors.blue,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(41,98,255,0.14)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = T.colors.blueBg; }}
        >
          <User size={14} />
        </button>

        {/* Breached */}
        {breached && (
          <span title="Risk breach" style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
            padding: '3px 6px', borderRadius: 4,
            background: T.colors.downBg, color: T.colors.down,
            fontFamily: T.font.family,
          }}>
            BREACHED
          </span>
        )}
      </div>
    </div>
  );
}
