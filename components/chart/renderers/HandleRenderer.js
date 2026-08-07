'use client';
import { handleGeometry } from '../interaction/HandleGeometry';
import { themeTokens } from '../engine/ThemeManager';

const HANDLE_FILL = '#ffffff';
const HANDLE_HOVER_FILL = '#2962ff';
const HANDLE_STROKE = '#2962ff';
const HANDLE_HOVER_STROKE = '#ffffff';
const HANDLE_SIZE = 7;
const HANDLE_HOVER_SIZE = 9;

export function HandleRenderer({ drawings = [], transform, hover = null, visible = true, pointEditId = null }) {
  return (ctx) => {
    if (!visible || !drawings.length) return;
    const theme = themeTokens();
    ctx.save();
    const isHovered = (drawingId, kind, index) => Boolean(hover && hover.id === drawingId && hover.kind === kind && (kind !== 'anchor' || hover.anchorIndex === index));
    const anchorHandle = (x, y, active) => {
      const size = active ? HANDLE_HOVER_SIZE : HANDLE_SIZE;
      ctx.beginPath();
      ctx.rect(x - size / 2, y - size / 2, size, size);
      ctx.fillStyle = active ? HANDLE_HOVER_FILL : HANDLE_FILL;
      ctx.strokeStyle = active ? HANDLE_HOVER_STROKE : HANDLE_STROKE;
      ctx.fill();
      ctx.stroke();
    };
    const dotHandle = (x, y, active, size = 5) => {
      ctx.beginPath();
      ctx.arc(x, y, active ? size + 1 : size, 0, Math.PI * 2);
      ctx.fillStyle = active ? HANDLE_HOVER_FILL : HANDLE_FILL;
      ctx.strokeStyle = HANDLE_STROKE;
      ctx.fill();
      ctx.stroke();
    };
    const outlineHandle = (x, y, active, size = 6) => {
      ctx.beginPath();
      ctx.rect(x - size / 2, y - size / 2, size, size);
      ctx.strokeStyle = HANDLE_STROKE;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };
    drawings.forEach((drawing) => {
      const inPointEdit = pointEditId === drawing.id;
      const geometry = handleGeometry(drawing, transform, { pointEdit: inPointEdit });
      ctx.save();
      ctx.lineWidth = 1.5;
      if (geometry.stroke) {
        if (drawing.drawingType === 'curve' && drawing.anchorPoints.length === 4) {
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = theme.alpha(theme.accent, 0.55);
          ctx.beginPath();
          const [p0, c1, c2, p3] = geometry.anchors;
          ctx.moveTo(p0.x, p0.y); ctx.lineTo(c1.x, c1.y);
          ctx.moveTo(c2.x, c2.y); ctx.lineTo(p3.x, p3.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        geometry.anchors.forEach((anchor) => {
          const active = isHovered(drawing.id, 'anchor', anchor.index);
          if (geometry.pointEdit) {
            dotHandle(anchor.x, anchor.y, active, 4);
          } else {
            anchorHandle(anchor.x, anchor.y, active);
          }
        });
        if (geometry.insertPoints) {
          geometry.insertPoints.forEach((p) => {
            const active = Boolean(hover && hover.id === drawing.id && hover.kind === 'insert' && hover.from === p.from && hover.to === p.to);
            dotHandle(p.x, p.y, active, 4);
          });
        }
        if (geometry.midpoint) {
          const active = isHovered(drawing.id, 'midpoint', -1);
          anchorHandle(geometry.midpoint.x, geometry.midpoint.y, active);
        }
      } else if (geometry.position) {
        geometry.anchors.forEach((anchor) => {
          const active = isHovered(drawing.id, 'anchor', anchor.index);
          anchorHandle(anchor.x, anchor.y, active);
        });
        if (geometry.center) {
          const active = isHovered(drawing.id, 'center', -1);
          outlineHandle(geometry.center.x, geometry.center.y, active);
        }
      } else if (geometry.text) {
        geometry.anchors.forEach((anchor) => {
          const active = isHovered(drawing.id, 'anchor', anchor.index);
          anchorHandle(anchor.x, anchor.y, active);
        });
        if (geometry.size) {
          const active = isHovered(drawing.id, 'size', -1);
          anchorHandle(geometry.size.x, geometry.size.y, active);
        }
        if (geometry.center) {
          const active = isHovered(drawing.id, 'center', -1);
          outlineHandle(geometry.center.x, geometry.center.y, active);
        }
        if (geometry.rotation) {
          ctx.setLineDash([2, 2]);
          ctx.strokeStyle = theme.alpha(theme.accent, 0.7);
          ctx.beginPath(); ctx.moveTo(geometry.center.x, geometry.center.y);
          ctx.lineTo(geometry.rotation.x, geometry.rotation.y); ctx.stroke();
          ctx.setLineDash([]);
          const active = isHovered(drawing.id, 'rotation', -1);
          dotHandle(geometry.rotation.x, geometry.rotation.y, active, 5);
        }
      } else if (geometry.shape) {
        ctx.beginPath();
        geometry.corners.forEach((corner, i) => (i ? ctx.lineTo(corner.x, corner.y) : ctx.moveTo(corner.x, corner.y)));
        ctx.closePath();
        ctx.strokeStyle = HANDLE_STROKE;
        ctx.lineWidth = 1;
        ctx.stroke();
        geometry.corners.forEach((corner) => {
          const active = isHovered(drawing.id, 'anchor', corner.index);
          anchorHandle(corner.x, corner.y, active);
        });
        geometry.edges.forEach((edge, i) => {
          const active = isHovered(drawing.id, 'edge', i);
          dotHandle(edge.mid.x, edge.mid.y, active, 5);
        });
        const centerActive = isHovered(drawing.id, 'center', -1);
        outlineHandle(geometry.center.x, geometry.center.y, centerActive);
        if (geometry.rotation) {
          ctx.setLineDash([2, 2]);
          ctx.strokeStyle = theme.alpha(theme.accent, 0.7);
          ctx.beginPath(); ctx.moveTo(geometry.corners[0].x, geometry.corners[0].y);
          ctx.lineTo(geometry.rotation.x, geometry.rotation.y); ctx.stroke();
          ctx.setLineDash([]);
          const active = isHovered(drawing.id, 'rotation', -1);
          dotHandle(geometry.rotation.x, geometry.rotation.y, active, 5);
        }
      } else if (geometry.channel) {
        geometry.anchors.forEach((anchor) => {
          const active = isHovered(drawing.id, 'anchor', anchor.index);
          anchorHandle(anchor.x, anchor.y, active);
        });
        if (geometry.widthHandle) {
          const active = isHovered(drawing.id, 'width', -1);
          dotHandle(geometry.widthHandle.x, geometry.widthHandle.y, active, 5);
        }
        if (geometry.center) {
          const active = isHovered(drawing.id, 'center', -1);
          outlineHandle(geometry.center.x, geometry.center.y, active);
        }
        if (geometry.midpoint) {
          const active = isHovered(drawing.id, 'midpoint', -1);
          anchorHandle(geometry.midpoint.x, geometry.midpoint.y, active);
        }
        if (geometry.rotation) {
          const active = isHovered(drawing.id, 'rotation', -1);
          dotHandle(geometry.rotation.x, geometry.rotation.y, active, 4);
        }
      } else {
        geometry.anchors.forEach((anchor) => {
          const active = isHovered(drawing.id, 'anchor', anchor.index);
          anchorHandle(anchor.x, anchor.y, active);
        });
        if (geometry.midpoint) {
          const active = isHovered(drawing.id, 'midpoint', -1);
          anchorHandle(geometry.midpoint.x, geometry.midpoint.y, active);
        }
        if (geometry.rotation) {
          const active = isHovered(drawing.id, 'rotation', -1);
          dotHandle(geometry.rotation.x, geometry.rotation.y, active, 4);
        }
      }
      ctx.restore();
    });
    ctx.restore();
  };
}
