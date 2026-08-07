'use client';
import { createSerializationManager } from '@/components/chart/drawing/SerializationManager';

// Reuses the legacy serialization envelope untouched (v8: groups, text,
// position, stroke, fib payloads) — drawings persist to localStorage under
// the same drawingPersistence service with a per-chart chartKey.
export function createOverlaySerialization({ chartKey, debounceMs = 500 }) {
  const manager = createSerializationManager({ chartKey, debounceMs });
  return {
    load() { return manager.load(); },
    save(drawings) { manager.save(drawings); },
    flush(drawings) { manager.flush(drawings); },
    remove() { manager.remove(); },
  };
}
