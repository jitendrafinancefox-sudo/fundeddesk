'use client';
import { useEffect } from 'react';

// Keyboard shortcuts for /tv-chart — the page has no pane system, so the
// old terminal's Hotkeys.js (which binds to PaneManager) doesn't fit here.
//   Ctrl+B / Ctrl+S   Buy / Sell — open OrderPanel for the ACTIVE panel
//   Space             Pointer (cursor) tool
//   Alt+1..4          Cursor / Trend / Rectangle / Fib tools
//   Alt+W / Alt+O / Alt+A   UNBOUND — this page has no watchlist toggle or
//                           dock tabs; leave off rather than invent behavior.
// Delete/Ctrl+C/Ctrl+V/Ctrl+Z/Escape are handled by the overlay root's own
// keyboard manager — not re-bound here.
export default function TVChartHotkeys({ onBuy, onSell, setTool }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;

      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();

      if (mod && key === 'b') { event.preventDefault(); onBuy?.(); return; }
      if (mod && key === 's') { event.preventDefault(); onSell?.(); return; }

      if (event.key === ' ' && !mod && !event.altKey) {
        event.preventDefault();
        setTool?.('cursor');
        return;
      }

      if (event.altKey && !mod && !event.ctrlKey) {
        const tool = key === '1' ? 'cursor' : key === '2' ? 'trend' : key === '3' ? 'rect' : key === '4' ? 'fib' : null;
        if (tool) { event.preventDefault(); setTool?.(tool); }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onBuy, onSell, setTool]);

  return null;
}
