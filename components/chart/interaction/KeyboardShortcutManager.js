'use client';

// Global keyboard shortcuts for drawing editing plus a live modifier-state
// tracker (shift/alt/ctrl) that pointer handlers read for additive selection,
// angle lock and duplicate-drag. Inputs (text fields, contenteditable) are
// never intercepted. Commands are dispatched to the current interaction
// instance through getters, so the manager outlives chart remounts safely.
const isTyping = (target) => target instanceof HTMLInputElement
  || target instanceof HTMLTextAreaElement
  || Boolean(target?.isContentEditable);

export function createKeyboardShortcutManager({ getInteraction, getToolManager, selection, engine }) {
  const mods = { shift: false, alt: false, ctrl: false };
  const setMod = (key, value) => {
    if (key === 'Shift') mods.shift = value;
    else if (key === 'Alt') mods.alt = value;
    else if (key === 'Control' || key === 'Meta') mods.ctrl = value;
  };
  const down = (event) => {
    if (isTyping(event.target)) return;
    setMod(event.key, true);
    const interaction = getInteraction?.();
    const mod = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();
    if (event.key === 'Delete' || event.key === 'Backspace') { event.preventDefault(); interaction?.delete(); }
    else if (mod && key === 'z') { event.preventDefault(); event.shiftKey ? interaction?.redo() : interaction?.undo(); }
    else if (mod && key === 'y') { event.preventDefault(); interaction?.redo(); }
    else if (mod && key === 'c') { event.preventDefault(); interaction?.copy(); }
    else if (mod && key === 'v') { event.preventDefault(); interaction?.paste(); }
    else if (mod && key === 'd') { event.preventDefault(); interaction?.duplicate(); }
    else if (event.key === 'Escape') { event.preventDefault(); interaction?.cancelMarquee(); interaction?.exitPointEdit(); getToolManager?.()?.cancel(); engine?.setPendingDrawing(null); engine?.setPointEdit(null); selection?.clear(); }
    else if (event.key === 'Enter') { const final = getToolManager?.()?.finish(); if (final) { event.preventDefault(); engine?.setPendingDrawing(null); interaction?.place(final); } }
  };
  const up = (event) => setMod(event.key, false);
  const blur = () => { mods.shift = false; mods.alt = false; mods.ctrl = false; };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  return {
    mods() { return mods; },
    destroy() {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    },
  };
}
