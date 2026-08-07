'use client';
import { LayoutProvider, useLayout } from './LayoutContext';

export default function TerminalRoot({ children }) {
  return (
    <LayoutProvider>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          color: '#222222',
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
    </LayoutProvider>
  );
}
