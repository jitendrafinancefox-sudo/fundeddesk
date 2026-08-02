'use client';

// PathHitTester — screen-space hit testing for the stroke family.
//
//   strokeHit      windowed polyline distance (brush/highlighter/path/polyline)
//   smoothStrokeHit bezier distance through anchors (smoothed strokes)
//   curveHit       cubic-bezier distance (curve tool: 4 anchors P0 C1 C2 P3)
//   arcHit         circular-arc distance (arc tool: 3 anchors)
//
// Every entry point honors the `threshold` tolerance and delegates to
// BrushGeometry's time-windowed walk so dense strokes stay O(window).

import { distanceToCubic, arcThrough, distanceToArc } from './BezierGeometry';
import { distanceToStroke } from './BrushGeometry';
import { smoothPath } from './StrokeSmoother';

export function strokeHit(drawing, point, transform, threshold = 7) {
  const style = drawing.style || {};
  const slack = (style.lineWidth || 1.5) / 2 + 2;
  return distanceToStroke(drawing, point, transform, threshold + slack) <= threshold + slack;
}

// Smoothed stroke (brush.raw === false or smooth flags present): walk the
// bezier segments, honoring sharp corners (segments break there).
export function smoothStrokeHit(drawing, point, transform, threshold = 7) {
  const anchors = drawing.anchorPoints;
  if (anchors.length < 2) return false;
  const pixels = anchors.map(transform.anchorToPixel).filter(Boolean);
  const brush = drawing.brush || {};
  const sharp = new Set(Array.isArray(brush.smooth) ? brush.smooth.filter((_, i) => brush.smooth[i] === false) : []);
  const segments = smoothPath(pixels, sharp);
  return segments.some((segment) => {
    if (segment.p1 === segment.p0) return false;
    return distanceToCubic(point, segment.p0, segment.c1, segment.c2, segment.p1) <= threshold;
  });
}

export function curveHit(drawing, point, transform, threshold = 7) {
  const anchors = drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
  if (anchors.length < 4) return anchors.length >= 2 && strokeHit(drawing, point, transform, threshold);
  const [p0, c1, c2, p3] = anchors;
  return distanceToCubic(point, p0, c1, c2, p3, 24) <= threshold;
}

export function arcHit(drawing, point, transform, threshold = 7) {
  const anchors = drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
  if (anchors.length < 3) return anchors.length >= 2 && strokeHit(drawing, point, transform, threshold);
  const arc = arcThrough(anchors[0], anchors[1], anchors[2]);
  if (!arc) return distanceToStroke(drawing, point, transform, threshold) <= threshold;
  return distanceToArc(point, arc, threshold) <= threshold;
}

export function strokeFamilyHit(drawing, point, transform, threshold = 7) {
  const type = drawing.drawingType;
  if (type === 'curve') return curveHit(drawing, point, transform, threshold);
  if (type === 'arc') return arcHit(drawing, point, transform, threshold);
  const brush = drawing.brush || {};
  if (brush.raw === false || (Array.isArray(brush.smooth) && brush.smooth.length)) return smoothStrokeHit(drawing, point, transform, threshold);
  return strokeHit(drawing, point, transform, threshold);
}
