'use client';
import { useEffect } from 'react';
import { useActivePane, usePaneActions } from './PaneManager';

// Global terminal hotkeys. Delete / Ctrl+C / Ctrl+V / Ctrl+Z / Escape for
// drawings are handled by the ACTIVE pane's KeyboardShortcutManager (window
// keydown, gated to the active pane) — not re-bound here.
//
//   Ctrl+B       Buy (open order panel, BUY)
//   Ctrl+S       Sell (open order panel, SELL)
//   Space        Pointer / cursor tool
//   Alt+W        Toggle watchlist
//   Alt+O        Toggle Orders dock
//   Alt+A        Toggle Account Manager dock
//   Alt+1        Pointer tool
//   Alt+2        Trendline tool
//   Alt+3        Rectangle tool
//   Alt+4        Fib retracement tool
export default function HotkeyManager({ onBuy, onSell, flash, onToggleWatchlist, onToggleDockTab }) {
  const { activePaneId } = useActivePane();
  const { setPaneTool } = usePaneActions();

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
        setPaneTool(activePaneId, 'cursor');
        flash?.('ok', 'Pointer tool');
        return;
      }

      if (event.altKey && !mod && !event.ctrlKey) {
        if (key === 'w') { event.preventDefault(); onToggleWatchlist?.(); return; }
        if (key === 'o') { event.preventDefault(); onToggleDockTab?.('orders'); return; }
        if (key === 'a') { event.preventDefault(); onToggleDockTab?.('account'); return; }
        const tool = key === '1' ? 'cursor' : key === '2' ? 'trendline' : key === '3' ? 'rectangle' : key === '4' ? 'fib' : null;
        if (tool) {
          event.preventDefault();
          setPaneTool(activePaneId, tool);
          const names = { cursor: 'Pointer', trendline: 'Trendline', rectangle: 'Rectangle', fib: 'Fib Retracement' };
          flash?.('ok', `${names[tool]} tool`);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePaneId, setPaneTool, onBuy, onSell, flash, onToggleWatchlist, onToggleDockTab]);

  return null;
}
