'use client';

// Drawing Object Manager: pure logic + persistence for the object-tree panel.
// No React, no canvas — grouping, ordering, filtering, templates and presets
// are plain functions the panel calls; all mutations run through the
// interaction's history so they stay undoable. localStorage access is
// guarded so the module is safe in node tests.

export const MANAGER_STORAGE_KEY = 'fundeddesk:manager';
export const DEFAULT_PRESET_COLORS = ['#f5b93e', '#4d7cfe', '#ef4444', '#22c55e', '#a855f7', '#ec4899', '#eab308', '#f8fafc', '#22d3ee', '#fb923c'];
export const PRESET_LINE_STYLES = [
  { label: 'Solid', dash: [] },
  { label: 'Dashed', dash: [6, 4] },
  { label: 'Dotted', dash: [2, 3] },
  { label: 'Dash Dot', dash: [8, 3, 2, 3] },
];

const readStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = JSON.parse(localStorage.getItem(MANAGER_STORAGE_KEY) || 'null');
    return raw && typeof raw === 'object' ? raw : {};
  } catch { return {}; }
};
const writeStorage = (state) => { try { localStorage.setItem(MANAGER_STORAGE_KEY, JSON.stringify(state)); } catch { /* storage full / private mode — presets just won't persist */ } };

export function loadManagerState() {
  const state = readStorage();
  return {
    templates: Array.isArray(state.templates) ? state.templates.filter((t) => t && typeof t.name === 'string' && Array.isArray(t.drawings)) : [],
    favorites: Array.isArray(state.favorites) ? state.favorites.filter((id) => typeof id === 'string').slice(0, 200) : [],
    colors: Array.isArray(state.colors) ? state.colors.filter((c) => typeof c === 'string').slice(0, 40) : [...DEFAULT_PRESET_COLORS],
  };
}
function saveManagerState(state) { writeStorage(state); }

// --- Favorites (tool ids) --------------------------------------------------
export function toggleFavorite(toolId) {
  const state = loadManagerState();
  const favorites = state.favorites.includes(toolId) ? state.favorites.filter((id) => id !== toolId) : [...state.favorites, toolId];
  saveManagerState({ ...state, favorites });
  return favorites;
}
export function isFavorite(toolId) { return loadManagerState().favorites.includes(toolId); }

// --- Color / line-style presets --------------------------------------------
export function addPresetColor(color) {
  if (typeof color !== 'string' || !color) return loadManagerState().colors;
  const state = loadManagerState();
  const colors = state.colors.includes(color) ? state.colors : [...state.colors, color];
  saveManagerState({ ...state, colors });
  return colors;
}
export function removePresetColor(color) {
  const state = loadManagerState();
  const colors = state.colors.filter((c) => c !== color);
  saveManagerState({ ...state, colors });
  return colors;
}

// --- Grouping --------------------------------------------------------------
// Groups are just a shared groupId + display name on the members; renaming
// rewrites the name on every member (one history command via the
// interaction). Ungrouping clears the id on the members.
export function nextGroupId() { return `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
export function defaultGroupName(groupId) { return `Group ${groupId.slice(-4)}`; }
export const groupsFor = (drawings) => {
  const groups = new Map();
  drawings.forEach((drawing) => { if (drawing.groupId) { const name = drawing.groupName || defaultGroupName(drawing.groupId); if (!groups.has(drawing.groupId)) groups.set(drawing.groupId, { id: drawing.groupId, name, count: 0 }); groups.get(drawing.groupId).count += 1; } });
  return [...groups.values()];
};

// --- Search / filters ------------------------------------------------------
export function matchQuery(drawing, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const label = String(drawing.drawingType || '').toLowerCase();
  if (label.includes(q)) return true;
  if (drawing.text?.content && String(drawing.text.content).toLowerCase().includes(q)) return true;
  if (drawing.groupName && String(drawing.groupName).toLowerCase().includes(q)) return true;
  if (drawing.style?.label && String(drawing.style.label).toLowerCase().includes(q)) return true;
  return false;
}
// Filters run AFTER the visibility/locked checks so the panel can still show
// hidden/locked rows when the user is browsing them.
export function filterDrawings(drawings, { query = '', type = 'all', visibility = 'all', locked = 'all', hiddenIds = [] } = {}) {
  return drawings.filter((drawing) => {
    if (type !== 'all' && drawing.drawingType !== type) return false;
    if (visibility !== 'all') {
      const isHidden = drawing.hidden || hiddenIds.includes(drawing.id);
      if (visibility === 'hidden' && !isHidden) return false;
      if (visibility === 'visible' && isHidden) return false;
    }
    if (locked !== 'all') {
      if (locked === 'locked' && !drawing.locked) return false;
      if (locked === 'unlocked' && drawing.locked) return false;
    }
    return matchQuery(drawing, query);
  });
}

// --- Ordering --------------------------------------------------------------
// Pure list shuffles; the interaction applies them through history.
export function moveInOrder(list, id, targetIndex) {
  const from = list.findIndex((item) => item.id === id);
  if (from === -1 || from === targetIndex) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, targetIndex)), 0, item);
  return next;
}
export function stepOrder(list, id, direction) {
  const index = list.findIndex((item) => item.id === id);
  if (index === -1) return list;
  const target = direction === 'forward' ? index + 1 : index - 1;
  if (target < 0 || target >= list.length) return list;
  return moveInOrder(list, id, target);
}

// --- Templates -------------------------------------------------------------
// A template is { id, name, createdAt, drawings } where drawings are
// sanitized clones (styling + anchors, no selection/group state).
export function templateFrom(drawings, name) {
  return {
    id: `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: String(name || 'Template').slice(0, 60),
    createdAt: Date.now(),
    drawings: drawings.map((drawing) => {
      const copy = structuredClone(drawing);
      delete copy.id; delete copy.groupId; delete copy.groupName; delete copy.locked; delete copy.hidden;
      return copy;
    }),
  };
}
export function sanitizeTemplate(raw) {
  if (!raw || typeof raw !== 'object' || typeof raw.name !== 'string' || !Array.isArray(raw.drawings)) return null;
  return {
    id: typeof raw.id === 'string' ? raw.id : `t-${Date.now().toString(36)}`,
    name: raw.name.slice(0, 60),
    createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
    drawings: raw.drawings.filter((d) => d && typeof d.drawingType === 'string' && Array.isArray(d.anchorPoints)),
  };
}
export function saveTemplate(name, drawings) {
  const state = loadManagerState();
  const templates = [...state.templates.filter((t) => t.name !== name), templateFrom(drawings, name)];
  saveManagerState({ ...state, templates });
  return templates;
}
export function renameTemplate(id, name) {
  const state = loadManagerState();
  const templates = state.templates.map((t) => (t.id === id ? { ...t, name: String(name || t.name).slice(0, 60) } : t));
  saveManagerState({ ...state, templates });
  return templates;
}
export function removeTemplate(id) {
  const state = loadManagerState();
  const templates = state.templates.filter((t) => t.id !== id);
  saveManagerState({ ...state, templates });
  return templates;
}
export function exportTemplate(template) { return JSON.stringify(template, null, 2); }
export function parseTemplate(json) {
  try { return sanitizeTemplate(JSON.parse(json)); } catch { return null; }
}
// Materialize a template into fresh drawings for the current chart.
export function drawingsFromTemplate(template, identity = {}) {
  return template.drawings.map((item) => {
    const drawing = { ...structuredClone(item), id: crypto?.randomUUID?.() || `d-${Math.random().toString(36).slice(2, 10)}` };
    if (identity.symbol) drawing.symbol = identity.symbol;
    if (identity.timeframe) drawing.timeframe = identity.timeframe;
    return drawing;
  });
}
