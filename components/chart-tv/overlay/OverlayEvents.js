'use client';
import { createKeyboardShortcutManager } from '@/components/chart/interaction/KeyboardShortcutManager';
import { isZoneType, isChannelType, isPositionType, isTextType, isStrokeType } from '@/components/chart/drawing/DrawingDefinitions';

// Mouse + keyboard interaction wiring over the TradingView host element.
//
// Layering strategy: every overlay canvas is pointer-transparent, so wheel
// zoom, trackpad pinch, left-drag pan, double-click autoscale and the native
// crosshair all keep hitting the TradingView canvas untouched. This module
// listens on the host (events bubble up from the TV canvas) and only takes
// over the pointer when a drawing/marquee/tool drag actually starts — LWC's
// own panning is disabled for the duration of such a drag via
// handleScroll.pressedMouseMove, then restored.
export function createOverlayEvents({
  container,
  tvChart,
  viewport,
  getTool,
  interaction,
  getInteraction,
  toolManager,
  getToolManager,
  selection,
  registry,
  getDrawings,
  engine,
  hoverManager,
  cursor,
  layers,
  snapping,
  getCandles,
  onContextMenuRequest,
  onProperties,
  activeRef,
}) {
  const keyboard = createKeyboardShortcutManager({
    getInteraction: () => getInteraction(),
    getToolManager: () => getToolManager(),
    selection,
    engine,
    active: () => activeRef?.current !== false,
  });

  let pointerMode = null; // 'pan' | 'drawing' | 'tool'
  let lastPoint = null;

  const point = (event) => {
    const box = container.getBoundingClientRect();
    return { x: event.clientX - box.left, y: event.clientY - box.top };
  };

  const suppressTvPan = (value) => {
    tvChart.applyOptions({ handleScroll: { pressedMouseMove: value } });
  };

  const applyCursor = () => {
    cursor.apply({
      tool: getTool(),
      hover: hoverManager.getHover() || null,
      panning: pointerMode === 'pan',
    });
  };

  const onPointerDown = (event) => {
    const p = point(event);
    lastPoint = p;
    const tool = getTool();

    if (event.button === 1) {
      event.preventDefault();
      suppressTvPan(false);
      pointerMode = 'pan';
      container.setPointerCapture?.(event.pointerId);
      applyCursor();
      return;
    }

    if (tool !== 'cursor') {
      suppressTvPan(false);
      pointerMode = 'tool';
      container.setPointerCapture?.(event.pointerId);
      const active = toolManager.isActive();
      const result = active ? toolManager.click(p) : toolManager.begin(tool, p);
      if (result) {
        engine.setPendingDrawing(null);
        interaction.place(result);
      } else {
        engine.setPendingDrawing(toolManager.pendingDrawing() || null);
      }
      applyCursor();
      return;
    }

    const mods = keyboard.mods() || {};
    const grabbed = interaction.pointerDown(p, { additive: Boolean(mods.shift) });
    if (grabbed) {
      suppressTvPan(false);
      pointerMode = 'drawing';
      container.setPointerCapture?.(event.pointerId);
    }
    // Free space: TradingView pans natively (pressedMouseMove stays on).
    applyCursor();
  };

  const onPointerMove = (event) => {
    const p = point(event);
    lastPoint = p;
    const tool = getTool();

    if (pointerMode === 'pan') {
      if (lastPoint) viewport.panByPixels(p.x - lastPoint.x);
      lastPoint = p;
      hoverManager.clear();
      applyCursor();
      return;
    }

    if (pointerMode === 'tool' && toolManager.isActive()) {
      const prev = toolManager.pendingDrawing();
      const next = toolManager.update(p);
      const rect = prev && next && !isZoneType(prev.drawingType) && !isChannelType(prev.drawingType) && !isPositionType(prev.drawingType) && !isTextType(prev.drawingType)
        ? layers.dirtyRect(prev, next, engine.transform())
        : null;
      engine.setPendingDrawing(next, rect || null);
      hoverManager.clear();
      applyCursor();
      return;
    }

    if (interaction.mode || interaction.marqueeActive) {
      hoverManager.clear();
      interaction.pointerMove(p);
      applyCursor();
      return;
    }

    hoverManager.update(p);
    applyCursor();
  };

  const onPointerUp = (event) => {
    const tool = getTool();
    if (pointerMode === 'pan') {
      pointerMode = null;
      suppressTvPan(true);
      try { container.releasePointerCapture?.(event.pointerId); } catch { /* no capture */ }
      applyCursor();
      return;
    }
    if (pointerMode === 'tool') {
      pointerMode = null;
      suppressTvPan(true);
      try { container.releasePointerCapture?.(event.pointerId); } catch { /* no capture */ }
      if (toolManager.isActive()) {
        const final = toolManager.release();
        engine.setPendingDrawing(toolManager.pendingDrawing() || null);
        if (final) {
          if (tool === 'eraser') interaction.erase(final);
          else interaction.place(final);
        }
      }
      applyCursor();
      return;
    }
    if (pointerMode === 'drawing') {
      pointerMode = null;
      suppressTvPan(true);
      try { container.releasePointerCapture?.(event.pointerId); } catch { /* no capture */ }
      interaction.pointerUp();
      applyCursor();
    }
  };

  const onPointerLeave = () => {
    pointerMode = null;
    suppressTvPan(true);
    toolManager.cancel();
    engine.setPendingDrawing(null);
    interaction.pointerUp();
    hoverManager.clear();
    applyCursor();
  };

  const onDoubleClick = (event) => {
    const tool = getTool();
    if (tool !== 'cursor') {
      if (toolManager.isActive()) {
        const final = toolManager.finish();
        engine.setPendingDrawing(null);
        if (final) interaction.place(final);
      }
      return;
    }
    const hit = interaction.hitLoose(point(event));
    if (!hit) {
      // Free space: TradingView-style autoscale (LWC has no native
      // double-click autoscale for the mouse).
      tvChart.fitContent();
      tvChart.series.priceScale().applyOptions({ autoScale: true });
      return;
    }
    // A drawing was double-clicked: keep TradingView from auto-scaling.
    event.stopPropagation();
    selection.select(hit.id);
    if (isStrokeType(hit.drawingType)) {
      const next = interaction.togglePointEdit(hit.id);
      engine.setPointEdit(next);
    } else {
      onProperties?.({ id: hit.id });
    }
  };

  const onContextMenu = (event) => {
    event.preventDefault();
    const p = point(event);
    if (toolManager.isActive()) { toolManager.cancel(); engine.setPendingDrawing(null); }
    const tool = getTool();
    const hit = tool === 'cursor' ? interaction.hitLoose(p) : null;
    if (hit) selection.select(hit.id);
    onContextMenuRequest?.({ x: p.x, y: p.y, id: hit?.id || null, bounds: { width: container.clientWidth, height: container.clientHeight } });
  };

  const onKeyDownEscape = (event) => {
    if (event.key === 'Escape') onProperties?.(null);
  };

  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerUp);
  container.addEventListener('pointerleave', onPointerLeave);
  container.addEventListener('dblclick', onDoubleClick);
  container.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('keydown', onKeyDownEscape);

  return {
    mods: () => keyboard.mods(),
    destroy() {
      container.removeEventListener('pointerdown', onPointerDown);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerup', onPointerUp);
      container.removeEventListener('pointerleave', onPointerLeave);
      container.removeEventListener('dblclick', onDoubleClick);
      container.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDownEscape);
      keyboard.destroy();
    },
  };
}
