'use client';
import { useState } from 'react';
import { Pencil, CandlestickChart, Plus, ZoomIn, ZoomOut, Maximize2, Minimize2, Square, Columns2, Columns3, Columns4 } from 'lucide-react';

const TIME_FRAMES = ['1m', '5m', '15m', '1h', 'Daily'];
const LAYOUTS = [
  ['1', Square, '1 chart'],
  ['2', Columns2, '2 charts'],
  ['3', Columns3, '3 charts'],
  ['4', Columns4, '4 charts'],
];

export default function TopToolbar({ underlying, setUnderlying, chain, status, breached, onOrder, onFullscreen, fullscreen, layout, setLayout }) {
  const [timeframe, setTimeframe] = useState('1m');
  const iconBtn = { width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'transparent', color: 'var(--muted)', cursor: 'pointer' };
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button title="Drawing tools" style={iconBtn}><Pencil size={15} /></button>
        <button title="Chart type" style={iconBtn}><CandlestickChart size={15} /></button>
        <div style={{ display: 'flex', gap: 3, background: 'rgba(197,203,206,.07)', borderRadius: 7, padding: 3 }}>
          {TIME_FRAMES.map((tf) => (
            <button key={tf} className={'tf-btn' + (timeframe === tf ? ' on' : '')} onClick={() => setTimeframe(tf)}>{tf}</button>
          ))}
        </div>
        <span style={{ width: 1, height: 22, background: 'var(--line2)', margin: '0 2px' }} />
        <select value={underlying} onChange={(e) => setUnderlying(e.target.value)} style={{ width: 'auto' }}>
          <option value="NIFTY">NIFTY 50</option>
          <option value="BANKNIFTY">BANKNIFTY</option>
        </select>
        {chain && <span className="tag tag-blue">EXP {chain.expiry} · LOT {chain.lot}</span>}
        <span className={'tag ' + (status === 'connected' ? 'tag-green' : 'tag-red')}>{status === 'connected' ? 'LIVE · ANGEL' : 'RELAY OFFLINE'}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 3, background: 'rgba(197,203,206,.07)', borderRadius: 7, padding: 3 }} title="Layout switcher">
          {LAYOUTS.map(([id, Icon, title]) => (
            <button key={id} title={title} onClick={() => setLayout(id)} style={{ width: 28, height: 24, borderRadius: 5, display: 'grid', placeItems: 'center', cursor: 'pointer', color: layout === id ? 'var(--blue)' : 'var(--muted)', background: layout === id ? 'rgba(77,124,254,.14)' : 'transparent' }}>
              <Icon size={14} />
            </button>
          ))}
        </div>
        <span style={{ width: 1, height: 22, background: 'var(--line2)', margin: '0 2px' }} />
        <button className="btn btn-grad btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }} onClick={onOrder}><Plus size={14} /> New Order</button>
        <span style={{ width: 1, height: 22, background: 'var(--line2)', margin: '0 2px' }} />
        <button title="Zoom out" style={iconBtn}><ZoomOut size={15} /></button>
        <button title="Zoom in" style={iconBtn}><ZoomIn size={15} /></button>
        <button className="btn btn-line btn-sm" onClick={onFullscreen}>{fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button>
        <span style={{ width: 1, height: 22, background: 'var(--line2)', margin: '0 2px' }} />
        <span className={'tag ' + (breached ? 'tag-red' : 'tag-green')}>{breached ? 'BREACHED' : 'ACTIVE'}</span>
      </div>
    </div>
  );
}
