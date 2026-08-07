'use client';
import { textDefaults } from '@/components/chart/drawing/TextGeometry';
import { isPositionType, isTextType } from '@/components/chart/drawing/DrawingDefinitions';

// Per-tool payload defaults (mirrors the legacy ChartCanvas creation funnel)
// plus the style/payload update surface, all delegated to the interaction so
// every change stays undoable and serializable.
export const POSITION_DEFAULTS = { lots: 1, account: 0, currency: 'INR', pipSize: 0.01 };

export function createOverlayProperties({ getInteraction }) {
  const defaultsFor = (drawingType) => {
    if (isPositionType(drawingType)) return { ...POSITION_DEFAULTS };
    if (isTextType(drawingType)) return textDefaults(drawingType);
    return null;
  };

  return {
    defaultsFor,
    updateStyle(id, patch) { getInteraction()?.updateStyle(id, patch); },
    updateFib(id, patch) { getInteraction()?.updateFib(id, patch); },
    updatePosition(id, patch) { getInteraction()?.updatePosition(id, patch); },
    updateText(id, patch) { getInteraction()?.updateText(id, patch); },
    updateTextLive(id, patch) { getInteraction()?.updateTextLive(id, patch); },
    flipPosition(id) { getInteraction()?.flipPosition(id); },
    lock(id) { getInteraction()?.lock([id]); },
    unlock(id) { getInteraction()?.unlock([id]); },
    hide(id) { getInteraction()?.hide([id]); },
    show(id) { getInteraction()?.show([id]); },
    togglePointEdit(id) { return getInteraction()?.togglePointEdit(id) || null; },
  };
}
