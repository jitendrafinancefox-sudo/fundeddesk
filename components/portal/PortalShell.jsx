'use client';

/* ============================================================
   PORTAL SHELL  —  the single application chrome for /portal/*

   Renders exactly ONE topbar + ONE sidebar around the routed
   page. Reads the session / profile / accounts from
   <PortalDataProvider> (no second fetch). The /portal/terminal
   route renders standalone (no chrome).

   Nothing here fabricates data:
   - notifications have no backend yet → honest empty state
   - the market pill is a real IST market-hours computation
   - the account selector is the existing dashboard component,
     now the ONE account-context control for the whole portal
   ============================================================ */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Home, Plus, LineChart, Wallet, Users, Ticket, ScrollText, Trophy,
  Users2, Settings, BarChart3, Lightbulb, LogOut, ChevronDown,
  Grid3x3, Newspaper, CalendarClock, ShieldCheck, ShieldQuestion,
  Bell, Gift, UserRound, Coins, LifeBuoy, Receipt, Menu, X,
} from 'lucide-react';
import { signOutLocal } from '@/lib/auth';
import { supabase } from '@/lib/supabaseClient';
import { IS_MARKET_OPEN } from '@/components/terminal/constants';
import { usePortalData } from '@/components/portal/PortalDataProvider';
import { typeMeta, safeActionUrl, notifBackendMissing } from '@/lib/notifications';
import { relativeAge } from '@/lib/marketTime';
import AccountSelector from '@/components/portal/dashboard/AccountSelector';
import TerminalSelectorModal from '@/components/portal/TerminalSelectorModal';

/* ---- sidebar model (order is the product spec) ---------------- */
const ANALYTICS_LINKS = [
  ['/portal/analytics/heatmap', Grid3x3, 'Market Heatmap'],
  ['/portal/analytics/news', Newspaper, 'Market News'],
  ['/portal/analytics/calendar', CalendarClock, 'Economic Calendar'],
];

function isActive(path, href) {
  if (href === '/portal') return path === '/portal';
  return path === href || path.startsWith(href + '/');
}

function NavRow({ href, onClick, Icon, label, on, trailing }) {
  const inner = (
    <>
      <Icon size={16} strokeWidth={on ? 2.3 : 2} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>{label}</span>
      {trailing}
    </>
  );
  const style = {
    display: 'flex', alignItems: 'center', gap: 11, width: '100%',
    padding: '9px 12px', borderRadius: 10, fontSize: 13.5, marginBottom: 2,
    color: on ? 'var(--text)' : 'var(--muted)', fontWeight: on ? 600 : 500,
    background: on ? 'rgba(34,197,139,.15)' : 'transparent',
    borderLeft: on ? '2px solid var(--green)' : '2px solid transparent',
    cursor: 'pointer', fontFamily: 'inherit',
  };
  if (onClick) {
    return <button type="button" onClick={onClick} style={style}>{inner}</button>;
  }
  return <Link href={href} style={style}>{inner}</Link>;
}

export default function PortalShell({ children }) {
  const path = usePathname() || '';
  const router = useRouter();
  const {
    ready, error, profile, isAdmin, accounts, selectedAccountId, selectAccount,
    userId, unreadCount, notifDeployed, refreshUnread,
  } = usePortalData();

  const [analyticsOpen, setAnalyticsOpen] = useState(path.startsWith('/portal/analytics'));
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [termOpen, setTermOpen] = useState(false);
  const [marketOpen, setMarketOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);
  const hamburgerRef = useRef(null);

  // Notification panel — list fetched on demand; count comes from context.
  const [notifItems, setNotifItems] = useState([]);
  const [notifState, setNotifState] = useState('idle'); // idle | loading | ok | error | missing
  const [markingAll, setMarkingAll] = useState(false);

  async function loadNotifPanel() {
    if (!userId) return;
    setNotifState('loading');
    const { data, error: e } = await supabase
      .from('notifications')
      .select('id, type, title, body, action_url, created_at, read_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(8);
    if (e) {
      setNotifState(notifBackendMissing(e) ? 'missing' : 'error');
      return;
    }
    setNotifItems(Array.isArray(data) ? data : []);
    setNotifState('ok');
  }

  async function openNotifItem(n) {
    if (!n.read_at) {
      const { error: e } = await supabase.rpc('mark_notifications_read', { p_ids: [n.id] });
      if (!e) {
        setNotifItems((cur) => cur.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
        refreshUnread?.();
      }
    }
    const dest = safeActionUrl(n.action_url);
    setNotifOpen(false);
    if (dest) router.push(dest);
  }

  async function markAllRead() {
    setMarkingAll(true);
    const { error: e } = await supabase.rpc('mark_all_notifications_read');
    setMarkingAll(false);
    if (!e) { await loadNotifPanel(); refreshUnread?.(); }
  }

  useEffect(() => {
    if (notifOpen) loadNotifPanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifOpen, userId]);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const isTerminal = path === '/portal/terminal';

  // Market status: real IST market-hours computation, refreshed each minute.
  useEffect(() => {
    const tick = () => { try { setMarketOpen(!!IS_MARKET_OPEN()); } catch (e) { setMarketOpen(false); } };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  // Close menus on route change.
  useEffect(() => { setProfileOpen(false); setNotifOpen(false); setDrawerOpen(false); }, [path]);

  // Close menus on outside click / Escape.
  useEffect(() => {
    function onDown(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    function onKey(e) { if (e.key === 'Escape') { setProfileOpen(false); setNotifOpen(false); setDrawerOpen(false); } }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, []);

  // Mobile nav drawer: close automatically if the viewport grows past the
  // breakpoint (e.g. rotating a tablet or resizing a browser window) so it
  // never gets stranded open over the desktop layout.
  useEffect(() => {
    function onResize() { if (window.innerWidth > 900) setDrawerOpen(false); }
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // While the drawer is open: trap focus inside it, lock body scroll, and
  // return focus to the hamburger on close — same pattern as the marketing
  // site's <Nav> drawer.
  useEffect(() => {
    if (!drawerOpen) return;
    const drawer = drawerRef.current;
    const focusables = drawer ? Array.from(drawer.querySelectorAll('a[href], button:not([disabled])')) : [];
    focusables[0]?.focus();

    function onKeyDown(e) {
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
  }, [drawerOpen]);

  function logout() {
    signOutLocal('/');
  }

  const goNewChallenge = () => router.push('/challenges');

  /* ---- terminal route: no chrome -------------------------------- */
  if (isTerminal) {
    if (!ready) return <FullScreen label="Loading terminal…" />;
    return <>{children}</>;
  }

  if (!ready) return <FullScreen label="Loading your dashboard…" />;

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(240,82,95,.12)', border: '1px solid rgba(240,82,95,.3)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
            <ShieldQuestion size={20} color="var(--red)" />
          </div>
          <h2 style={{ fontSize: 17, margin: '0 0 6px' }}>Portal data unavailable</h2>
          <p className="muted" style={{ fontSize: 13, marginBottom: 16 }}>{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-sm" style={{ border: '1px solid var(--line2)' }}>Retry</button>
        </div>
      </div>
    );
  }

  const initial = (profile?.full_name || profile?.email || 'T')[0].toUpperCase();
  const firstName = profile?.full_name?.split(' ')[0] || 'Trader';

  // "New Challenge" is the dedicated primary CTA at the top of the sidebar
  // (below), not a regular nav row — kept out of primaryNav so it isn't
  // duplicated in the list.
  const primaryNav = [
    { href: '/portal', Icon: Home, label: 'Home' },
    { type: 'terminal', Icon: LineChart, label: 'Web Terminal' },
    { href: '/portal/payouts', Icon: Wallet, label: 'Payouts' },
    { href: '/portal/accounts', Icon: Users, label: 'Accounts' },
    { href: '/portal/orders', Icon: Receipt, label: 'Orders' },
    { href: '/portal/coupon-codes', Icon: Ticket, label: 'Coupon Codes' },
    { href: '/rules', Icon: ScrollText, label: 'Rules' },
    { href: '/portal/leaderboard', Icon: Trophy, label: 'Leaderboard' },
    { href: '/portal/affiliate', Icon: Users2, label: 'Affiliate' },
    { href: '/portal/gold-coins', Icon: Coins, label: 'Gold Coins' },
    { href: '/portal/support', Icon: LifeBuoy, label: 'Support' },
    { href: '/portal/settings', Icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="portal-shell" style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative', display: 'flex' }}>
      {/* No page-wide ambient glow here — the reference dashboard is a flat
          neutral surface, not a cinematic wash. That treatment stays on
          the marketing pages (homepage/challenges), not this product UI. */}

      {/* Backdrop — mobile drawer mode only (CSS gates visibility to <900px);
          click-through to close, sits below the sidebar but above content. */}
      {drawerOpen && (
        <div
          className="portal-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ============ SIDEBAR — full height: logo + primary CTA at top,
          grouped nav in the middle, promo + logout pinned to the bottom.
          Desktop: sticky in-flow column. Mobile (<900px): off-canvas drawer
          driven by `drawerOpen`, toggled from the hamburger in the topbar. ============ */}
      <aside
        id="portal-sidebar"
        ref={drawerRef}
        className={`portal-side${drawerOpen ? ' portal-side-open' : ''}`}
        role="dialog"
        aria-modal={drawerOpen ? 'true' : undefined}
        aria-label="Portal navigation"
        style={{
          width: 240, flexShrink: 0, borderRight: '1px solid var(--line)',
          background: 'linear-gradient(180deg,var(--sidebar-bg1, rgba(20,26,43,.55)),var(--sidebar-bg2, rgba(10,12,21,.7)))',
          backdropFilter: 'blur(10px)', padding: '18px 14px', position: 'sticky', top: 0,
          alignSelf: 'flex-start', height: '100vh', overflowY: 'auto', zIndex: 1,
          display: 'flex', flexDirection: 'column',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
          <Link href="/portal" className="logo" style={{ fontSize: 17 }}>
            <span className="logo-mark" style={{ width: 28, height: 28, fontSize: 13 }}>◆</span>FundedDesk
          </Link>
          <button
            type="button"
            className="portal-side-close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <Link href="/challenges" className="btn btn-grad btn-sm" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', marginBottom: 18,
        }}>
          <Plus size={14} /> New Challenge
        </Link>

        <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.12em', color: 'var(--dim)', padding: '0 12px', marginBottom: 6 }}>MAIN</div>

        {/* primary nav */}
        <nav style={{ flex: 1, overflowY: 'auto' }}>
          {primaryNav.map((item) => {
            if (item.type === 'terminal') {
              const on = path === '/portal/terminal' || path === '/tv-chart';
              return <NavRow key="terminal" onClick={() => setTermOpen(true)} Icon={item.Icon} label={item.label} on={on} />;
            }
            return <NavRow key={item.href} href={item.href} Icon={item.Icon} label={item.label} on={isActive(path, item.href)} />;
          })}

          {/* Analytics — links to the performance workspace; chevron expands
              the market-data sub-pages (heatmap / news / calendar). */}
          <div style={{ display: 'flex', alignItems: 'stretch', marginBottom: 2, marginTop: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <NavRow href="/portal/analytics" Icon={BarChart3} label="Analytics" on={path === '/portal/analytics'} />
            </div>
            <button
              type="button"
              onClick={() => setAnalyticsOpen((v) => !v)}
              aria-label={analyticsOpen ? 'Collapse market data links' : 'Expand market data links'}
              aria-expanded={analyticsOpen}
              style={{
                flexShrink: 0, display: 'grid', placeItems: 'center', width: 30, borderRadius: 8,
                background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)',
              }}
            >
              <ChevronDown size={14} style={{ transform: analyticsOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
            </button>
          </div>
          {analyticsOpen && (
            <div style={{ paddingLeft: 14, borderLeft: '1px dashed var(--line2)', marginLeft: 18, marginBottom: 4 }}>
              {ANALYTICS_LINKS.map(([href, Icon, label]) => (
                <NavRow key={href} href={href} Icon={Icon} label={label} on={path === href} />
              ))}
            </div>
          )}

          {/* Suggest a Feature */}
          <NavRow href="/portal/suggest-feature" Icon={Lightbulb} label="Suggest a Feature" on={isActive(path, '/portal/suggest-feature')} />
        </nav>

        {/* Refer & Earn promo */}
        <Link href="/portal/affiliate" style={{
          display: 'block', padding: '13px 14px', borderRadius: 12, margin: '10px 0 10px',
          background: 'linear-gradient(160deg,rgba(245,185,62,.14),rgba(245,185,62,.04))',
          border: '1px solid rgba(245,185,62,.28)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Gift size={15} color="var(--gold)" />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>Refer &amp; Earn</span>
          </div>
          <p className="dim" style={{ fontSize: 11, margin: 0, lineHeight: 1.45 }}>
            Invite traders and earn affiliate commission on their purchases.
          </p>
        </Link>

        {/* bottom: admin + logout */}
        <div>
          {isAdmin && (
            <Link href="/admin" style={{
              display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 10,
              fontSize: 13.5, color: 'var(--gold)', fontWeight: 600, marginBottom: 4,
            }}><ShieldCheck size={16} /> Admin Panel</Link>
          )}
          <button onClick={logout} style={{
            display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 12px', borderRadius: 10,
            fontSize: 13.5, color: 'var(--red)', fontWeight: 500, cursor: 'pointer',
            border: '1px solid rgba(240,82,95,.25)', background: 'rgba(240,82,95,.06)',
          }}><LogOut size={16} /> Logout</button>
        </div>
      </aside>

      {/* ============ RIGHT COLUMN: slim topbar (utility controls only,
          no logo/CTA — both moved into the sidebar above) + page content. ============ */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1 }}>
      <header className="portal-topbar" style={{
        display: 'flex', alignItems: 'center', gap: 14,
        minHeight: 62, padding: '8px 20px', borderBottom: '1px solid var(--line)',
        background: 'var(--topbar-bg, rgba(10,12,21,.85))', backdropFilter: 'blur(14px)',
        position: 'sticky', top: 0, zIndex: 60, flexWrap: 'wrap',
      }}>
        <button
          ref={hamburgerRef}
          type="button"
          className="portal-hamburger"
          onClick={() => setDrawerOpen((v) => !v)}
          aria-label={drawerOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={drawerOpen}
          aria-controls="portal-sidebar"
        >
          {drawerOpen ? <X size={19} /> : <Menu size={19} />}
        </button>
        <Link href="/portal" className="portal-logo-mobile" aria-label="FundedDesk home">
          <span className="logo-mark" style={{ width: 26, height: 26, fontSize: 12 }}>◆</span>
        </Link>
        <div className="portal-topbar-spacer" style={{ flex: 1, minWidth: 8 }} />

        {/* Account selector — the single account-context control for the portal */}
        <AccountSelector
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onAccountChange={selectAccount}
          onNewChallenge={goNewChallenge}
          loading={!ready}
        />

        {/* Market status — real IST market-hours indicator */}
        <span
          className="portal-market-pill"
          title="NSE / NFO regular session · 09:15–15:30 IST, Mon–Fri"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px',
            borderRadius: 99, border: '1px solid var(--line2)', background: 'var(--card, #0E111C)',
            fontSize: 12, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap',
          }}
        >
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: marketOpen ? 'var(--green)' : 'var(--dim)',
            boxShadow: marketOpen ? '0 0 8px var(--green)' : 'none',
          }} />
          NSE {marketOpen ? 'Open' : 'Closed'}
        </span>

        {/* Notifications */}
        <div ref={notifRef} className="portal-notif-wrap" style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => { setNotifOpen((v) => !v); setProfileOpen(false); }}
            aria-haspopup="true"
            aria-expanded={notifOpen}
            aria-label={notifDeployed && unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
            style={{
              width: 36, height: 36, borderRadius: 10, border: '1px solid var(--line2)',
              background: 'var(--card, #0E111C)', display: 'grid', placeItems: 'center', cursor: 'pointer',
              color: notifOpen ? 'var(--text)' : 'var(--muted)', position: 'relative',
            }}
          >
            <Bell size={16} />
            {notifDeployed && unreadCount > 0 && (
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, padding: '0 4px',
                  borderRadius: 8, background: 'var(--green)', color: '#04140c', fontSize: 10, fontWeight: 800,
                  display: 'grid', placeItems: 'center', border: '2px solid var(--topbar-bg, #0E111C)',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 44, width: 320, maxWidth: 'calc(100vw - 24px)',
              background: 'var(--card2, #141A2B)', border: '1px solid var(--line2)', borderRadius: 12,
              boxShadow: '0 16px 44px rgba(0,0,0,.55)', overflow: 'hidden', zIndex: 80,
            }}>
              <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Notifications</span>
                {notifState === 'ok' && notifItems.some((n) => !n.read_at) && (
                  <button onClick={markAllRead} disabled={markingAll} style={{ background: 'transparent', border: 'none', color: 'var(--green)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' }}>
                    {markingAll ? '…' : 'Mark all read'}
                  </button>
                )}
              </div>

              <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                {notifState === 'loading' && (
                  <div style={{ padding: 14 }}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{ height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.04)', marginBottom: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
                    ))}
                  </div>
                )}
                {notifState === 'missing' && (
                  <div style={{ padding: '22px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Notifications aren&apos;t set up yet</div>
                    <p className="muted" style={{ fontSize: 12, margin: 0, lineHeight: 1.5 }}>Run <code>supabase/notifications.sql</code> to enable this.</p>
                  </div>
                )}
                {notifState === 'error' && (
                  <div style={{ padding: '22px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: 'var(--red)' }}>Couldn&apos;t load notifications</div>
                    <button onClick={loadNotifPanel} className="btn btn-line btn-sm" style={{ marginTop: 8 }}>Try again</button>
                  </div>
                )}
                {notifState === 'ok' && notifItems.length === 0 && (
                  <div style={{ padding: '26px 18px', textAlign: 'center' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg2, #0A0C15)', display: 'grid', placeItems: 'center', margin: '0 auto 10px' }}>
                      <Bell size={16} color="var(--dim)" />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>You&apos;re all caught up</div>
                    <p className="muted" style={{ fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                      Updates about your accounts, payouts and orders appear here.
                    </p>
                  </div>
                )}
                {notifState === 'ok' && notifItems.map((n) => {
                  const meta = typeMeta(n.type);
                  const clickable = !!safeActionUrl(n.action_url) || !n.read_at;
                  return (
                    <button
                      key={n.id}
                      onClick={() => openNotifItem(n)}
                      style={{
                        width: '100%', textAlign: 'left', background: n.read_at ? 'transparent' : 'rgba(34,197,139,0.05)',
                        border: 'none', borderBottom: '1px solid var(--line)', padding: '11px 14px', cursor: clickable ? 'pointer' : 'default',
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                      }}
                    >
                      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: '50%', marginTop: 5, flexShrink: 0, background: n.read_at ? 'transparent' : 'var(--green)', border: n.read_at ? '1px solid var(--line2)' : 'none' }} />
                      <span style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12.5, fontWeight: n.read_at ? 500 : 700 }}>{n.title}</span>
                          <span className={`tag ${meta.tag}`} style={{ fontSize: 9 }}>{meta.label}</span>
                          {!n.read_at && <span className="dim" style={{ fontSize: 9, fontWeight: 700 }}>UNREAD</span>}
                        </span>
                        {n.body && <span className="muted" style={{ display: 'block', fontSize: 11.5, marginTop: 3, lineHeight: 1.45 }}>{n.body}</span>}
                        <span className="dim" style={{ fontSize: 10.5, display: 'block', marginTop: 3 }}>{relativeAge(n.created_at) || ''}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {notifState === 'ok' && (
                <div style={{ padding: '9px 14px', borderTop: '1px solid var(--line)', textAlign: 'center' }}>
                  <Link href="/portal/notifications" onClick={() => setNotifOpen(false)} style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600 }}>View all →</Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile */}
        <div ref={profileRef} className="portal-profile-wrap" style={{ position: 'relative', flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => { setProfileOpen((v) => !v); setNotifOpen(false); }}
            aria-haspopup="true"
            aria-expanded={profileOpen}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 5px', borderRadius: 99,
              border: '1px solid var(--line2)', background: 'var(--card, #0E111C)', cursor: 'pointer',
            }}
          >
            <span style={{
              width: 27, height: 27, borderRadius: '50%', background: 'var(--grad)', display: 'grid', placeItems: 'center',
              fontFamily: 'Manrope', fontWeight: 800, fontSize: 12, color: '#fff',
            }}>{initial}</span>
            <span className="portal-profile-name" style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{firstName}</span>
            <ChevronDown size={14} color="var(--dim)" />
          </button>
          {profileOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 44, width: 216, background: 'var(--card2, #141A2B)', border: '1px solid var(--line2)',
              borderRadius: 12, boxShadow: '0 16px 44px rgba(0,0,0,.55)', overflow: 'hidden', zIndex: 80,
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'Trader'}</div>
                <div className="dim" style={{ fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.email}</div>
              </div>
              <MenuLink href="/portal/settings" Icon={UserRound} label="Profile" onClick={() => setProfileOpen(false)} />
              <MenuLink href="/portal/settings" Icon={Settings} label="Settings" onClick={() => setProfileOpen(false)} />
              <MenuLink href="/portal/privacy" Icon={ShieldQuestion} label="Data & Privacy" onClick={() => setProfileOpen(false)} />
              {isAdmin && <MenuLink href="/admin" Icon={ShieldCheck} label="Admin Panel" color="var(--gold)" onClick={() => setProfileOpen(false)} />}
              <button onClick={logout} style={{ display: 'flex', gap: 9, alignItems: 'center', width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 13.5, color: 'var(--red)', cursor: 'pointer', background: 'transparent', border: 'none' }}>
                <LogOut size={15} /> Logout
              </button>
            </div>
          )}
        </div>
      </header>

        <main className="portal-main" style={{ flex: 1, minWidth: 0, padding: '20px 24px' }}>{children}</main>
      </div>

      <TerminalSelectorModal open={termOpen} onClose={() => setTermOpen(false)} onSelect={(href) => { setTermOpen(false); router.push(href); }} />

      <style dangerouslySetInnerHTML={{ __html: `
        /* Hamburger + compact mobile logo: hidden on desktop, shown <900px */
        .portal-hamburger{
          display:none; align-items:center; justify-content:center;
          width:40px; height:40px; border-radius:10px; flex-shrink:0;
          border:1px solid var(--border, var(--line2)); background:rgba(255,255,255,0.02);
          color:var(--text); cursor:pointer;
        }
        .portal-hamburger:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
        .portal-logo-mobile{display:none; align-items:center; flex-shrink:0}
        .portal-side-close{
          display:none; align-items:center; justify-content:center;
          width:32px; height:32px; border-radius:8px; flex-shrink:0;
          border:1px solid var(--border, transparent); background:transparent; color:var(--muted); cursor:pointer;
        }
        .portal-drawer-backdrop{
          display:none;
          position:fixed; inset:0; z-index:150;
          background:rgba(2,6,4,0.6);
          -webkit-backdrop-filter:blur(2px); backdrop-filter:blur(2px);
        }

        @media(max-width:1100px){
          .portal-market-pill{display:none}
        }

        /* ---- Mobile shell: sidebar becomes an off-canvas drawer, never a
           full-width block stacked above the content. ---- */
        @media(max-width:900px){
          .portal-shell{flex-direction:row}
          .portal-hamburger{display:inline-flex; order:0}
          .portal-logo-mobile{display:inline-flex; order:1}
          .acct-selector{order:2; flex:0 1 auto; min-width:0}
          .portal-topbar-spacer{order:3}
          .portal-notif-wrap{order:4}
          .portal-profile-wrap{order:5}
          .portal-topbar{gap:8px; padding:8px 14px}

          .portal-side-close{display:inline-flex}
          .portal-drawer-backdrop{display:block}
          .portal-side{
            position:fixed !important; top:0 !important; left:0 !important;
            height:100dvh !important; width:min(300px,86vw) !important;
            z-index:200 !important; transform:translateX(-100%);
            transition:transform 0.25s var(--ease-out, ease);
            padding-top:calc(18px + env(safe-area-inset-top, 0px)) !important;
            padding-bottom:calc(18px + env(safe-area-inset-bottom, 0px)) !important;
            box-shadow:var(--shadow-lg, 0 16px 48px rgba(0,0,0,.45));
          }
          .portal-side-open{transform:translateX(0)}

          /* Touch targets: the desktop sidebar's 9px-padding rows are dense
             by design for a mouse; on a touch drawer every row needs the
             ~44px minimum without changing the desktop density. */
          .portal-side nav a, .portal-side nav button,
          .portal-side > div:last-child a, .portal-side > div:last-child button{
            min-height:44px;
          }
        }
        @media (prefers-reduced-motion: reduce){
          .portal-side{transition:none}
        }

        @media(max-width:720px){
          .portal-profile-name{display:none!important}
        }
        @media(max-width:900px){
          .portal-main{padding:16px !important}
        }
        @media(max-width:600px){
          .acct-selector-btn{min-width:0!important; max-width:150px!important; padding:6px 10px 6px 8px!important}
          .portal-main{padding:12px !important}
        }
        @media(max-width:400px){
          .acct-selector-btn{max-width:120px!important}
        }
        /* The account-selector dropdown is position:absolute off a wrapper
           that (on mobile) sits ~96px from the left edge (hamburger + logo +
           header padding, all fixed widths). Anchoring it right:0 like on
           desktop would push most of a 340px panel off-screen to the left,
           so on mobile it anchors left:0 and its width is capped to the
           space actually available between that wrapper and the viewport
           edge, instead of a viewport-relative width that ignores the anchor
           offset. */
        @media(max-width:900px){
          .acct-selector-panel{
            left:0 !important;
            right:auto !important;
            width:min(340px, calc(100vw - 108px)) !important;
            max-width:none !important;
          }
        }
      `}} />
    </div>
  );
}

function MenuLink({ href, Icon, label, color, onClick }) {
  return (
    <Link href={href} onClick={onClick} style={{
      display: 'flex', gap: 9, alignItems: 'center', padding: '10px 16px', fontSize: 13.5,
      color: color || 'var(--text)', borderBottom: '1px solid var(--line)',
    }}>
      <Icon size={15} /> {label}
    </Link>
  );
}

function FullScreen({ label }) {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--grad)', margin: '0 auto 14px' }} />
        <p className="muted" style={{ fontSize: 13.5 }}>{label}</p>
      </div>
    </div>
  );
}
