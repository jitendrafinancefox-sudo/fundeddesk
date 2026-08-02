'use client';
import { createSpatialIndex } from './SpatialIndex';

// Ordered id-keyed registry for drawing objects. The order array IS the
// z-order (last = topmost), matching how the renderer iterates drawings.
// A lazily-rebuilt spatial index accelerates hit testing and visible-range
// queries (the index is rebuilt only when the registry revision changes).
export function createObjectRegistry() {
  const byId = new Map();
  let order = [];
  let revision = 0;
  const spatial = createSpatialIndex();
  let spatialRevision = -1;

  const ensureSpatial = () => { if (spatialRevision !== revision) { spatial.rebuild(order.map((id) => byId.get(id)).filter(Boolean)); spatialRevision = revision; } };

  return {
    add(drawing) { byId.set(drawing.id, drawing); order.push(drawing.id); revision += 1; },
    remove(id) { if (!byId.delete(id)) return false; order = order.filter((item) => item !== id); revision += 1; return true; },
    get(id) { return byId.get(id) || null; },
    has(id) { return byId.has(id); },
    list() { return order.map((id) => byId.get(id)).filter(Boolean); },
    ids() { return [...order]; },
    size() { return order.length; },
    clear() { byId.clear(); order = []; revision += 1; },
    setAll(drawings) { byId.clear(); order = []; drawings.forEach((drawing) => { byId.set(drawing.id, drawing); order.push(drawing.id); }); revision += 1; },
    replace(id, next) { if (!byId.has(id)) return null; byId.set(id, next); return next; },
    getMap() { return byId; },
    bringToFront(id) { if (!byId.has(id)) return; order = order.filter((item) => item !== id); order.push(id); revision += 1; },
    sendToBack(id) { if (!byId.has(id)) return; order = order.filter((item) => item !== id); order.unshift(id); revision += 1; },
    getRevision() { return revision; },
    // Spatial queries — O(bucket hits) when the index is warm.
    queryRange(fromTime, toTime) { ensureSpatial(); return [...spatial.queryRange(fromTime, toTime)]; },
    queryPoint(time, toleranceMs) { ensureSpatial(); return [...spatial.queryPoint(time, toleranceMs)]; },
  };
}
