'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const pathname = usePathname();
  const isLanding = pathname === '/';
  const [dark, setDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  // This effect is ALWAYS mounted (the component never fully unmounts on
  // navigation since it lives in the root layout) and re-runs on every
  // route change. On the landing page it force-applies dark mode
  // regardless of saved preference, so light mode can never leak into
  // the landing hero. Everywhere else it restores the saved choice.
  useEffect(() => {
    if (isLanding) {
      document.documentElement.classList.remove('light-theme');
      setDark(true);
    } else {
      const saved = localStorage.getItem('fd-theme');
      const isLight = saved === 'light';
      document.documentElement.classList.toggle('light-theme', isLight);
      setDark(!isLight);
    }
    setMounted(true);
  }, [isLanding]);

  function toggle() {
    const nowDark = !dark;
    setDark(nowDark);
    document.documentElement.classList.toggle('light-theme', !nowDark);
    localStorage.setItem('fd-theme', nowDark ? 'dark' : 'light');
  }

  if (isLanding || !mounted) return null;

  return (
    <button
      onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        position: 'fixed', top: 78, right: 22, zIndex: 9999,
        width: 46, height: 46, borderRadius: '50%',
        border: '1px solid var(--line2)', background: 'var(--card)',
        backdropFilter: 'blur(10px)', boxShadow: '0 8px 24px rgba(0,0,0,.15)',
        display: 'grid', placeItems: 'center', cursor: 'pointer',
        color: dark ? 'var(--muted)' : 'var(--gold)', transition: 'transform .15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'none')}
    >
      {dark ? <Moon size={19} /> : <Sun size={19} />}
    </button>
  );
}
