'use client';

// Background grid. When the engine supplies tick arrays (which it does for
// every normal frame), horizontal lines are drawn exactly at the price ticks
// and vertical lines at the time ticks — so grid, axis labels, and crosshair
// share one set of coordinates. Falls back to a fixed row/column grid only
// when no candles are loaded yet.
export function GridRenderer({ viewport, priceTicks = [], timeTicks = [], color = 'rgba(255,255,255,.05)' }) { return (ctx) => { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1; if (priceTicks.length || timeTicks.length) { priceTicks.forEach(({ y }) => { if (y < 0 || y > viewport.state.height) return; const yy = Math.round(y) + 0.5; ctx.beginPath(); ctx.moveTo(0, yy); ctx.lineTo(viewport.state.width, yy); ctx.stroke(); }); timeTicks.forEach(({ x }) => { if (x < 0 || x > viewport.state.width) return; const xx = Math.round(x) + 0.5; ctx.beginPath(); ctx.moveTo(xx, 0); ctx.lineTo(xx, viewport.state.height); ctx.stroke(); }); } else { for (let row = 1; row < 6; row += 1) { const y = Math.round((viewport.state.height / 6) * row) + 0.5; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(viewport.state.width, y); ctx.stroke(); } for (let column = 1; column < 8; column += 1) { const x = Math.round((viewport.state.width / 8) * column) + 0.5; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, viewport.state.height); ctx.stroke(); } } ctx.restore(); }; }
