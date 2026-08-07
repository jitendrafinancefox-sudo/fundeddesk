'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, Lock, LockOpen, Eye, EyeOff, Trash2, Copy, ClipboardPaste, Layers, Ungroup, ArrowUpToLine, ArrowDownToLine, ArrowUp, ArrowDown, Save, Download, Upload, Pencil, Tag, Star, FolderOpen, ChevronDown, ChevronRight, PencilLine } from 'lucide-react';
import { drawingLabelFor } from '../drawing/DrawingDefinitions';
import { filterDrawings, groupsFor, loadManagerState, saveTemplate, renameTemplate, removeTemplate, exportTemplate, parseTemplate, addPresetColor, PRESET_LINE_STYLES } from '../drawing/DrawingManager';

const ROW = { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '3px 8px', borderRadius: 6, cursor: 'pointer' };
const BTN = (on) => ({ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, padding: '4px 8px', borderRadius: 6, border: '1px solid var(--line2)', color: on ? 'var(--blue)' : 'var(--muted)', background: on ? 'rgba(77,124,254,.15)' : 'transparent' });

// TradingView-style object tree: search, filters, multi-select, drag & drop
// reordering, bulk actions (lock/hide/delete/duplicate/copy/group), layer
// ordering, favorites-free templates and color/line-style presets. All
// mutations flow through the chart interaction (undoable); the panel itself
// is a thin React shell over the DrawingManager pure logic.
export default function DrawingManagerPanel({ apiRef, onClose }) {
  const [tick, setTick] = useState(0);
  const [api, setApi] = useState(apiRef?.current || null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [lockedFilter, setLockedFilter] = useState('all');
  const [collapsed, setCollapsed] = useState({});
  const [selected, setSelected] = useState([]); // mirrors canvas selection
  const [templateName, setTemplateName] = useState('');
  const [renaming, setRenaming] = useState(null); // template id being renamed
  const [renameValue, setRenameValue] = useState('');
  const [managerState, setManagerState] = useState(() => loadManagerState());
  const fileRef = useRef(null);
  const dragId = useRef(null);
  const apiRefValue = apiRef;

  // The chart hands us its manager API on mount; poll briefly in case the
  // panel opens before (or while) the chart wires itself up.
  useEffect(() => {
    const interval = setInterval(() => { if (apiRefValue?.current && apiRefValue.current !== api) setApi(apiRefValue.current); }, 300);
    return () => clearInterval(interval);
  }, [api, apiRefValue]);

  useEffect(() => {
    const bus = api?.getBus?.();
    if (!bus) return;
    const offSel = bus.on('selection:changed', (ids) => setSelected(Array.isArray(ids) ? ids : []));
    const offDraw = bus.on('drawings:changed', () => setTick((value) => value + 1));
    return () => { offSel(); offDraw(); };
  }, [api?.chartKey, api?.getBus]);

  const drawings = api?.getDrawings?.() || [];
  const interaction = api?.getInteraction?.();
  const layers = api?.getLayers?.();
  const hiddenSet = useMemo(() => new Set(layers?.hiddenIds?.() || []), [tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const filtered = useMemo(() => filterDrawings(drawings, { query, type: typeFilter, visibility: visibilityFilter, locked: lockedFilter, hiddenIds: layers?.hiddenIds?.() || [] }), [drawings, query, typeFilter, visibilityFilter, lockedFilter, tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const types = useMemo(() => { const seen = []; drawings.forEach((d) => { if (!seen.includes(d.drawingType)) seen.push(d.drawingType); }); return seen; }, [drawings]);
  const groups = useMemo(() => groupsFor(drawings), [drawings, tick]);
  const selIds = new Set(selected);
  const rowHidden = (drawing) => Boolean(drawing.hidden) || hiddenSet.has(drawing.id);

  const selectRow = (id, event) => {
    if (!interaction) return;
    if (event.shiftKey || event.metaKey || event.ctrlKey) interaction.selection?.toggle(id);
    else interaction.selection?.select(id);
  };
  const toggleAll = () => {
    if (!interaction) return;
    const all = filtered.map((d) => d.id);
    const allSelected = all.length && all.every((id) => selIds.has(id));
    interaction.selection?.replace(allSelected ? [] : all);
  };
  const bulk = (fn) => { const ids = selected; if (ids.length) fn(ids); };
  const action = {
    lock: () => bulk((ids) => interaction?.lock(ids)),
    unlock: () => bulk((ids) => interaction?.unlock(ids)),
    hide: () => bulk((ids) => interaction?.hide(ids)),
    show: () => bulk((ids) => interaction?.show(ids)),
    remove: () => bulk((ids) => { interaction?.deleteIds(ids); }),
    duplicate: () => bulk(() => interaction?.duplicate()),
    copy: () => bulk(() => interaction?.copy()),
    paste: () => interaction?.paste(),
    group: () => bulk((ids) => interaction?.group(ids)),
    ungroup: () => bulk((ids) => interaction?.ungroup(ids)),
    front: () => bulk((ids) => ids.slice().reverse().forEach((id) => interaction?.zMove(id, 'front'))),
    forward: () => bulk((ids) => ids.slice().reverse().forEach((id) => interaction?.zMove(id, 'forward'))),
    backward: () => bulk((ids) => ids.forEach((id) => interaction?.zMove(id, 'backward'))),
    back: () => bulk((ids) => ids.forEach((id) => interaction?.zMove(id, 'back'))),
    applyColor: (color) => bulk((ids) => interaction?.applyStyle(ids, { color })),
    applyDash: (dash) => bulk((ids) => interaction?.applyStyle(ids, { dash })),
  };
  const templates = managerState.templates;

  const saveAsTemplate = () => {
    if (!templateName.trim()) return;
    const source = selected.length ? drawings.filter((d) => selIds.has(d.id)) : drawings;
    if (!source.length) return;
    setManagerState((state) => ({ ...state, templates: saveTemplate(templateName.trim(), source) }));
    setTemplateName('');
  };
  const applyTemplate = (template) => { interaction?.applyTemplate(template, api?.getIdentity?.()); };
  const rename = (template) => {
    setManagerState((state) => ({ ...state, templates: renameTemplate(template.id, renameValue) }));
    setRenaming(null);
  };
  const dropTemplate = (template) => {
    const blob = new Blob([exportTemplate(template)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `${template.name.replace(/\s+/g, '-').toLowerCase()}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const importTemplate = (event) => {
    const file = event.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const template = parseTemplate(String(reader.result || ''));
      if (!template) return;
      setManagerState((state) => ({ ...state, templates: [...state.templates, template] }));
    };
    reader.readAsText(file);
  };
  const addColor = (color) => { if (color) setManagerState((state) => ({ ...state, colors: addPresetColor(color) })); };
  const onDrop = (targetId) => {
    const dragged = dragId.current; dragId.current = null;
    if (!dragged || !interaction) return;
    const list = interaction.getDrawings();
    const from = list.findIndex((d) => d.id === dragged);
    const to = targetId ? list.findIndex((d) => d.id === targetId) : list.length;
    if (from === -1 || to === -1) return;
    if (from === to) return;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(from < to ? to - 1 : to, 0, item);
    interaction.reorder(next);
  };

  if (!api) return null;
  return (
    <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 272, zIndex: 130, background: 'var(--card2)', borderLeft: '1px solid var(--line2)', display: 'flex', flexDirection: 'column', boxShadow: '-14px 0 34px rgba(0,0,0,.25)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
        <b style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 7 }}><FolderOpen size={14} color="var(--blue)" />Object Tree</b>
        <button onClick={onClose} style={{ color: 'var(--muted)', display: 'grid', placeItems: 'center' }}><X size={14} /></button>
      </div>

      <div style={{ padding: '10px 12px 6px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--line2)', borderRadius: 7, padding: '4px 8px' }}>
          <Search size={12} color="var(--dim)" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search drawings…" style={{ flex: 1, fontSize: 11.5, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)' }} />
          {query && <button onClick={() => setQuery('')} style={{ color: 'var(--dim)', fontSize: 11 }}>✕</button>}
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={selStyle}>
            <option value="all">All types</option>
            {types.map((t) => <option key={t} value={t}>{drawingLabelFor(t)}</option>)}
          </select>
          <select value={visibilityFilter} onChange={(e) => setVisibilityFilter(e.target.value)} style={selStyle}>
            <option value="all">Any vis.</option><option value="visible">Visible</option><option value="hidden">Hidden</option>
          </select>
          <select value={lockedFilter} onChange={(e) => setLockedFilter(e.target.value)} style={selStyle}>
            <option value="all">Any lock</option><option value="locked">Locked</option><option value="unlocked">Unlocked</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', paddingBottom: 2 }}>
          <button style={BTN(false)} onClick={() => action.lock()} disabled={!selected.length}><Lock size={11} />Lock</button>
          <button style={BTN(false)} onClick={() => action.unlock()} disabled={!selected.length}><LockOpen size={11} />Unlock</button>
          <button style={BTN(false)} onClick={() => action.hide()} disabled={!selected.length}><EyeOff size={11} />Hide</button>
          <button style={BTN(false)} onClick={() => action.show()} disabled={!selected.length}><Eye size={11} />Show</button>
          <button style={BTN(false)} onClick={() => action.remove()} disabled={!selected.length}><Trash2 size={11} />Delete</button>
          <button style={BTN(false)} onClick={() => action.duplicate()} disabled={!selected.length}><Copy size={11} />Dup</button>
          <button style={BTN(false)} onClick={() => action.copy()} disabled={!selected.length}><Copy size={11} />Copy</button>
          <button style={BTN(false)} onClick={() => action.paste()} disabled={!selected.length}><ClipboardPaste size={11} />Paste</button>
          <button style={BTN(false)} onClick={() => action.group()} disabled={selected.length < 2}><Layers size={11} />Group</button>
          <button style={BTN(false)} onClick={() => action.ungroup()} disabled={!selected.length}><Ungroup size={11} />Ungroup</button>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button style={BTN(false)} title="Bring to front" onClick={() => action.front()} disabled={!selected.length}><ArrowUpToLine size={11} /></button>
          <button style={BTN(false)} title="Bring forward" onClick={() => action.forward()} disabled={!selected.length}><ArrowUp size={11} /></button>
          <button style={BTN(false)} title="Send backward" onClick={() => action.backward()} disabled={!selected.length}><ArrowDown size={11} /></button>
          <button style={BTN(false)} title="Send to back" onClick={() => action.back()} disabled={!selected.length}><ArrowDownToLine size={11} /></button>
          <span style={{ flex: 1 }} />
          <button style={BTN(false)} onClick={toggleAll}>{filtered.length && filtered.every((d) => selIds.has(d.id)) ? 'Deselect all' : 'Select all'}</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '2px 8px 10px' }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onDrop(null); }}>
        {groups.map((group) => (
          <div key={group.id} style={{ marginTop: 6 }}>
            <button onClick={() => setCollapsed((c) => ({ ...c, [group.id]: !c[group.id] }))} style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%', padding: '3px 6px', fontSize: 11, color: 'var(--dim)', borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
              {collapsed[group.id] ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
              <Layers size={11} color="var(--blue)" />
              <b style={{ color: 'var(--text)', flex: 1 }}>{group.name}</b>
              <span>{group.count}</span>
            </button>
            {!collapsed[group.id] && groupMembers(group.id).map((drawing) => <Row key={drawing.id} drawing={drawing} selected={selIds.has(drawing.id)} hidden={rowHidden(drawing)} onSelect={selectRow} onDragStart={(id) => { dragId.current = id; }} onDrop={onDrop} onRename={() => {}} />)}
          </div>
        ))}
        {types.map((type) => (
          <div key={type} style={{ marginTop: 6 }}>
            <button onClick={() => setCollapsed((c) => ({ ...c, [`t:${type}`]: !c[`t:${type}`] }))} style={{ display: 'flex', alignItems: 'center', gap: 5, width: '100%', padding: '3px 6px', fontSize: 11, color: 'var(--dim)', borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
              {collapsed[`t:${type}`] ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
              <b style={{ color: 'var(--text)', flex: 1 }}>{drawingLabelFor(type)}</b>
              <span>{filtered.filter((d) => d.drawingType === type).length}</span>
            </button>
            {!collapsed[`t:${type}`] && filtered.filter((d) => d.drawingType === type).map((drawing) => <Row key={drawing.id} drawing={drawing} selected={selIds.has(drawing.id)} hidden={rowHidden(drawing)} onSelect={selectRow} onDragStart={(id) => { dragId.current = id; }} onDrop={onDrop} />)}
          </div>
        ))}
        {!filtered.length && <div className="muted" style={{ padding: 22, textAlign: 'center', fontSize: 12 }}>No drawings match.</div>}
      </div>

      <div style={{ borderTop: '1px solid var(--line)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '38%', overflowY: 'auto' }}>
        <b style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><Save size={13} color="var(--blue)" />Templates</b>
        <div style={{ display: 'flex', gap: 5 }}>
          <input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder={selected.length ? `Save ${selected.length} selected…` : 'Save all as template…'} style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 6, padding: '4px 7px', fontSize: 11, color: 'var(--text)' }} />
          <button onClick={saveAsTemplate} disabled={!templateName.trim()} style={BTN(false)}><Save size={12} />Save</button>
        </div>
        {templates.map((template) => (
          <div key={template.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {renaming === template.id
              ? <><input autoFocus value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && rename(template)} style={{ flex: 1, background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 6, padding: '3px 6px', fontSize: 11, color: 'var(--text)' }} /><button onClick={() => rename(template)} style={BTN(false)}>OK</button></>
              : <span title={template.name} style={{ flex: 1, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}><Tag size={11} color="var(--dim)" />{template.name}<span className="dim" style={{ fontSize: 10 }}>({template.drawings.length})</span></span>}
            <button title="Apply" onClick={() => applyTemplate(template)} style={BTN(false)}><Save size={11} /></button>
            <button title="Rename" onClick={() => { setRenaming(template.id); setRenameValue(template.name); }} style={BTN(false)}><Pencil size={11} /></button>
            <button title="Export" onClick={() => dropTemplate(template)} style={BTN(false)}><Download size={11} /></button>
            <button title="Delete" onClick={() => setManagerState((state) => ({ ...state, templates: removeTemplate(template.id) }))} style={BTN(false)}><Trash2 size={11} /></button>
          </div>
        ))}
        {!templates.length && <span className="dim" style={{ fontSize: 11 }}>No templates yet — save your first one above.</span>}
        <div style={{ display: 'flex', gap: 5 }}>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={importTemplate} />
          <button onClick={() => fileRef.current?.click()} style={BTN(false)}><Upload size={11} />Import template</button>
          <button onClick={() => interaction?.paste()} style={BTN(false)}><ClipboardPaste size={11} />Paste</button>
        </div>

        <b style={{ fontSize: 12, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}><PencilLine size={13} color="var(--blue)" />Presets</b>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          {managerState.colors.map((c) => <button key={c} title={c} onClick={() => action.applyColor(c)} disabled={!selected.length} style={{ width: 16, height: 16, borderRadius: 4, background: c, border: '1px solid var(--line2)' }} />)}
          <input type="color" title="Add color preset" onChange={(e) => addColor(e.target.value)} style={{ width: 18, height: 16, border: 'none', padding: 0, background: 'transparent' }} />
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {PRESET_LINE_STYLES.map((style) => (
            <button key={style.label} onClick={() => action.applyDash(style.dash)} disabled={!selected.length} title={style.label} style={BTN(false)}>
              <svg width="22" height="8"><line x1="1" y1="4" x2="21" y2="4" stroke="currentColor" strokeWidth="2" strokeDasharray={style.dash.join(' ') || 'none'} /></svg>
              <span>{style.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  function groupMembers(groupId) {
    return drawings.filter((d) => d.groupId === groupId);
  }
}

const selStyle = { background: 'var(--card)', border: '1px solid var(--line2)', borderRadius: 6, padding: '3px 4px', fontSize: 10.5, color: 'var(--text)', flex: 1 };

function Row({ drawing, selected, hidden, onSelect, onDragStart, onDrop }) {
  const preview = drawing.text?.content ? String(drawing.text.content).slice(0, 22) : null;
  const color = drawing.style?.color || '#8b93a7';
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', drawing.id); e.dataTransfer.effectAllowed = 'move'; onDragStart(drawing.id); }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDrop(drawing.id); }}
      onClick={(e) => onSelect(drawing.id, e)}
      style={{ ...ROW, background: selected ? 'rgba(77,124,254,.16)' : 'transparent', color: hidden ? 'var(--dim)' : 'var(--text)' }}
    >
      <span style={{ width: 10, height: 10, borderRadius: 4, background: color, flexShrink: 0 }} />
      <span style={{ width: 6, color: selected ? 'var(--blue)' : 'transparent', fontSize: 11 }}>●</span>
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{drawingLabelFor(drawing.drawingType)}{preview ? ` · ${preview}` : ''}</span>
      {drawing.groupName && <span className="dim" style={{ fontSize: 10, border: '1px solid var(--line2)', borderRadius: 4, padding: '0 3px' }}>{drawing.groupName}</span>}
      {drawing.locked && <Lock size={10} color="var(--gold)" />}
      {hidden && <EyeOff size={10} />}
    </div>
  );
}
