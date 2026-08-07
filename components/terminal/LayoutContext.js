'use client';
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const LayoutContext = createContext(null);

export function useLayout() {
  return useContext(LayoutContext);
}

const PANEL_DEFAULTS = {
  header: { height: 44 },
  toolbar: { width: 48 },
  watchlist: { width: 260, min: 200, max: 420 },
  bottom: { height: 240, min: 42, maxRatio: 0.45 },
  splitter: 4,
};

function loadSaved() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('terminal-layout-v2');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function persist(state) {
  if (typeof window === 'undefined') return;
  try {
    const { watchlist, bottom } = state;
    localStorage.setItem('terminal-layout-v2', JSON.stringify({ watchlist, bottom }));
  } catch {}
}

export function LayoutProvider({ children }) {
  const rootRef = useRef(null);

  const [watchlist, setWatchlist] = useState({ open: false, width: PANEL_DEFAULTS.watchlist.width });
  const [bottom, setBottom] = useState({ open: false, height: PANEL_DEFAULTS.bottom.height, tab: 'account' });
  const [dragging, setDragging] = useState(null);
  const dragStart = useRef({ x: 0, y: 0, value: 0 });

  useEffect(() => {
    const saved = loadSaved();
    if (saved) {
      if (saved.watchlist) setWatchlist((prev) => ({ ...prev, ...saved.watchlist }));
      if (saved.bottom) setBottom((prev) => ({ ...prev, ...saved.bottom }));
    }
  }, []);

  useEffect(() => { persist({ watchlist, bottom }); }, [watchlist, bottom]);

  const toggleWatchlist = useCallback(() => setWatchlist((p) => ({ ...p, open: !p.open })), []);
  const openWatchlist = useCallback(() => setWatchlist((p) => ({ ...p, open: true })), []);
  const closeWatchlist = useCallback(() => setWatchlist((p) => ({ ...p, open: false })), []);

  const toggleBottom = useCallback(() => setBottom((p) => ({ ...p, open: !p.open })), []);
  const openBottom = useCallback((tab) => setBottom((p) => ({ ...p, open: true, tab: tab || p.tab })), []);
  const closeBottom = useCallback(() => setBottom((p) => ({ ...p, open: false })), []);
  const setBottomTab = useCallback((tab) => setBottom((p) => ({ ...p, tab })), []);

  const startDrag = useCallback((axis, e) => {
    e.preventDefault();
    e.stopPropagation();
    const currentValue = axis === 'ew' ? watchlist.width : bottom.height;
    dragStart.current = { x: e.clientX, y: e.clientY, value: currentValue };
    setDragging(axis);
  }, [watchlist.width, bottom.height]);

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e) => {
      if (dragging === 'ew') {
        const dx = dragStart.current.x - e.clientX;
        const next = Math.min(
          Math.max(dragStart.current.value + dx, PANEL_DEFAULTS.watchlist.min),
          PANEL_DEFAULTS.watchlist.max
        );
        setWatchlist((p) => ({ ...p, width: next }));
      } else {
        const dy = dragStart.current.y - e.clientY;
        const rootH = rootRef.current?.clientHeight || 600;
        const maxH = Math.floor(rootH * PANEL_DEFAULTS.bottom.maxRatio);
        const next = Math.min(
          Math.max(dragStart.current.value + dy, PANEL_DEFAULTS.bottom.min),
          maxH
        );
        setBottom((p) => ({ ...p, height: next }));
      }
    };

    const onUp = () => setDragging(null);

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = dragging === 'ew' ? 'ew-resize' : 'ns-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragging]);

  const value = {
    rootRef,
    watchlist, setWatchlist,
    bottom, setBottom,
    dragging,
    startDrag,
    toggleWatchlist, openWatchlist, closeWatchlist,
    toggleBottom, openBottom, closeBottom, setBottomTab,
    defaults: PANEL_DEFAULTS,
  };

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
}
