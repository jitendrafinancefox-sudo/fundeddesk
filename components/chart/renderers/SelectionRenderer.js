'use client';
export function SelectionRenderer({ drawing, transform }) { return (ctx) => { if (!drawing) return; ctx.save(); ctx.fillStyle = '#4d7cfe'; drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean).forEach((point) => ctx.fillRect(point.x - 3, point.y - 3, 6, 6)); ctx.restore(); }; }
