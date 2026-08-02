'use client';
export function createEventBus() {
  const handlers = new Map();
  return {
    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(handler);
      return () => this.off(event, handler);
    },
    off(event, handler) { handlers.get(event)?.delete(handler); },
    emit(event, payload) { handlers.get(event)?.forEach((handler) => { try { handler(payload); } catch (error) { console.error(`[EventBus:${event}]`, error); } }); },
    clear() { handlers.clear(); },
  };
}
