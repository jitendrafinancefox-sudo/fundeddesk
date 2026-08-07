'use client';
import { useEffect, useRef, useState } from 'react';

const COLORS = ['#2962ff', '#e53935', '#43a047', '#fb8c00', '#8e24aa', '#00acc1', '#ffffff', '#787b86'];
const WIDTHS = [1, 1.5, 2, 3, 4];

export default function DrawingFlyout({ drawing, position, onStyle, onDelete, onClose }) {
  const ref = useRef(null);
  const [color, setColor] = useState(drawing?.style?.color || '#2962ff');
  const [lineWidth, setLineWidth] = useState(drawing?.style?.lineWidth || 1.5);

  useEffect(() => {
    setColor(drawing?.style?.color || '#2962ff');
    setLineWidth(drawing?.style?.lineWidth || 1.5);
  }, [drawing?.id]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!drawing || !position) return null;

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y - 44,
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: '#ffffff',
        border: '1px solid #e0e3eb',
        borderRadius: 4,
        padding: '4px 6px',
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Color picker */}
      {COLORS.map((c) => (
        <button
          key={c}
          onClick={() => { setColor(c); onStyle({ color: c }); }}
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: c,
            border: color === c ? '2px solid #131722' : '2px solid transparent',
            cursor: 'pointer',
            padding: 0,
          }}
        />
      ))}

      {/* Separator */}
      <div style={{ width: 1, height: 20, background: '#e0e3eb', margin: '0 4px' }} />

      {/* Line width */}
      {WIDTHS.map((w) => (
        <button
          key={w}
          onClick={() => { setLineWidth(w); onStyle({ lineWidth: w }); }}
          style={{
            width: 24,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: lineWidth === w ? 'rgba(41,98,255,0.08)' : 'transparent',
            border: 'none',
            borderRadius: 3,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <div style={{ width: 16, height: Math.max(1, w), background: color, borderRadius: 1 }} />
        </button>
      ))}

      {/* Separator */}
      <div style={{ width: 1, height: 20, background: '#e0e3eb', margin: '0 4px' }} />

      {/* Delete */}
      <button
        onClick={onDelete}
        style={{
          width: 24,
          height: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: 'none',
          borderRadius: 3,
          cursor: 'pointer',
          color: '#787b86',
          fontSize: 12,
          padding: 0,
        }}
        title="Delete"
      >
        ✕
      </button>
    </div>
  );
}
