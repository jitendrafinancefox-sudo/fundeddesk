'use client';
import { drawingPersistence } from '@/services/drawingPersistence';
import { DRAWING_TYPES } from '../engine/DrawingSchema';
import { isChannelType, isRegressionType } from './ChannelGeometry';
import { isFibType } from './FibGeometry';
import { sanitizeFib } from './FibSerializer';
import { isStrokeType } from './BrushGeometry';
import { sanitizeStroke } from './BrushSerializer';
import { isPositionType } from './PositionGeometry';
import { sanitizePosition } from './PositionSerializer';
import { isTextType } from './TextGeometry';
import { sanitizeText } from './TextSerializer';

// v8: group membership — object-tree groups are stored on the members as
// drawing.groupId + drawing.groupName (both clamped); grouping, renaming and
// ungrouping flow through the same sanitized envelope as everything else.
// v7: text-tool drawings (text/anchoredText/note/callout/arrowCallout/
// balloon/infoBox/label/priceLabel/timeLabel) carry a text payload
// { content, box, autoSize, rotation, font, boxStyle, side, pointer,
//   snapToCandle } describing content and styling; labels add auto-position
// and candle snapping. The box is stored in screen px so annotations keep a
// constant size during zoom (the anchor stays data-pinned).
// v6: position-tool drawings (long/short/risk-reward/fixed-risk/fixed-
// reward/custom) carry a position payload { lots, account, currency,
// pipSize, fixedRisk, fixedReward } with user-entered sizing fields;
// derived risk/reward numbers are recomputed, never persisted.
// v5: stroke-family drawings (brush/highlighter/eraser/path/polyline/curve/
// arc) carry a brush payload { taper, raw, smooth } and curve control
// points; anchor arrays are capped for the storage envelope.
// v4: Fibonacci tools carry a fib payload { levels, label } describing the
// visible level set and label formatting.
// v3: channels store 3-4 anchor points (parallel/flat/disjoint layouts plus
// the regression window) and regression channels carry a fitted line
// (drawing.regression = { slope, intercept, count }) which the engine
// refits whenever the window anchors are edited.
// v2: shapes are stored as full corner anchors (TL/TR/BR/BL) instead of
// 2-point drag diagonals; rotated shapes carry the rotation in those anchors.
// v1 payloads still load — the commit funnel promotes legacy diagonals.
export const DRAWINGS_VERSION = 8;
const VALID_IDENTITY = (drawing) => drawing && typeof drawing.id === 'string' && typeof drawing.symbol === 'string'
  && typeof drawing.timeframe === 'string' && DRAWING_TYPES.includes(drawing.drawingType)
  && Array.isArray(drawing.anchorPoints) && drawing.anchorPoints.length > 0;
const str = (value, max = 64) => (typeof value === 'string' ? value.slice(0, max) : undefined);

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
    // Channels need a valid screen-relative regression when re-rendering;
    // the interaction refits when window anchors change. Keep whatever was
    // persisted (null for pre-v3 payloads) so v1/v2 files still render.
    regression: isRegressionType(drawing.drawingType) ? drawing.regression || null : undefined,
    // Fibonacci tools carry a validated levels/label payload (v4).
    fib: isFibType(drawing.drawingType) ? sanitizeFib(drawing).fib : undefined,
    // Stroke-family tools carry a validated brush payload (v5); anchor
    // arrays are numeric, time-sorted and capped.
    ...(isStrokeType(drawing.drawingType) ? sanitizeStroke(drawing) : {}),
    // Position tools carry a validated sizing payload (v6).
    ...(isPositionType(drawing.drawingType) ? sanitizePosition(drawing) : {}),
    // Text tools carry a validated content/styling payload (v7).
    ...(isTextType(drawing.drawingType) ? sanitizeText(drawing) : {}),
    // Object-tree groups ride on the members (v8); both fields are clamped
    // and dropped when malformed.
    ...(str(drawing.groupId) ? { groupId: str(drawing.groupId), groupName: str(drawing.groupName) || undefined } : {}),
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
