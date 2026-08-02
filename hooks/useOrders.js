import { useCallback } from 'react';

// The current Angel terminal is intentionally simulated. Keeping the mutation
// boundary here allows a persistent server-authorized order service to replace it.
export function useOrders({ positions, setPositions, onClose }) {
  const openOrder = useCallback((order) => {
    const position = { ...order, id: order.id || crypto.randomUUID(), openedAt: new Date() };
    setPositions((current) => [position, ...current]);
    return position;
  }, [setPositions]);
  const closeOrder = useCallback((id, reason) => {
    setPositions((current) => current.filter((position) => position.id !== id));
    onClose?.(id, reason);
  }, [onClose, setPositions]);
  return { openOrder, closeOrder };
}
