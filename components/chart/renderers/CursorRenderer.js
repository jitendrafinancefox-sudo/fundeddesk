'use client';
export function CursorRenderer({ cursor }) { return (ctx) => { if (!cursor?.label) return; ctx.save(); ctx.fillStyle = 'rgba(12,18,28,.9)'; ctx.fillRect(cursor.x + 10, cursor.y + 10, 118, 22); ctx.fillStyle = '#e8edf5'; ctx.font = '11px Inter, sans-serif'; ctx.fillText(cursor.label, cursor.x + 16, cursor.y + 25); ctx.restore(); }; }
