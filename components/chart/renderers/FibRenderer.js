'use client';
import { renderDrawing } from '../drawing/DrawingDefinitions';

// Dedicated render pass for Fibonacci drawings (retracement / extension /
// projection / fan / channel / spiral / time zone). Fib geometries paint
// full-width level lines, rays and time bands, so they get their own thread
// below the line thread; selection is communicated by handles, not by
// repainting.
export function FibRenderer({ drawings, transform }) {
  return (ctx) => {
    drawings.forEach((drawing) => {
      const points = drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
      if (!points.length) return;
      const [a, b = a] = points;
      ctx.save();
      renderDrawing(ctx, drawing, a, b, transform);
      ctx.restore();
    });
  };
}
