const keyFor = (chartKey) => `fundeddesk:drawings:${chartKey}`;
export const drawingPersistence = {
  load(chartKey) { try { return JSON.parse(localStorage.getItem(keyFor(chartKey)) || '[]'); } catch { return []; } },
  save(chartKey, drawings) { try { localStorage.setItem(keyFor(chartKey), JSON.stringify(drawings)); } catch {} },
  remove(chartKey) { try { localStorage.removeItem(keyFor(chartKey)); } catch {} },
};
