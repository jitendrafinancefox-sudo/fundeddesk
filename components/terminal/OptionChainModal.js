'use client';
import { useState, useRef, useEffect, useMemo, Fragment } from 'react';
import { X, Move, Search, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { T } from './theme';

const fmtN = (v) => (v == null || isNaN(v) ? '—' : Number(v).toFixed(v >= 1000 ? 0 : v >= 10 ? 2 : 4));
const fmtQty = (v) => {
  if (v == null || isNaN(v)) return '—';
  if (v >= 1e7) return (v / 1e7).toFixed(2) + 'Cr';
  if (v >= 1e5) return (v / 1e5).toFixed(2) + 'L';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return String(v);
};

const groupHead = (label, color) => ({
  textAlign: 'center',
  padding: '4px 4px',
  fontWeight: 700,
  fontSize: 9,
  letterSpacing: '0.06em',
  color,
  borderBottom: '1px solid ' + T.colors.border,
  background: T.colors.bgAlt,
  whiteSpace: 'nowrap',
});
const col = (color = T.colors.text) => ({
  textAlign: 'center',
  padding: '5px 3px',
  cursor: 'pointer',
  color,
  borderBottom: '1px solid ' + T.colors.border,
  fontWeight: 400,
  fontSize: 11,
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
});
const headCol = {
  textAlign: 'center',
  padding: '5px 3px',
  fontWeight: 600,
  fontSize: 10,
  color: T.colors.muted,
  borderBottom: '1px solid ' + T.colors.border,
  whiteSpace: 'nowrap',
};

export default function OptionChainModal({ open, chain, selection, onSelect, onClose }) {
  const [pos, setPos] = useState({ x: 60, y: 60 });
  const [search, setSearch] = useState('');
  const [expiry, setExpiry] = useState('all');
  const [expanded, setExpanded] = useState(null);
  const [width, setWidth] = useState(1240);
  const headerRef = useRef(null);
  const posRef = useRef({ x: 60, y: 60 });

  useEffect(() => {
    if (!open) return;
    let dragging = false;
    let start = { x: 0, y: 0 };
    let origin = { x: 0, y: 0 };

    function onMove(e) {
      if (!dragging) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const next = { x: origin.x + dx, y: origin.y + dy };
      posRef.current = next;
      setPos(next);
    }

    function onUp() {
      dragging = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }

    function onDown(e) {
      if (!headerRef.current?.contains(e.target)) return;
      if (e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      start = { x: e.clientX, y: e.clientY };
      origin = { ...posRef.current };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }

    const el = headerRef.current;
    if (el) el.addEventListener('mousedown', onDown);

    return () => {
      if (el) el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [open]);

  // Width resize via the right-edge handle.
  const resizeRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const el = resizeRef.current;
    if (!el) return;
    let resizing = false;
    let startX = 0;
    let startW = 0;
    const onMove = (e) => {
      if (!resizing) return;
      setWidth(Math.min(1700, Math.max(760, startW + (e.clientX - startX))));
    };
    const onUp = () => {
      resizing = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    const onDown = (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      resizing = true;
      startX = e.clientX;
      startW = width;
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    };
    el.addEventListener('mousedown', onDown);
    return () => el.removeEventListener('mousedown', onDown);
  }, [open, width]);

  const expiries = useMemo(() => {
    const set = new Set((chain?.rows || []).map((r) => r.expiry).filter(Boolean));
    return [...set];
  }, [chain]);

  if (!open) return null;

  const filteredRows = (chain?.rows || []).filter((row) => {
    if (search) {
      const q = search.toLowerCase();
      const match = String(row.strike).includes(q) || (row.underlying || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (expiry !== 'all' && row.expiry && row.expiry !== expiry) return false;
    return true;
  });

  const ceCols = ['ceOi', 'ceVol', 'ceIv', 'ceDelta', 'ceGamma'];
  const peCols = ['peOi', 'peVol', 'peIv', 'peDelta', 'peGamma'];

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15,23,42,0.45)',
          zIndex: 99,
        }}
      />
      {/* Modal */}
      <div style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 100,
        width,
        maxWidth: '96vw',
        maxHeight: 'min(720px, 88vh)',
        background: T.colors.bg,
        border: T.border.thin,
        borderRadius: 8,
        boxShadow: T.shadow.panel,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        fontFamily: T.font.family,
      }}>
        {/* Header */}
        <div
          ref={headerRef}
          style={{
            padding: '10px 14px',
            borderBottom: T.border.thin,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: 'grab',
            userSelect: 'none',
            background: T.colors.bgAlt,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Move size={14} color={T.colors.dim} />
            <h3 style={{ fontSize: 13, margin: 0, fontWeight: 700, color: T.colors.text, letterSpacing: '-0.01em' }}>Option Chain</h3>
            <span style={{
              fontSize: 11,
              color: T.colors.muted,
              padding: '2px 8px',
              background: T.colors.bg,
              border: T.border.soft,
              borderRadius: 4,
            }}>
              {chain?.expiry || '—'} · Lot {chain?.lot || '—'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={onClose}
              title="Close"
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                display: 'grid',
                placeItems: 'center',
                background: 'transparent',
                border: T.border.soft,
                color: T.colors.muted,
                cursor: 'pointer',
                transition: `background ${T.motion.fast}, color ${T.motion.fast}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.colors.bgHover; e.currentTarget.style.color = T.colors.text; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.colors.muted; }}
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Search + expiry */}
        <div style={{
          padding: '8px 14px',
          borderBottom: T.border.thin,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 10px',
            background: T.colors.bgAlt,
            borderRadius: 6,
            border: T.border.soft,
            flex: '0 1 240px',
          }}>
            <Search size={13} color={T.colors.muted} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search strike / expiry..."
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                color: T.colors.text,
                fontSize: 12,
                outline: 'none',
                padding: 0,
                fontFamily: T.font.family,
              }}
            />
          </div>
          {expiries.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <button
                onClick={() => setExpiry('all')}
                style={{
                  padding: '3px 8px',
                  borderRadius: 4,
                  border: 'none',
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: T.font.family,
                  background: expiry === 'all' ? T.colors.blue : T.colors.bgAlt,
                  color: expiry === 'all' ? '#ffffff' : T.colors.muted,
                  transition: `all ${T.motion.fast}`,
                }}
              >
                All
              </button>
              {expiries.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setExpiry(ex)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    border: 'none',
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: T.font.family,
                    background: expiry === ex ? T.colors.blue : T.colors.bgAlt,
                    color: expiry === ex ? '#ffffff' : T.colors.muted,
                    transition: `all ${T.motion.fast}`,
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="terminal-scroll" style={{ maxHeight: 560, overflowY: 'auto', overflowX: 'auto', flex: 1 }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: 11,
            minWidth: 1240,
          }}>
            <thead>
              <tr>
                <th rowSpan="2" style={{ ...headCol, width: 26, background: T.colors.bgAlt }} />
                <th colSpan="5" style={groupHead('CALL OPTIONS (CE)', T.colors.up)}>Call (CE)</th>
                <th rowSpan="2" style={{ ...headCol, width: 80, background: T.colors.bgAlt, color: T.colors.text, fontWeight: 700 }}>STRIKE</th>
                <th colSpan="5" style={groupHead('PUT OPTIONS (PE)', T.colors.down)}>Put (PE)</th>
              </tr>
              <tr style={{ background: T.colors.bgAlt }}>
                <th style={headCol}>OI</th>
                <th style={headCol}>Vol</th>
                <th style={headCol}>IV</th>
                <th style={headCol}>Δ</th>
                <th style={headCol}>Γ</th>
                <th style={headCol}>LTP</th>
                <th style={headCol}>Δ</th>
                <th style={headCol}>Γ</th>
                <th style={headCol}>IV</th>
                <th style={headCol}>Vol</th>
                <th style={headCol}>OI</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const isATM = row.strike === chain?.atm;
                const isCESelected = selection?.token === row.ceToken;
                const isPESelected = selection?.token === row.peToken;
                const isOpen = expanded === row.strike;
                return (
                  <Fragment key={row.strike}>
                    <tr style={{
                      background: isATM ? T.colors.blueBg : 'transparent',
                    }}>
                      <td style={{ ...col(T.colors.muted), cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : row.strike)}>
                        {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      </td>
                      <td onClick={() => onSelect(row, 'CE')} style={{ ...col(isCESelected ? T.colors.blue : T.colors.muted), fontWeight: isCESelected ? 700 : 400 }}>{fmtQty(row.ceOi)}</td>
                      <td onClick={() => onSelect(row, 'CE')} style={{ ...col(isCESelected ? T.colors.blue : T.colors.muted), fontWeight: isCESelected ? 700 : 400 }}>{fmtQty(row.ceVol)}</td>
                      <td onClick={() => onSelect(row, 'CE')} style={{ ...col(isCESelected ? T.colors.blue : T.colors.text), fontWeight: isCESelected ? 700 : 400 }}>{fmtN(row.ceIv)}</td>
                      <td onClick={() => onSelect(row, 'CE')} style={{ ...col(isCESelected ? T.colors.blue : T.colors.up), fontWeight: isCESelected ? 700 : 400 }}>{fmtN(row.ceDelta)}</td>
                      <td onClick={() => onSelect(row, 'CE')} style={{ ...col(isCESelected ? T.colors.blue : T.colors.muted), fontWeight: isCESelected ? 700 : 400 }}>{fmtN(row.ceGamma)}</td>
                      <td style={{
                        ...col(isATM ? T.colors.amber : T.colors.text),
                        fontWeight: isATM ? 700 : 600,
                        borderLeft: T.border.thin,
                        borderRight: T.border.thin,
                        background: T.colors.bgAlt,
                        cursor: 'default',
                      }}>
                        {row.strike}
                      </td>
                      <td onClick={() => onSelect(row, 'PE')} style={{ ...col(isPESelected ? T.colors.blue : T.colors.down), fontWeight: isPESelected ? 700 : 400 }}>{row.pe ?? '—'}</td>
                      <td onClick={() => onSelect(row, 'PE')} style={{ ...col(isPESelected ? T.colors.blue : T.colors.muted), fontWeight: isPESelected ? 700 : 400 }}>{fmtN(row.peDelta)}</td>
                      <td onClick={() => onSelect(row, 'PE')} style={{ ...col(isPESelected ? T.colors.blue : T.colors.muted), fontWeight: isPESelected ? 700 : 400 }}>{fmtN(row.peGamma)}</td>
                      <td onClick={() => onSelect(row, 'PE')} style={{ ...col(isPESelected ? T.colors.blue : T.colors.text), fontWeight: isPESelected ? 700 : 400 }}>{fmtN(row.peIv)}</td>
                      <td onClick={() => onSelect(row, 'PE')} style={{ ...col(isPESelected ? T.colors.blue : T.colors.muted), fontWeight: isPESelected ? 700 : 400 }}>{fmtQty(row.peVol)}</td>
                      <td onClick={() => onSelect(row, 'PE')} style={{ ...col(isPESelected ? T.colors.blue : T.colors.muted), fontWeight: isPESelected ? 700 : 400 }}>{fmtQty(row.peOi)}</td>
                    </tr>
                    {isOpen && (
                      <tr style={{ background: T.colors.bgAlt }}>
                        <td colSpan="13" style={{
                          padding: '8px 14px',
                          borderBottom: T.border.thin,
                          fontSize: 10,
                          color: T.colors.muted,
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                            <span>CE LTP <b style={{ color: T.colors.up }}>{row.ce ?? '—'}</b></span>
                            <span>CE Bid/Ask <b style={{ color: T.colors.text }}>{row.ceBid ?? '—'} / {row.ceAsk ?? '—'}</b></span>
                            <span>CE Theta <b style={{ color: T.colors.text }}>{fmtN(row.ceTheta)}</b></span>
                            <span>CE Vega <b style={{ color: T.colors.text }}>{fmtN(row.ceVega)}</b></span>
                            <span>PE LTP <b style={{ color: T.colors.down }}>{row.pe ?? '—'}</b></span>
                            <span>PE Bid/Ask <b style={{ color: T.colors.text }}>{row.peBid ?? '—'} / {row.peAsk ?? '—'}</b></span>
                            <span>PE Theta <b style={{ color: T.colors.text }}>{fmtN(row.peTheta)}</b></span>
                            <span>PE Vega <b style={{ color: T.colors.text }}>{fmtN(row.peVega)}</b></span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {!filteredRows.length && (
                <tr>
                  <td colSpan="13" style={{ padding: 24, textAlign: 'center', color: T.colors.muted }}>
                    {search || expiry !== 'all' ? 'No matching strikes' : 'Chain not available'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Resize handle */}
        <div ref={resizeRef} title="Drag to resize" style={{
          position: 'absolute',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 18,
          height: 56,
          display: 'grid',
          placeItems: 'center',
          cursor: 'ew-resize',
          color: T.colors.dim,
          background: T.colors.bgAlt,
          borderTopLeftRadius: 6,
          borderBottomLeftRadius: 6,
          border: T.border.soft,
          borderRight: 'none',
          userSelect: 'none',
        }}>
          <GripVertical size={12} />
        </div>
      </div>
    </>
  );
}
