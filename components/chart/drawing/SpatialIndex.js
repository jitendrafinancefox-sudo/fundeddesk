'use client';

// Uniform time-grid index over drawing anchor timestamps. Hit testing and
// visible-range queries become O(bucket hits) instead of O(all drawings).
// Rebuilt on demand; the registry's revision guards staleness.
const BUCKET_SPAN_MS = 60 * 60 * 1000; // 1 hour per bucket — drawings span hours/days

export function createSpatialIndex() {
  let buckets = new Map(); // bucketKey -> Set<id>
  let minTime = Infinity; let maxTime = -Infinity;
  const keyOf = (time) => Math.floor(time / BUCKET_SPAN_MS);

  return {
    // Index every anchor of every drawing (an anchor far in the past still
    // needs to be findable for hit testing).
    rebuild(drawings) {
      buckets = new Map(); minTime = Infinity; maxTime = -Infinity;
      drawings.forEach((drawing) => {
        drawing.anchorPoints.forEach((anchor) => {
          const key = keyOf(anchor.time);
          if (!buckets.has(key)) buckets.set(key, new Set());
          buckets.get(key).add(drawing.id);
          if (anchor.time < minTime) minTime = anchor.time;
          if (anchor.time > maxTime) maxTime = anchor.time;
        });
      });
    },
    // Candidate ids whose anchors could be within `toleranceMs` of `time`.
    queryPoint(time, toleranceMs) {
      const results = new Set();
      const from = keyOf(time - toleranceMs); const to = keyOf(time + toleranceMs);
      for (let key = from; key <= to; key += 1) buckets.get(key)?.forEach((id) => results.add(id));
      return results;
    },
    // Candidate ids that could be visible inside [fromTime, toTime].
    queryRange(fromTime, toTime) {
      const results = new Set();
      const from = keyOf(fromTime); const to = keyOf(toTime);
      for (let key = from; key <= to; key += 1) buckets.get(key)?.forEach((id) => results.add(id));
      return results;
    },
    clear() { buckets = new Map(); minTime = Infinity; maxTime = -Infinity; },
    isEmpty() { return buckets.size === 0; },
  };
}
