import { create } from "zustand";
import type { Order, OrderDraft, Position } from "@v2/types";
import { eventBus } from "@v2/engine/events";
import { uid } from "@v2/utils/id";

interface OrderStoreState {
  orders: Order[];
  positions: Position[];
  draft: OrderDraft | null;
  setOrders: (orders: Order[]) => void;
  addOrder: (order: Order) => void;
  upsertOrder: (order: Order) => void;
  removeOrder: (orderId: string) => void;
  setDraft: (draft: OrderDraft | null) => void;
  setPositions: (positions: Position[]) => void;
  upsertPosition: (position: Position) => void;
  closePosition: (positionId: string) => void;
}

export const useOrderStore = create<OrderStoreState>()((set, get) => ({
  orders: [],
  positions: [],
  draft: null,

  setOrders: (orders) => set({ orders }),

  addOrder: (order) => {
    set((state) => ({ orders: [...state.orders, order] }));
    eventBus.emit("order:placed", order);
  },

  upsertOrder: (order) => {
    set((state) => {
      const exists = state.orders.some((existing) => existing.id === order.id);
      return {
        orders: exists
          ? state.orders.map((existing) => (existing.id === order.id ? order : existing))
          : [...state.orders, order],
      };
    });
    eventBus.emit("order:updated", order);
  },

  removeOrder: (orderId) => set((state) => ({ orders: state.orders.filter((order) => order.id !== orderId) })),

  setDraft: (draft) => set({ draft }),

  setPositions: (positions) => set({ positions }),

  upsertPosition: (position) => {
    set((state) => {
      const exists = state.positions.some((existing) => existing.id === position.id);
      return {
        positions: exists
          ? state.positions.map((existing) => (existing.id === position.id ? position : existing))
          : [...state.positions, position],
      };
    });
    eventBus.emit("position:updated", position);
  },

  closePosition: (positionId) => set((state) => ({ positions: state.positions.filter((position) => position.id !== positionId) })),
}));

export function buildOrderId(): string {
  return uid("order");
}
