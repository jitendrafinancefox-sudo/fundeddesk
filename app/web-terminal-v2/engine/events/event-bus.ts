import type { EventKey, EventMap } from "@v2/types";

type Listener<Key extends EventKey> = (payload: EventMap[Key]) => void;

type AnyListener = (payload: EventMap[EventKey]) => void;

interface ListenerEntry {
  listener: AnyListener;
  once: boolean;
}

export class EventBus {
  private listeners = new Map<EventKey, Set<ListenerEntry>>();

  on<Key extends EventKey>(key: Key, listener: Listener<Key>): () => void {
    const entries = this.listeners.get(key) ?? new Set<ListenerEntry>();
    entries.add({ listener: listener as AnyListener, once: false });
    this.listeners.set(key, entries);
    return () => this.off(key, listener);
  }

  once<Key extends EventKey>(key: Key, listener: Listener<Key>): () => void {
    const entries = this.listeners.get(key) ?? new Set<ListenerEntry>();
    entries.add({ listener: listener as AnyListener, once: true });
    this.listeners.set(key, entries);
    return () => this.off(key, listener);
  }

  off<Key extends EventKey>(key: Key, listener: Listener<Key>): void {
    const entries = this.listeners.get(key);
    if (!entries) {
      return;
    }
    entries.forEach((entry) => {
      if (entry.listener === listener) {
        entries.delete(entry);
      }
    });
  }

  emit<Key extends EventKey>(key: Key, payload: EventMap[Key]): void {
    const entries = this.listeners.get(key);
    if (!entries) {
      return;
    }
    for (const entry of [...entries]) {
      if (entry.once) {
        entries.delete(entry);
      }
      entry.listener(payload as EventMap[EventKey]);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

export const eventBus = new EventBus();
