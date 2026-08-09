'use client';
import { useState, useRef } from 'react';
import { BellRing, Bell, Trash2, Plus, Download, X, LineChart, Hash, TrendingUp } from 'lucide-react';
import { TradingStore, useTradeState } from '@/stores/TradingStore';
import { drawingPersistence } from '@/services/drawingPersistence';
import { drawingLabelFor } from '@/components/chart/drawing/DrawingDefinitions';
import { th, td, field, actionBtn, fmtNum } from './tradingUI';

const INDICATORS = [
  { id: 'sma20', label: 'SMA (20)' },
  { id: 'sma50', label: 'SMA (50)' },
  { id: 'ema20', label: 'EMA (20)' },
  { id: 'ema50', label: 'EMA (50)' },
  { id: 'vwap', label: 'VWAP' },
  { id: 'rsi', label: 'RSI (14)' },
  { id: 'macd', label: 'MACD (12,26,9)' },
];

const DRAWING_TYPES = ['hline', 'trend', 'rect', 'ray', 'extended', 'parallelChannel'];

function drawingPrice(drawing) {
  const anchors = drawing.anchorPoints || [];
  if (!anchors.length) return null;
  if (drawing.drawingType === 'rect') {
    // Rectangle -> use the top edge for "above", bottom edge for "below".
    const prices = anchors.map((a) => a.price).filter((p) => Number.isFinite(p));
    return prices.length ? { top: Math.max(...prices), bottom: Math.min(...prices) } : null;
  }
  return { level: anchors[anchors.length - 1].price };
}

function extractDrawingAlerts(drawings) {
  return drawings
    .filter((d) => DRAWING_TYPES.includes(d.drawingType))
    .map((d) => ({ drawing: d, ref: drawingPrice(d), label: drawingLabelFor(d.drawingType) }))
    .filter((entry) => entry.ref != null);
}

export default function AlertManager({ activePane, chartKey: chartKeyOverride }) {
  const alerts = useTradeState('alerts');
  const [type, setType] = useState('price');
  const [condition, setCondition] = useState('above');
  const [level, setLevel] = useState('');
  const [indicator, setIndicator] = useState('rsi');
  const [drawingIdx, setDrawingIdx] = useState(0);
  const [drawings, setDrawings] = useState([]);
  const [popup, setPopup] = useState(true);
  const [sound, setSound] = useState(true);
  const [error, setError] = useState(null);
  const [dirty, setDirty] = useState(0);

  const token = activePane?.token;
  const symbol = activePane?.symbol || '—';
  const paneId = activePane?.id ?? activePane?.paneId;
  // Host pages with a different drawing persistence key (e.g. /tv-chart
  // stores under "tv-overlay-a") can override the derived pane key.
  const chartKey = chartKeyOverride != null ? chartKeyOverride : (paneId != null && token != null ? `pane-${paneId}-${token}` : null);

  const loadDrawings = () => {
    if (!chartKey) return;
    let list = [];
    try {
      const raw = drawingPersistence.load(chartKey);
      list = Array.isArray(raw) ? raw : raw?.drawings || [];
    } catch {}
    setDrawings(extractDrawingAlerts(list));
    setDirty((d) => d + 1);
  };

  const add = () => {
    if (!token) { setError('No active instrument'); return; }
    setError(null);

    if (type === 'drawing') {
      const entry = drawings[drawingIdx];
      if (!entry) { setError('No drawing selected — draw one on the chart first'); return; }
      const base = entry.ref.level ?? entry.ref.bottom;
      TradingStore.addAlert({
        type: 'drawing', token, symbol,
        condition, level: condition === 'above' ? base : (entry.ref.top ?? base),
        label: `${symbol} ${entry.label} ${condition}`,
        drawingId: entry.drawing.id, drawingLabel: entry.label,
        channel: { popup, sound },
      });
      setDirty((d) => d + 1);
      return;
    }

    const lvl = Number(level);
    if (!Number.isFinite(lvl) || lvl <= 0) { setError('Enter a valid alert level'); return; }

    if (type === 'price') {
      TradingStore.addAlert({
        type: 'price', token, symbol, condition, level: lvl,
        label: `${symbol} ${condition} ${lvl}`,
        channel: { popup, sound },
      });
    } else if (type === 'indicator') {
      TradingStore.addAlert({
        type: 'indicator', token, symbol, exchange: activePane.exchange,
        indicator, condition, level: lvl,
        label: `${symbol} ${INDICATORS.find((i) => i.id === indicator)?.label} ${condition} ${lvl}`,
        channel: { popup, sound },
      });
    }
    setLevel('');
    setDirty((d) => d + 1);
  };

  const drawingsToShow = drawings[drawingIdx];

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', background: '#ffffff', fontFamily: 'Inter, sans-serif', minWidth: 0 }}>
      {/* Create */}
      <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid #e0e3eb', display: 'flex', flexDirection: 'column', padding: 12, gap: 10, overflowY: 'auto' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#222222', display: 'flex', alignItems: 'center', gap: 7 }}>
          <BellRing size={13} color="#2962ff" /> New Alert
        </div>

        <label style={{ fontSize: 11, color: '#787b86' }}>Instrument
          <div style={{ marginTop: 4, ...field, width: '100%', color: '#222222' }}>{symbol}</div>
        </label>

        <div style={{ display: 'flex', gap: 4 }}>
          {[['price', 'Price'], ['indicator', 'Indicator'], ['drawing', 'Drawing']].map(([id, label]) => (
            <button key={id} onClick={() => { setType(id); if (id === 'drawing') loadDrawings(); }} style={{
              flex: 1, padding: '5px 0', borderRadius: 6, fontSize: 10.5, fontWeight: 600, fontFamily: 'Inter, sans-serif',
              border: 'none', cursor: 'pointer',
              background: type === id ? 'rgba(41,98,255,0.1)' : '#f8f9fa',
              color: type === id ? '#2962ff' : '#787b86',
            }}>{label}</button>
          ))}
        </div>

        {type === 'drawing' && (
          <div>
            <label style={{ fontSize: 11, color: '#787b86' }}>Drawing on active chart
              <button onClick={loadDrawings} title="Refresh drawings" style={{ marginLeft: 6, ...actionBtn, padding: '1px 6px', fontSize: 10, verticalAlign: '1px' }}>
                <Download size={9} style={{ verticalAlign: '-1px' }} /> Refresh
              </button>
            </label>
            <select value={drawingIdx} onChange={(e) => setDrawingIdx(Number(e.target.value))} style={{ ...field, width: '100%', marginTop: 4 }}>
              {drawings.length ? drawings.map((entry, i) => {
                const ref = entry.ref.level ?? entry.ref.top;
                return <option key={i} value={i}>{entry.label} @ {fmtNum(ref)}</option>;
              }) : <option value={0}>No drawings found on chart</option>}
            </select>
            {drawingsToShow && (
              <p style={{ fontSize: 10, color: '#b2b5be', margin: '4px 0 0' }}>
                Watching {drawingsToShow.label} level on the active chart.
              </p>
            )}
          </div>
        )}

        {type === 'indicator' && (
          <label style={{ fontSize: 11, color: '#787b86' }}>Indicator
            <select value={indicator} onChange={(e) => setIndicator(e.target.value)} style={{ ...field, width: '100%', marginTop: 4 }}>
              {INDICATORS.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
            </select>
          </label>
        )}

        <div style={{ display: 'flex', gap: 4 }}>
          {[['above', 'Price above'], ['below', 'Price below']].map(([id, label]) => (
            <button key={id} onClick={() => setCondition(id)} style={{
              flex: 1, padding: '5px 0', borderRadius: 6, fontSize: 10.5, fontWeight: 600, fontFamily: 'Inter, sans-serif',
              border: '1px solid #e0e3eb', cursor: 'pointer', background: condition === id ? 'rgba(41,98,255,0.1)' : '#ffffff',
              color: condition === id ? '#2962ff' : '#787b86',
            }}>{label}</button>
          ))}
        </div>

        {type !== 'drawing' && (
          <label style={{ fontSize: 11, color: '#787b86' }}>Level
            <input type="number" step="0.05" value={level} onChange={(e) => setLevel(e.target.value)} placeholder="e.g. 24600" style={{ ...field, width: '100%', marginTop: 4, textAlign: 'right' }} />
          </label>
        )}

        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#787b86' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
            <input type="checkbox" checked={popup} onChange={(e) => setPopup(e.target.checked)} /> Popup
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
            <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} /> Sound
          </label>
        </div>

        {error && <div style={{ fontSize: 11, color: '#ef5350', background: 'rgba(239,83,80,0.08)', borderRadius: 6, padding: '6px 10px' }}>{error}</div>}

        <button onClick={add} style={{
          padding: '7px 0', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          fontSize: 11, fontWeight: 700, background: '#2962ff', color: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Plus size={12} /> Create Alert
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #e0e3eb', fontSize: 12, fontWeight: 700, color: '#222222', display: 'flex', alignItems: 'center', gap: 7 }}>
          <Hash size={13} color="#2962ff" /> Active Alerts <span style={{ color: '#b2b5be', fontSize: 10 }}>({alerts.length})</span>
        </div>
        {alerts.length ? (
          <div className="terminal-scroll" style={{ flex: 1, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={th}>Type</th>
                  <th style={th}>Condition</th>
                  <th style={th}>Notify</th>
                  <th style={{ ...th, textAlign: 'center' }}>Status</th>
                  <th style={{ ...th, textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((a) => (
                  <tr key={a.id} style={{ transition: 'background 0.1s' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ ...td, fontWeight: 600 }}><TypeIcon type={a.type} /> {a.symbol}</td>
                    <td style={{ ...td, color: '#787b86' }}>{a.label}</td>
                    <td style={td}>
                      <span style={{ display: 'flex', gap: 4 }}>
                        {a.channel?.popup ? <Bell size={11} color="#2962ff" /> : null}
                        {a.channel?.sound ? <span style={{ fontSize: 11 }}>♪</span> : null}
                      </span>
                    </td>
                    <td align="center" style={{ ...td, textAlign: 'center' }}>
                      {a.firedAt ? (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#f2994a' }}>• FIRED</span>
                      ) : (
                        <button onClick={() => TradingStore.armAlert(a.id, !a.armed)} style={{
                          border: 'none', cursor: 'pointer', background: 'transparent', color: a.armed ? '#26a69a' : '#b2b5be',
                          display: 'inline-flex',
                        }} title={a.armed ? 'Disarm' : 'Arm'}>
                          <BellRing size={14} />
                        </button>
                      )}
                    </td>
                    <td align="right" style={td}>
                      <span style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        {a.firedAt && <button onClick={() => TradingStore.armAlert(a.id, true)} style={ghostMini}>Re-arm</button>}
                        <button onClick={() => TradingStore.removeAlert(a.id)} style={dangerMini} title="Delete alert"><Trash2 size={12} /></button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 30, textAlign: 'center', color: '#787b86', fontSize: 11 }}>
            <BellRing size={20} style={{ opacity: 0.4, marginBottom: 6 }} />
            No alerts yet. Create one on the left.
          </div>
        )}
      </div>
    </div>
  );
}

const ghostMini = { padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 600, border: '1px solid #e0e3eb', background: '#ffffff', color: '#2962ff', cursor: 'pointer' };
const dangerMini = { padding: '2px 6px', borderRadius: 4, border: 'none', background: 'rgba(239,83,80,0.1)', color: '#ef5350', cursor: 'pointer', display: 'inline-flex' };

function TypeIcon({ type }) {
  return type === 'drawing'
    ? <TrendingUp size={11} color="#7c9cff" style={{ verticalAlign: '-1px' }} />
    : type === 'indicator'
    ? <LineChart size={11} color="#f5b93e" style={{ verticalAlign: '-1px' }} />
    : <Hash size={11} color="#2962ff" style={{ verticalAlign: '-1px' }} />;
}