'use client';
export function AxisRenderer({ viewport, transform }) { return (ctx) => { ctx.save(); ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = '#98A2B8'; const steps = 6; for (let i = 0; i <= steps; i += 1) { const y = (viewport.state.height / steps) * i; ctx.fillText(transform.pixelToPrice(y).toFixed(2), Math.max(4, viewport.state.width - 58), y - 3); } ctx.restore(); }; }
