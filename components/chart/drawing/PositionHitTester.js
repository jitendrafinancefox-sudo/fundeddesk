'use client';
import { positionZones } from './PositionGeometry';

// Hit testing for the position-tool family. The bands are price ranges that
// span the anchors' x-extent (entry→SL→TP), so containment is checked within
// that x-range; entry/SL/TP lines also hit within the line threshold. Matches
// the zone sweep contract (bands can extend beyond the anchors' time span, so
// HitTestEngine routes positions through its full sweep).
export function positionHit(drawing, point, transform, threshold = 7) {
  const zones = positionZones(drawing, transform);
  if (!zones) return false;
  if (point.x < zones.left - threshold || point.x > zones.right + threshold) return false;
  const nearLine = Math.abs(point.y - zones.entry.y) <= threshold
    || Math.abs(point.y - zones.sl.y) <= threshold
    || Math.abs(point.y - zones.tp.y) <= threshold;
  if (nearLine) return true;
  return (point.y >= zones.riskTop - threshold && point.y <= zones.riskBottom + threshold)
    || (point.y >= zones.rewardTop - threshold && point.y <= zones.rewardBottom + threshold);
}
