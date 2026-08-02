'use client';
import { renderDrawing } from '../drawing/DrawingDefinitions';

// Dedicated render pass for channel drawings (parallel / flat / disjoint /
// regression / linear regression). Channels paint translucent bands plus
// multiple extended lines, so they get their own thread below the line
// thread; selection is communicated by handles, not by repainting.
export function ChannelRenderer({ drawings, transform }) {
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
