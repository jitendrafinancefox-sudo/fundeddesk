'use client';
export function drawOverlay(ctx, drawings, coordinateSystem, selectedId) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  drawings.forEach((drawing) => {
    const a = coordinateSystem.toPoint(drawing.start), b = coordinateSystem.toPoint(drawing.end || drawing.start);
    if (!a || !b) return;
    ctx.strokeStyle = drawing.id === selectedId ? '#4d7cfe' : '#f5b93e'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 1.5;
    if (drawing.type === 'hline') { ctx.beginPath(); ctx.moveTo(0, a.y); ctx.lineTo(ctx.canvas.width, a.y); ctx.stroke(); }
    else if (drawing.type === 'rect') { ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y); }
    else if (drawing.type === 'text') { ctx.fillText(drawing.text || 'Note', a.x, a.y); }
    else { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  });
}
