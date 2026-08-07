export function buildCrosshairOptions(theme) {
  return {
    mode: 'normal',
    vertLine: { color: theme.crosshair, labelBackgroundColor: theme.crosshair },
    horzLine: { color: theme.crosshair, labelBackgroundColor: theme.crosshair },
  };
}

export function createCrosshairRegistry() {
  const subscribers = new Set();
  return {
    subscribe(callback) {
      subscribers.add(callback);
      return () => subscribers.delete(callback);
    },
    unsubscribe(callback) {
      subscribers.delete(callback);
    },
    emit(payload) {
      subscribers.forEach((callback) => {
        try {
          callback(payload);
        } catch {
          /* subscriber errors must not break the chart */
        }
      });
    },
    get size() {
      return subscribers.size;
    },
  };
}
