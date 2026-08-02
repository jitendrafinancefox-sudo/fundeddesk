// Provider-neutral subscription lifecycle. The Angel relay can expose a WebSocket
// later without leaking provider details into terminal components.
export function createWebSocketSubscription(url, { onMessage, onStatus, onError } = {}) {
  let socket;
  let closed = false;
  function connect() {
    onStatus?.('connecting');
    socket = new WebSocket(url);
    socket.onopen = () => onStatus?.('connected');
    socket.onmessage = (event) => onMessage?.(event);
    socket.onerror = (event) => { onStatus?.('error'); onError?.(event); };
    socket.onclose = () => { if (!closed) onStatus?.('disconnected'); };
  }
  connect();
  return { send: (value) => socket?.readyState === WebSocket.OPEN && socket.send(value), close: () => { closed = true; socket?.close(); } };
}
