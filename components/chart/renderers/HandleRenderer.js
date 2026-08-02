'use client';
import { handleGeometry } from '../interaction/HandleGeometry';

// TradingView-style selection handles: square corner handles, mid-edge
// handles and a center move handle on shapes (plus a rotation handle with
// connector line when the shape is rotation-ready); square anchor handles,
// a small midpoint handle and a rotation handle on single-segment drawings.
// The hovered handle scales up and inverts so the pointer target is
// unambiguous. Handles are only painted for selected drawings while no
// drawing tool is being placed.
export function HandleRenderer({ drawings = [], transform, hover = null, visible = true, pointEditId = null }) {
  return (ctx) => {
    if (!visible || !drawings.length) return;
    ctx.save();
    const isHovered = (drawingId, kind, index) => Boolean(hover && hover.id === drawingId && hover.kind === kind && (kind !== 'anchor' || hover.anchorIndex === index));
    const square = (x, y, size, filled) => {
      ctx.beginPath(); ctx.rect(x - size / 2, y - size / 2, size, size);
      if (filled) { ctx.fill(); ctx.stroke(); } else { ctx.stroke(); }
    };
    drawings.forEach((drawing) => {
      const inPointEdit = pointEditId === drawing.id;
      const geometry = handleGeometry(drawing, transform, { pointEdit: inPointEdit });
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 2; ctx.shadowOffsetY = 1;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#4d7cfe'; ctx.fillStyle = '#ffffff';
      if (geometry.stroke) {
        // Curve control polygon so bezier handles are obvious while editing.
        if (drawing.drawingType === 'curve' && drawing.anchorPoints.length === 4) {
          ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(77,124,254,.55)';
          ctx.beginPath();
          const [p0, c1, c2, p3] = geometry.anchors;
          ctx.moveTo(p0.x, p0.y); ctx.lineTo(c1.x, c1.y);
          ctx.moveTo(c2.x, c2.y); ctx.lineTo(p3.x, p3.y);
          ctx.stroke();
          ctx.setLineDash([]); ctx.strokeStyle = '#4d7cfe';
        }
        geometry.anchors.forEach((anchor) => {
          const active = isHovered(drawing.id, 'anchor', anchor.index);
          if (geometry.pointEdit) {
            ctx.fillStyle = active ? '#4d7cfe' : '#ffffff';
            ctx.strokeStyle = '#4d7cfe';
            ctx.beginPath(); ctx.arc(anchor.x, anchor.y, active ? 5.5 : 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          } else {
            ctx.fillStyle = active ? '#4d7cfe' : '#ffffff';
            ctx.strokeStyle = '#4d7cfe';
            square(anchor.x, anchor.y, active ? 9 : 7, true);
          }
        });
        if (geometry.insertPoints) {
          geometry.insertPoints.forEach((p) => {
            const active = Boolean(hover && hover.id === drawing.id && hover.kind === 'insert' && hover.from === p.from && hover.to === p.to);
            ctx.fillStyle = active ? '#ffffff' : '#4d7cfe';
            ctx.strokeStyle = '#4d7cfe';
            ctx.beginPath(); ctx.arc(p.x, p.y, active ? 5 : 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          });
        }
        if (geometry.midpoint) {
          const active = isHovered(drawing.id, 'midpoint', -1);
          ctx.fillStyle = active ? '#ffffff' : '#4d7cfe';
          ctx.strokeStyle = '#4d7cfe';
          square(geometry.midpoint.x, geometry.midpoint.y, active ? 7 : 5, true);
        }
      } else if (geometry.shape) {
        // Shape outline so the editable region is obvious.
        ctx.beginPath();
        geometry.corners.forEach((corner, i) => (i ? ctx.lineTo(corner.x, corner.y) : ctx.moveTo(corner.x, corner.y)));
        ctx.closePath(); ctx.stroke();
        geometry.corners.forEach((corner) => {
          const active = isHovered(drawing.id, 'anchor', corner.index);
          ctx.fillStyle = active ? '#4d7cfe' : '#ffffff';
          ctx.strokeStyle = '#4d7cfe';
          square(corner.x, corner.y, active ? 9 : 7, true);
        });
        geometry.edges.forEach((edge, i) => {
          const active = isHovered(drawing.id, 'edge', i);
          ctx.fillStyle = active ? '#ffffff' : '#4d7cfe';
          ctx.strokeStyle = '#4d7cfe';
          square(edge.mid.x, edge.mid.y, active ? 8 : 6, true);
        });
        const centerActive = isHovered(drawing.id, 'center', -1);
        ctx.fillStyle = centerActive ? '#ffffff' : '#4d7cfe';
        ctx.strokeStyle = '#4d7cfe';
        square(geometry.center.x, geometry.center.y, centerActive ? 9 : 6, false);
        if (geometry.rotation) {
          ctx.setLineDash([2, 2]);
          ctx.strokeStyle = 'rgba(77,124,254,.7)';
          ctx.beginPath(); ctx.moveTo(geometry.corners[0].x, geometry.corners[0].y);
          ctx.lineTo(geometry.rotation.x, geometry.rotation.y); ctx.stroke();
          ctx.setLineDash([]);
          const active = isHovered(drawing.id, 'rotation', -1);
          ctx.fillStyle = active ? '#ffffff' : '#4d7cfe';
          ctx.strokeStyle = '#4d7cfe';
          ctx.beginPath(); ctx.arc(geometry.rotation.x, geometry.rotation.y, active ? 6 : 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      } else if (geometry.channel) {
        geometry.anchors.forEach((anchor) => {
          const active = isHovered(drawing.id, 'anchor', anchor.index);
          ctx.fillStyle = active ? '#4d7cfe' : '#ffffff';
          ctx.strokeStyle = '#4d7cfe';
          square(anchor.x, anchor.y, active ? 9 : 7, true);
        });
        if (geometry.widthHandle) {
          const active = isHovered(drawing.id, 'width', -1);
          ctx.fillStyle = active ? '#ffffff' : '#4d7cfe';
          ctx.strokeStyle = '#4d7cfe';
          ctx.beginPath(); ctx.arc(geometry.widthHandle.x, geometry.widthHandle.y, active ? 6 : 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
        if (geometry.center) {
          const active = isHovered(drawing.id, 'center', -1);
          ctx.fillStyle = active ? '#ffffff' : '#4d7cfe';
          ctx.strokeStyle = '#4d7cfe';
          square(geometry.center.x, geometry.center.y, active ? 9 : 6, false);
        }
        if (geometry.midpoint) {
          const active = isHovered(drawing.id, 'midpoint', -1);
          ctx.fillStyle = active ? '#ffffff' : '#4d7cfe';
          ctx.strokeStyle = '#4d7cfe';
          square(geometry.midpoint.x, geometry.midpoint.y, active ? 7 : 5, true);
        }
        if (geometry.rotation) {
          const active = isHovered(drawing.id, 'rotation', -1);
          ctx.fillStyle = active ? '#ffffff' : '#4d7cfe';
          ctx.strokeStyle = '#4d7cfe';
          ctx.beginPath(); ctx.arc(geometry.rotation.x, geometry.rotation.y, active ? 5 : 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      } else {
        geometry.anchors.forEach((anchor) => {
          const active = isHovered(drawing.id, 'anchor', anchor.index);
          ctx.fillStyle = active ? '#4d7cfe' : '#ffffff';
          ctx.strokeStyle = '#4d7cfe';
          square(anchor.x, anchor.y, active ? 9 : 7, true);
        });
        if (geometry.midpoint) {
          const active = isHovered(drawing.id, 'midpoint', -1);
          ctx.fillStyle = active ? '#ffffff' : '#4d7cfe';
          ctx.strokeStyle = '#4d7cfe';
          square(geometry.midpoint.x, geometry.midpoint.y, active ? 7 : 5, true);
        }
        if (geometry.rotation) {
          const active = isHovered(drawing.id, 'rotation', -1);
          ctx.fillStyle = active ? '#ffffff' : '#4d7cfe';
          ctx.strokeStyle = '#4d7cfe';
          ctx.beginPath(); ctx.arc(geometry.rotation.x, geometry.rotation.y, active ? 5 : 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }
      }
      ctx.restore();
    });
    ctx.restore();
  };
}
