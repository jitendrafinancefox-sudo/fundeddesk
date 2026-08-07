'use client';

// Single source of truth for the axis strip geometry. The price axis is drawn
// as a fixed strip on the right that the plot area (TimeScale, grid, candles,
// crosshair) respects; the time axis is a fixed strip at the bottom. Every
// renderer imports these so a spacing change cannot desync the canvas.
export const PRICE_AXIS_W = 58;
export const TIME_AXIS_H = 28;