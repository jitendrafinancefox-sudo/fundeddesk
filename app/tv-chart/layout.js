'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function TVChartLayout({ children }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return; }
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--grad)', margin: '0 auto 14px' }} />
          <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>Loading terminal…</p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}