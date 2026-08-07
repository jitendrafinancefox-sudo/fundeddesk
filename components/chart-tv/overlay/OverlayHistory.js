'use client';
import { createHistoryManager } from '@/components/chart/HistoryManager';

// Reuses the legacy delta-command history manager (no full-array snapshots;
// undo/redo replay apply/revert closures).
export function createOverlayHistory(onChange) {
  const manager = createHistoryManager({ onChange });
  return {
    ...manager,
    execute(action) { manager.execute(action); },
    beginGroup(label) { manager.beginGroup(label); },
    endGroup() { manager.endGroup(); },
    undo() { return manager.undo(); },
    redo() { return manager.redo(); },
    canUndo() { return manager.canUndo(); },
    canRedo() { return manager.canRedo(); },
    clear() { manager.clear(); },
  };
}
