'use client';
import { useState } from 'react';
import { ClipboardList, Pencil, Ban, Copy } from 'lucide-react';
import { TradingStore, useTradeState } from '@/stores/TradingStore';
import { th, td, fmtNum, fmtQty, Side, StatusBadge, actionBtn, dangerBtn, ghostBtn, field, EmptyState } from './tradingUI';

const SECTIONS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'executed', label: 'Executed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'completed', label: 'Completed' },
];

// Order Manager — full order lifecycle. Pending orders can be modified or
// cancelled (releasing blocked margin); any order can be cloned into a fresh
// pending order.
export default function OrderManager() {
  const orders = useTradeState('orders');
  const [section, setSection] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [qtyDraft, setQtyDraft] = useState('');

  const counts = (id) => (id === 'all' ? orders.length : orders.filter((o) => o.status === id).length);
  const visible = section === 'all' ? orders : orders.filter((o) => o.status === section);

  const beginEdit = (order) => { setEditingId(order.id); setQtyDraft(String(order.qty)); };
  const saveEdit = () => {
    if (editingId) TradingStore.modifyOrder(editingId, { qty: Number(qtyDraft) });
    setEditingId(null);
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: '#ffffff', fontFamily: 'Inter, sans-serif' }}>
      {/* Section segmented control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 10px', borderBottom: '1px solid #e0e3eb', flexShrink: 0 }}>
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              border: 'none',
              cursor: 'pointer',
              background: section === s.id ? 'rgba(41,98,255,0.1)' : 'transparent',
              color: section === s.id ? '#2962ff' : '#787b86',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {s.label}
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              background: section === s.id ? '#2962ff' : '#e4e7ee',
              color: section === s.id ? '#ffffff' : '#787b86',
              borderRadius: 8,
              padding: '0 5px',
            }}>
              {counts(s.id)}
            </span>
          </button>
        ))}
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: '#b2b5be' }}>{visible.length} order{visible.length === 1 ? '' : 's'}</span>
      </div>

      {visible.length ? (
        <div className="terminal-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <th style={th}>Symbol</th>
                <th style={th}>Side</th>
                <th style={{ ...th, textAlign: 'right' }}>Qty</th>
                <th style={{ ...th, textAlign: 'right' }}>Signal Price</th>
                <th style={{ ...th, textAlign: 'right' }}>SL / TP</th>
                <th style={{ ...th, textAlign: 'right' }}>Margin</th>
                <th style={th}>Time</th>
                <th style={th}>Status</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((order) => (
                <tr key={order.id}
                  style={{ transition: 'background 0.1s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ ...td, fontWeight: 600 }}>{order.symbol}</td>
                  <td style={td}><Side side={order.side} /></td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    {editingId === order.id ? (
                      <input type="number" min="1" value={qtyDraft} onChange={(e) => setQtyDraft(e.target.value)} style={{ ...field, width: 70, textAlign: 'right' }} />
                    ) : (
                      <>{fmtQty(order.qty)} <span style={{ color: '#b2b5be', fontSize: 10 }}>({order.lots}L)</span></>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtNum(order.signalPrice)}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    {order.sl != null || order.tp != null
                      ? <span style={{ color: '#787b86' }}>{order.sl != null ? fmtNum(order.sl) : '—'} / {order.tp != null ? fmtNum(order.tp) : '—'}</span>
                      : <span style={{ color: '#b2b5be' }}>—</span>}
                  </td>
                  <td style={{ ...td, textAlign: 'right' }}>{fmtNum(order.margin, 0)}</td>
                  <td style={{ ...td, color: '#787b86' }}>{order.time}</td>
                  <td style={td}><StatusBadge status={order.status} reason={order.rejectReason} /></td>
                  <td style={td}>
                    <span style={{ display: 'flex', gap: 4 }}>
                      {order.status === 'pending' && (
                        <>
                          {editingId === order.id ? (
                            <>
                              <button style={actionBtn} onClick={saveEdit}>Save</button>
                              <button style={ghostBtn} onClick={() => setEditingId(null)}>Cancel</button>
                            </>
                          ) : (
                            <button style={actionBtn} title="Modify qty" onClick={() => beginEdit(order)}>
                              <Pencil size={10} style={{ verticalAlign: '-1px' }} /> Modify
                            </button>
                          )}
                          <button style={dangerBtn} title="Cancel order" onClick={() => TradingStore.cancelOrder(order.id)}>
                            <Ban size={10} style={{ verticalAlign: '-1px' }} /> Cancel
                          </button>
                        </>
                      )}
                      <button style={ghostBtn} title="Clone order" onClick={() => TradingStore.cloneOrder(order.id)}>
                        <Copy size={10} style={{ verticalAlign: '-1px' }} /> Clone
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<ClipboardList size={22} />} text="No orders in this section." />
      )}
    </div>
  );
}