'use client';
import { createSelectionManager } from '@/components/chart/drawing/SelectionManager';

// Reuses the legacy selection manager (ids, marquee, rect selection) and
// paints the TradingView-style selection chrome: a blue dashed outline
// around each selected drawing and the blue rubber-band marquee.
const SELECTION_COLOR = '#2962ff';
const SELECTION_FILL = 'rgba(41, 98, 255, 0.08)';

export function createOverlaySelection({ bus, layers, canvas }) {
  const manager = createSelectionManager({ bus, layers });
  const ctx = canvas?.getContext('2d') || null;

  const paint = (drawings, transform) => {
    if (!ctx) return;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!manager.isMarqueeActive() && !manager.count()) { ctx.restore(); return; }

    if (manager.isMarqueeActive()) {
      const rect = manager.marqueeRect();
      if (rect) {
        ctx.fillStyle = SELECTION_FILL;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        ctx.strokeStyle = SELECTION_COLOR;
        ctx.lineWidth = 1;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      }
    }

    if (manager.count()) {
      ctx.strokeStyle = 'rgba(41, 98, 255, 0.55)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      manager.ids().forEach((id) => {
        const drawing = drawings.find((item) => item.id === id);
        if (!drawing || !Array.isArray(drawing.anchorPoints)) return;
        const points = drawing.anchorPoints.map(transform.anchorToPixel).filter(Boolean);
        if (!points.length) return;
        const xs = points.map((p) => p.x);
        const ys = points.map((p) => p.y);
        const minX = Math.min(...xs) - 6;
        const maxX = Math.max(...xs) + 6;
        const minY = Math.min(...ys) - 6;
        const maxY = Math.max(...ys) + 6;
        ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
      });
      ctx.setLineDash([]);
    }
    ctx.restore();
  };

  return {
    ...manager,
    paint,
  };
}
