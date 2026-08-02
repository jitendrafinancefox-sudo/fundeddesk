'use client';

// Right-side price labels. Positions and values come from PriceScale.getTicks
// (nice 1/2/2.5/5×10^n steps), so the labels always agree with the grid and
// never wobble while zooming/panning.
export function AxisRenderer({ viewport, priceTicks = [] }) { return (ctx) => { ctx.save(); ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = '#98A2B8'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; const x = Math.max(4, viewport.state.width - 60); priceTicks.forEach(({ y, label }) => { ctx.fillText(label, viewport.state.width - 60, y); }); ctx.restore(); }; }
