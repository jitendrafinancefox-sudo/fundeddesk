'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { signOutLocal } from '@/lib/auth';
import ThemeToggle from '@/components/ThemeToggle';

export default function Nav() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const hamburgerRef = useRef(null);
  const drawerRef = useRef(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => load(session?.user || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setTimeout(() => load(session?.user || null), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the drawer whenever navigation actually happens (covers Link clicks reliably).
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Focus trap + Escape-to-close + background scroll lock, active only while the drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const drawer = drawerRef.current;
    const focusables = drawer ? Array.from(drawer.querySelectorAll('a[href], button:not([disabled])')) : [];
    focusables[0]?.focus();

    function onKeyDown(e) {
      if (e.key === 'Escape') { setMobileOpen(false); return; }
      if (e.key !== 'Tab' || focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
      hamburgerRef.current?.focus();
    };
  }, [mobileOpen]);

  async function load(u) {
    setUser(u);
    if (u) {
      const { data } = await supabase.from('profiles').select('role').eq('id', u.id).single();
      setIsAdmin(data?.role === 'admin');
    } else setIsAdmin(false);
  }

  function logout() {
    setMobileOpen(false);
    signOutLocal('/');
  }

  const inAppRoute = pathname?.startsWith('/portal') || pathname?.startsWith('/admin') || pathname?.startsWith('/india') || pathname?.startsWith('/terminal') || pathname?.startsWith('/web-terminal') || pathname?.startsWith('/tv-chart');
  // Rules is a public documentation page, so it keeps the branded header even for logged-in
  // visitors (they still get a "Back to portal" link inside the page itself).
  const publicPageButLoggedIn = user && (pathname === '/faq' || pathname === '/challenges');
  if (inAppRoute || publicPageButLoggedIn) return null;

  const linkOn = (href, exact = true) => (exact ? pathname === href : pathname?.startsWith(href)) ? 'on' : undefined;

  return (
    <nav className={`top ${scrolled ? 'scrolled' : ''}`}>
      <div className="wrap nav-in">
        <Link className="logo" href="/"><span className="logo-mark">◆</span>FundedDesk</Link>
        <div className="nav-links">
          <Link href="/#challenge-picker">Challenges</Link>
          <Link href="/how-it-works" className={linkOn('/how-it-works')}>How It Works</Link>
          <Link href="/about" className={linkOn('/about')}>About Us</Link>
          <Link href="/rules" className={linkOn('/rules')}>Trading Rules</Link>
          <Link href="/faq" className={linkOn('/faq')}>FAQ</Link>
          <Link href="/blog" className={linkOn('/blog', false)}>Blog</Link>
          {user && <Link href="/portal/terminal" style={{ color: 'var(--brand)', fontWeight: 700 }}>Terminal</Link>}
          {user && <Link href="/portal" className={linkOn('/portal')}>Dashboard</Link>}
          {isAdmin && <Link href="/admin" style={{ color: 'var(--gold)', fontWeight: 700 }}>Admin</Link>}
        </div>
        <div className="nav-desktop-actions" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {pathname !== '/' && <ThemeToggle />}
          {user ? (
            <button className="btn btn-secondary btn-sm" onClick={logout}>Log out</button>
          ) : (
            <>
              <Link className="btn btn-secondary btn-sm" href="/login">Log in</Link>
              <Link className="btn btn-primary btn-sm" href="/signup">Get Funded</Link>
            </>
          )}
        </div>
        <button
          ref={hamburgerRef}
          type="button"
          className="nav-hamburger"
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-drawer"
          onClick={() => setMobileOpen((o) => !o)}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {mobileOpen && typeof document !== 'undefined' && createPortal(
        // Rendered into <body> rather than as a nav child: nav.top uses backdrop-filter, which
        // (like transform) makes an ancestor the containing block for position:fixed descendants
        // — a fixed-inset backdrop nested inside it would only cover the header's own height.
        <div className="nav-drawer-backdrop" onClick={() => setMobileOpen(false)}>
          <div
            id="mobile-nav-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            className="nav-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <Link href="/#challenge-picker">Challenges</Link>
            <Link href="/how-it-works" className={linkOn('/how-it-works')}>How It Works</Link>
            <Link href="/about" className={linkOn('/about')}>About Us</Link>
            <Link href="/rules" className={linkOn('/rules')}>Trading Rules</Link>
            <Link href="/faq" className={linkOn('/faq')}>FAQ</Link>
            <Link href="/blog" className={linkOn('/blog', false)}>Blog</Link>
            {user && <Link href="/portal/terminal" style={{ color: 'var(--brand)', fontWeight: 700 }}>Terminal</Link>}
            {user && <Link href="/portal" className={linkOn('/portal')}>Dashboard</Link>}
            {isAdmin && <Link href="/admin" style={{ color: 'var(--gold)', fontWeight: 700 }}>Admin</Link>}
            <div className="nav-drawer-divider" />
            {user ? (
              <button className="btn btn-secondary btn-sm" onClick={logout}>Log out</button>
            ) : (
              <>
                <Link className="btn btn-secondary btn-sm" href="/login">Log in</Link>
                <Link className="btn btn-primary btn-sm" href="/signup">Get Funded</Link>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </nav>
  );
}
