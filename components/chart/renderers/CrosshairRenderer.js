'use client';
export function CrosshairRenderer({ crosshair, viewport }) { return (ctx) => { if (!crosshair) return; ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(152,162,184,.7)'; ctx.beginPath(); ctx.moveTo(crosshair.x, 0); ctx.lineTo(crosshair.x, viewport.state.height); ctx.moveTo(0, crosshair.y); ctx.lineTo(viewport.state.width, crosshair.y); ctx.stroke(); ctx.restore(); }; }
