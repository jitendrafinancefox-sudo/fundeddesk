'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ThemeToggle from '@/components/ThemeToggle';

export default function Nav() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => load(session?.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setTimeout(() => load(session?.user || null), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function load(u) {
    setUser(u);
    if (u) {
      const { data } = await supabase.from('profiles').select('role').eq('id', u.id).single();
      setIsAdmin(data?.role === 'admin');
    } else setIsAdmin(false);
  }

  function logout() {
    try { supabase.auth.signOut({ scope: 'local' }).catch(() => {}); } catch (e) {}
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('sb-'))
        .forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch (e) {}
    setTimeout(() => window.location.replace('/'), 100);
  }

  const inAppRoute = pathname?.startsWith('/portal') || pathname?.startsWith('/admin') || pathname?.startsWith('/india') || pathname?.startsWith('/terminal') || pathname?.startsWith('/web-terminal');
  const publicPageButLoggedIn = user && (pathname === '/rules' || pathname === '/faq' || pathname === '/challenges');
  if (inAppRoute || publicPageButLoggedIn) return null;

  return (
    <nav className="top">
      <div className="wrap nav-in">
        <Link className="logo" href="/"><span className="logo-mark">◆</span>FundedDesk</Link>
        <div className="nav-links">
          <Link href="/#challenge-picker">Challenges</Link>
          <Link href="/about">About Us</Link>
          <Link href="/rules">Trading Rules</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/blog">Blog</Link>
          {user && <Link href="/portal/terminal" style={{ color: 'var(--blue)', fontWeight: 700 }}>Terminal</Link>}
          {user && <Link href="/portal">Dashboard</Link>}
          {isAdmin && <Link href="/admin" style={{ color: 'var(--gold)', fontWeight: 700 }}>Admin</Link>}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {pathname !== '/' && <ThemeToggle />}
          {user ? (
            <button className="btn btn-line btn-sm" onClick={logout}>Log out</button>
          ) : (
            <>
              <Link className="btn btn-line btn-sm" href="/login">Log in</Link>
              <Link className="btn btn-grad btn-sm" href="/signup">Get Funded</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
