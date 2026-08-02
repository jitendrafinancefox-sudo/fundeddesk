'use client';
import { drawingPersistence } from '@/services/drawingPersistence';
import { DRAWING_TYPES } from '../engine/DrawingSchema';

// v2: shapes are stored as full corner anchors (TL/TR/BR/BL) instead of
// 2-point drag diagonals; rotated shapes carry the rotation in those anchors.
// v1 payloads still load — the commit funnel promotes legacy diagonals.
export const DRAWINGS_VERSION = 2;
const VALID_IDENTITY = (drawing) => drawing && typeof drawing.id === 'string' && typeof drawing.symbol === 'string'
  && typeof drawing.timeframe === 'string' && DRAWING_TYPES.includes(drawing.drawingType)
  && Array.isArray(drawing.anchorPoints) && drawing.anchorPoints.length > 0;

// Serialization envelope:
//   { version: 1, drawings: [...] }
// Legacy payloads (a bare array, written before versioning existed) are
// migrated on load so no saved chart is ever lost.
function migrate(raw) {
  if (Array.isArray(raw)) return { version: DRAWINGS_VERSION, drawings: raw };
  if (raw && typeof raw === 'object' && Array.isArray(raw.drawings)) return { version: raw.version || DRAWINGS_VERSION, drawings: raw.drawings };
  return { version: DRAWINGS_VERSION, drawings: [] };
}

function sanitize(envelope) {
  return envelope.drawings.filter((drawing) => VALID_IDENTITY(drawing)).map((drawing) => ({
    ...drawing,
    anchorPoints: drawing.anchorPoints.map((point) => ({ time: point.time, price: point.price })),
  }));
}

export function createSerializationManager({ chartKey, debounceMs = 500 } = {}) {
  let timer = null;
  return {
    load() { return sanitize(migrate(drawingPersistence.load(chartKey))); },
    save(drawings) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; drawingPersistence.save(chartKey, { version: DRAWINGS_VERSION, drawings }); }, debounceMs);
    },
    flush(drawings) { if (timer) { clearTimeout(timer); timer = null; } drawingPersistence.save(chartKey, { version: DRAWINGS_VERSION, drawings }); },
    remove() { if (timer) { clearTimeout(timer); timer = null; } drawingPersistence.remove(chartKey); },
  };
}
