'use client';
import { drawingStore, updateDrawings } from '@/stores/drawingStore';
export { drawingStore };
export const getDrawings = (key) => drawingStore.getState().byChart[key] || [];
export const setDrawings = (key, drawings) => updateDrawings(key, () => drawings);
