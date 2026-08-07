'use client';
import { memo, useRef, useCallback } from 'react';
import ChartPane from './ChartPane';
import { usePaneList, usePaneActions } from './PaneManager';
import { defaultSizes } from './paneOps';

const LAYOUT_CONFIGS = {
  '1': { cols: 1, rows: 1 },
  '2v': { cols: 2, rows: 1 },
  '2h': { cols: 1, rows: 2 },
  '3': { cols: 2, rows: 2 },
  '4': { cols: 2, rows: 2 },
};

const MIN_FRAC = 0.15;
const SPLITTER = 5;

export default memo(function ChartGrid({ onOrder }) {
  const { layout, panes, sizes } = usePaneList();
  const { setPaneSizes, swapPanes, setPaneSymbol, activatePane } = usePaneActions();
  const gridRef = useRef(null);
  const dragRef = useRef(null);

  const config = LAYOUT_CONFIGS[layout] || LAYOUT_CONFIGS['1'];
  const size = sizes[layout] || defaultSizes(layout);
  const cols = size.cols || Array(config.cols).fill(1 / config.cols);
  const rows = size.rows || Array(config.rows).fill(1 / config.rows);

  // Splitter drag: only the grid template changes (a cheap re-render of this
  // component). ChartPane children are memoized on their pane prop, so they
  // skip re-rendering entirely — the adjacent canvases just resize via
  // ResizeObserver and repaint themselves. No other chart is touched.
  const startDrag = useCallback((e, axis) => {
    e.preventDefault();
    const rect = gridRef.current.getBoundingClientRect();
    dragRef.current = {
      axis,
      startClient: axis === 'x' ? e.clientX : e.clientY,
      startCols: cols,
      startRows: rows,
      rect,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [cols, rows]);

  const moveDrag = useCallback((e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const delta = (drag.axis === 'x' ? e.clientX : e.clientY) - drag.startClient;
    const span = drag.axis === 'x' ? drag.rect.width : drag.rect.height;
    const frac = Math.min(0.85, Math.max(MIN_FRAC, (drag.axis === 'x' ? drag.startCols[0] : drag.startRows[0]) + delta / span));
    setPaneSizes(layout, drag.axis === 'x' ? { cols: [frac, 1 - frac] } : { rows: [frac, 1 - frac] });
  }, [layout, setPaneSizes]);

  const endDrag = useCallback(() => {
    dragRef.current = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resetSplitter = useCallback((axis) => {
    setPaneSizes(layout, axis === 'x' ? { cols: [0.5, 0.5] } : { rows: [0.5, 0.5] });
  }, [layout, setPaneSizes]);

  const dropSymbolOnPane = useCallback((paneId, item) => {
    setPaneSymbol(paneId, {
      exchange: item.exchange,
      token: item.token,
      symbol: item.symbol_label,
      chartMode: item.kind === 'option' ? 'strike' : 'index',
      selection: item.kind === 'option' ? (item.position || null) : null,
    });
    activatePane(paneId);
  }, [setPaneSymbol, activatePane]);

  const dropPaneToSwap = useCallback((fromId, toId) => {
    swapPanes(fromId, toId);
  }, [swapPanes]);

  return (
    <div
      ref={gridRef}
      style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: cols.map((c) => `${c}fr`).join(' '),
        gridTemplateRows: rows.map((r) => `${r}fr`).join(' '),
        minHeight: 0,
        overflow: 'hidden',
        background: '#ffffff',
        position: 'relative',
      }}
    >
      {panes.map((pane) => (
        <ChartPane
          key={pane.id}
          pane={pane}
          onOrder={onOrder}
          onDropSymbol={dropSymbolOnPane}
          onDropPane={dropPaneToSwap}
        />
      ))}

      {/* Vertical splitter — resizes the two columns only. */}
      {config.cols === 2 && (
        <div
          onPointerDown={(e) => startDrag(e, 'x')}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={() => resetSplitter('x')}
          title="Drag to resize columns · double-click to reset"
          style={{
            position: 'absolute',
            left: `calc(${(cols[0] / (cols[0] + cols[1])) * 100}% - ${SPLITTER / 2}px)`,
            top: 0,
            bottom: 0,
            width: SPLITTER,
            cursor: 'col-resize',
            zIndex: 6,
            touchAction: 'none',
          }}
        />
      )}

      {/* Horizontal splitter — resizes the two rows only. */}
      {config.rows === 2 && (
        <div
          onPointerDown={(e) => startDrag(e, 'y')}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onDoubleClick={() => resetSplitter('y')}
          title="Drag to resize rows · double-click to reset"
          style={{
            position: 'absolute',
            top: `calc(${(rows[0] / (rows[0] + rows[1])) * 100}% - ${SPLITTER / 2}px)`,
            left: 0,
            right: 0,
            height: SPLITTER,
            cursor: 'row-resize',
            zIndex: 6,
            touchAction: 'none',
          }}
        />
      )}
    </div>
  );
});
