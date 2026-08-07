'use client';
import { estimateBox, textPointInBox, textAnchorPoint } from './TextGeometry';

// Hit testing for the text-tool family: box containment (rotation-aware via
// the inverse-rotation probe) plus a proximity ring around the border.
// Labels are pills anchored at one point, so they hit inside their pill
// rect. The boxes can extend beyond the anchor's time span, so HitTestEngine
// routes text drawings through its full sweep like zones.
export function textHit(drawing, point, transform, threshold = 7) {
  if (!textAnchorPoint(drawing, transform)) return false;
  const box = estimateBox(drawing);
  return textPointInBox(point, drawing, transform, box, threshold);
}

export function labelHit(drawing, point, transform, threshold = 7) {
  const anchor = textAnchorPoint(drawing, transform);
  if (!anchor) return false;
  const box = estimateBox(drawing);
  return point.x >= anchor.x - box.width - threshold && point.x <= anchor.x + box.width + threshold
    && point.y >= anchor.y - 10 - threshold && point.y <= anchor.y + 10 + threshold;
}
