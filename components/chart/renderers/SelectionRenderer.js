'use client';
export function SelectionRenderer({ drawings = [], transform }) { return (ctx) => { if (!drawings.length) return; ctx.save(); ctx.fillStyle = '#4d7cfe'; drawings.forEach((drawing) => drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean).forEach((point) => ctx.fillRect(point.x - 3, point.y - 3, 6, 6))); ctx.restore(); }; }
