'use client';

// Bottom time/date labels. Positions and values come from TimeScale.getTicks
// (wall-clock aligned nice steps), so labels stay readable and stable across
// zoom/pan and always line up with the grid columns.
export function TimeAxisRenderer({ viewport, timeTicks = [] }) { return (ctx) => { if (!timeTicks.length) return; ctx.save(); ctx.font = '11px Inter, sans-serif'; ctx.fillStyle = '#98A2B8'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; timeTicks.forEach(({ x, label }) => { ctx.fillText(label, x, viewport.state.height - 6); }); ctx.restore(); }; }
