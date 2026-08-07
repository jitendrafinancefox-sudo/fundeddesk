'use client';
import { useState } from 'react';
import { Briefcase, SlidersHorizontal, XCircle, ArrowLeftRight, Plus, Scissors } from 'lucide-react';
import { TradingStore, useTradeState, fmtINR, lotSizeFor } from '@/stores/TradingStore';
import { th, td, fmtNum, fmtQty, Pnl, Side, actionBtn, dangerBtn, ghostBtn, field, inputNum, EmptyState } from './tradingUI';

// Position Manager — live MTM table. Every row action (modify SL/TP, close,
// reverse, add qty, partial exit) flows through the trading store, so the
// account/orders/history widgets update automatically.
export default function PositionManager() {
  const positions = useTradeState('positions');
  const [editing, setEditing] = useState(null); // { id, mode: 'modify'|'add'|'partial' }
  const [draft, setDraft] = useState({ sl: '', tp: '', lots: '' });

  const openEdit = (id, mode, pos) => {
    setEditing({ id, mode });
    setDraft({ sl: pos.sl ?? '', tp: pos.tp ?? '', lots: '' });
  };

  const apply = () => {
    const edit = editing;
    if (!edit) return;
    const pos = positions.find((p) => p.id === edit.id);
    if (!pos) return;
    if (edit.mode === 'modify') {
      TradingStore.modifyPosition(edit.id, { sl: draft.sl, tp: draft.tp });
    } else if (edit.mode === 'add') {
      TradingStore.addQty(edit.id, Number(draft.lots) || 1);
    } else if (edit.mode === 'partial') {
      TradingStore.partialExit(edit.id, Number(draft.lots) || 1);
    }
    setEditing(null);
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#ffffff', fontFamily: 'Inter, sans-serif' }}>
      {positions.length ? (
        <div className="terminal-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={th}>Symbol</th>
                <th style={th}>Exchange</th>
                <th style={th}>Direction</th>
                <th style={{ ...th, textAlign: 'right' }}>Qty</th>
                <th style={{ ...th, textAlign: 'right' }}>Avg Price</th>
                <th style={{ ...th, textAlign: 'right' }}>Current Price</th>
                <th style={{ ...th, textAlign: 'right' }}>PnL</th>
                <th style={{ ...th, textAlign: 'right' }}>MTM</th>
                <th style={{ ...th, textAlign: 'right' }}>SL</th>
                <th style={{ ...th, textAlign: 'right' }}>TP</th>
                <th style={th}>Time</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const dir = pos.side === 'BUY' ? 1 : -1;
                const pnl = (pos.currentPrice - pos.avgPrice) * dir * pos.qty;
                return (
                  <PosRows
                    key={pos.id}
                    pos={pos}
                    pnl={pnl}
                    editing={editing}
                    draft={draft}
                    setDraft={setDraft}
                    openEdit={openEdit}
                    apply={apply}
                    cancelEdit={() => setEditing(null)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<Briefcase size={22} />} text="No open positions. Place an order from the chart to get started." />
      )}
    </div>
  );
}

function PosRows({ pos, pnl, editing, draft, setDraft, openEdit, apply, cancelEdit }) {
  const isEditing = editing?.id === pos.id;
  const lotSize = lotSizeFor(pos.underlying);

  return (
    <>
      <tr style={{ transition: 'background 0.1s' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <td style={{ ...td, fontWeight: 600 }}>{pos.symbol}</td>
        <td style={td}>{pos.exchange}</td>
        <td style={td}><Side side={pos.side} /></td>
        <td style={{ ...td, textAlign: 'right' }}>{fmtQty(pos.qty)} <span style={{ color: '#b2b5be', fontSize: 10 }}>({pos.lots}L)</span></td>
        <td style={{ ...td, textAlign: 'right' }}>{fmtNum(pos.avgPrice)}</td>
        <td style={{ ...td, textAlign: 'right' }}>
          <span style={{ color: pos.currentPrice >= pos.avgPrice ? '#26a69a' : '#ef5350', fontWeight: 600 }}>{fmtNum(pos.currentPrice)}</span>
        </td>
        <td style={{ ...td, textAlign: 'right' }}><Pnl value={pnl} /></td>
        <td style={{ ...td, textAlign: 'right' }}>{fmtNum(pos.currentPrice * pos.qty)}</td>
        <td style={{ ...td, textAlign: 'right' }}>
          {pos.sl != null
            ? <span style={{ color: pos.side === 'BUY' ? '#ef5350' : '#26a69a', fontWeight: 600 }}>{fmtNum(pos.sl)}</span>
            : <span style={{ color: '#b2b5be' }}>—</span>}
        </td>
        <td style={{ ...td, textAlign: 'right' }}>
          {pos.tp != null
            ? <span style={{ color: pos.side === 'BUY' ? '#26a69a' : '#ef5350', fontWeight: 600 }}>{fmtNum(pos.tp)}</span>
            : <span style={{ color: '#b2b5be' }}>—</span>}
        </td>
        <td style={{ ...td, color: '#787b86' }}>{pos.opened}</td>
        <td style={td}>
          <span style={{ display: 'flex', gap: 4 }}>
            <button style={actionBtn} title="Modify SL/TP" onClick={() => openEdit(pos.id, 'modify', pos)}>
              <SlidersHorizontal size={10} style={{ verticalAlign: '-1px' }} /> Modify
            </button>
            <button style={dangerBtn} title="Close position at market" onClick={() => TradingStore.closePosition(pos.id)}>
              <XCircle size={10} style={{ verticalAlign: '-1px' }} /> Close
            </button>
            <button style={actionBtn} title="Reverse direction" onClick={() => TradingStore.reversePosition(pos.id)}>
              <ArrowLeftRight size={10} style={{ verticalAlign: '-1px' }} /> Reverse
            </button>
            <button style={ghostBtn} title={`Add qty (lot size ${lotSize})`} onClick={() => openEdit(pos.id, 'add', pos)}>
              <Plus size={10} style={{ verticalAlign: '-1px' }} /> Add
            </button>
            <button style={ghostBtn} title="Partial exit" onClick={() => openEdit(pos.id, 'partial', pos)}>
              <Scissors size={10} style={{ verticalAlign: '-1px' }} /> Partial
            </button>
          </span>
        </td>
      </tr>

      {isEditing && (
        <tr style={{ background: '#f8f9fa' }}>
          <td colSpan={12} style={{ padding: '6px 10px', borderBottom: '1px solid #e0e3eb' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
              <b style={{ color: '#2962ff', width: 110, fontSize: 10, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                {editing.mode === 'modify' ? 'Modify SL / TP' : editing.mode === 'add' ? 'Add Qty' : 'Partial Exit'}
              </b>
              {editing.mode === 'modify' && (
                <>
                  <span style={{ color: '#787b86' }}>SL</span>
                  <input type="number" step="0.05" placeholder="—" value={draft.sl} onChange={(e) => setDraft((d) => ({ ...d, sl: e.target.value }))} style={inputNum} />
                  <span style={{ color: '#787b86' }}>TP</span>
                  <input type="number" step="0.05" placeholder="—" value={draft.tp} onChange={(e) => setDraft((d) => ({ ...d, tp: e.target.value }))} style={inputNum} />
                </>
              )}
              {(editing.mode === 'add' || editing.mode === 'partial') && (
                <>
                  <span style={{ color: '#787b86' }}>Lots</span>
                  <input type="number" min="1" step="1" placeholder="1" value={draft.lots} onChange={(e) => setDraft((d) => ({ ...d, lots: e.target.value }))} style={inputNum} />
                  <span style={{ color: '#b2b5be', fontSize: 10 }}>× {lotSize} = {fmtQty((Number(draft.lots) || 0) * lotSize)} qty</span>
                </>
              )}
              <span style={{ flex: 1 }} />
              <button style={actionBtn} onClick={apply}>Apply</button>
              <button style={ghostBtn} onClick={cancelEdit}>Cancel</button>
            </span>
          </td>
        </tr>
      )}
    </>
  );
}