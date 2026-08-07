export function attachResize(container, onResize) {
  if (typeof window === 'undefined' || typeof ResizeObserver === 'undefined') return () => {};
  let frame = 0;
  const observer = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => onResize());
  });
  observer.observe(container);
  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
  };
}

export function resizeToContainer(chart, container) {
  const { clientWidth, clientHeight } = container;
  if (clientWidth > 0 && clientHeight > 0) chart.resize(clientWidth, clientHeight);
}
