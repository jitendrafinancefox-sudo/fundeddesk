'use client';
export function createHistoryManager({ onChange } = {}) {
  const stack = []; let cursor = -1; let group = null;
  const changed = () => onChange?.({ canUndo: cursor >= 0, canRedo: cursor < stack.length - 1 });
  const commit = (entry) => { stack.splice(cursor + 1); stack.push(entry); cursor = stack.length - 1; changed(); };
  const run = (entry, direction) => entry[direction]?.();
  return {
    beginGroup(label = 'batch') { if (group) throw new Error('A history group is already active'); group = { label, actions: [] }; },
    execute(action) {
      if (!action?.apply || !action?.revert) throw new Error('History actions require apply and revert functions');
      run(action, 'apply'); if (group) group.actions.push(action); else commit({ label: action.label || 'change', actions: [action] });
    },
    push(value, label = 'change') { const snapshot = structuredClone(value); commit({ label, actions: [{ apply: () => snapshot, revert: () => snapshot }] }); },
    endGroup() { if (!group) return; if (group.actions.length) commit(group); group = null; },
    cancelGroup() { group = null; },
    undo() { if (cursor < 0) return false; const entry = stack[cursor--]; [...entry.actions].reverse().forEach((action) => run(action, 'revert')); changed(); return true; },
    redo() { if (cursor >= stack.length - 1) return false; const entry = stack[++cursor]; entry.actions.forEach((action) => run(action, 'apply')); changed(); return true; },
    canUndo() { return cursor >= 0; },
    canRedo() { return cursor < stack.length - 1; },
    clear() { stack.length = 0; cursor = -1; group = null; changed(); },
  };
}
