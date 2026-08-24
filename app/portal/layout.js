'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  Home, LineChart, Users, Wallet, Trophy, ScrollText, Settings,
  ShieldCheck, LogOut, ChevronDown, Plus, Sparkles, BarChart3,
  Grid3x3, Newspaper, CalendarClock, Users2, LifeBuoy, Ticket, ShieldQuestion,
} from 'lucide-react';
import TerminalSelectorModal from '@/components/portal/TerminalSelectorModal';

const MAIN_LINKS = [
  ['/portal', Home, 'Home'],
  ['/portal/accounts', Users, 'Accounts'],
  ['/portal/payouts', Wallet, 'Payouts'],
  ['/portal/leaderboard', Trophy, 'Leaderboard'],
];
const ANALYTICS_LINKS = [
  ['/portal/analytics/heatmap', Grid3x3, 'Market Heatmap'],
  ['/portal/analytics/news', Newspaper, 'Market News'],
  ['/portal/analytics/calendar', CalendarClock, 'Economic Calendar'],
];
const OTHER_LINKS = [
  ['/portal/affiliate', Users2, 'Affiliate'],
  ['/portal/support', LifeBuoy, 'Support'],
  ['/portal/coupons', Ticket, 'Coupon Codes'],
  ['/rules', ScrollText, 'Rules'],
  ['/portal/privacy', ShieldQuestion, 'Data & Privacy'],
  ['/portal/settings', Settings, 'Settings'],
];

function NavItem({ href, Icon, label, on, soon }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 10,
      fontSize: 13.5, marginBottom: 2, color: on ? 'var(--text)' : 'var(--muted)', fontWeight: on ? 600 : 500,
      background: on ? 'rgba(34,197,139,.15)' : 'transparent',
      borderLeft: on ? '2px solid var(--green)' : '2px solid transparent',
    }}>
      <Icon size={16} strokeWidth={on ? 2.3 : 2} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {soon && <span className="tag tag-gold" style={{ fontSize: 8.5, padding: '2px 6px' }}>SOON</span>}
    </Link>
  );
}

export default function PortalLayout({ children }) {
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState(null);
  const [accCount, setAccCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(path?.startsWith('/portal/analytics'));
  const [termSelectorOpen, setTermSelectorOpen] = useState(false);

  const isTerminal = path === '/portal/terminal';

  function openTerminalSelector() {
    setTermSelectorOpen(true);
  }

  function onTerminalSelect(href) {
    router.push(href);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { window.location.href = '/login'; return; }
      const [{ data: prof }, { count }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase.from('accounts').select('id', { count: 'exact', head: true }).eq('user_id', session.user.id).eq('status', 'active'),
      ]);
      setProfile({ ...prof, email: session.user.email });
      setIsAdmin(prof?.role === 'admin');
      setAccCount(count || 0);
      setReady(true);
    });
  }, []);

  function logout() {
    try { supabase.auth.signOut({ scope: 'local' }).catch(() => {}); } catch (e) {}
    try {
      Object.keys(localStorage).filter((k) => k.startsWith('sb-')).forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch (e) {}
    setTimeout(() => window.location.replace('/'), 100);
  }

  // Terminal page: standalone full-viewport, no dashboard chrome
  if (isTerminal) {
    if (!ready) return (
      <div style={{ width: '100vw', height: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--grad)', margin: '0 auto 14px' }} />
          <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>Loading terminal…</p>
        </div>
      </div>
    );
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--grad)', margin: '0 auto 14px' }} />
          <p className="muted" style={{ fontSize: 13.5 }}>Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  const initial = (profile?.full_name || profile?.email || 'T')[0].toUpperCase();
  const firstName = profile?.full_name?.split(' ')[0] || 'Trader';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(900px 500px at 8% -8%, rgba(34,197,139,.09), transparent 60%), radial-gradient(700px 460px at 100% 8%, rgba(45,212,191,.06), transparent 60%)',
      }} />

      {/* top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 62, padding: '0 22px', borderBottom: '1px solid var(--line)',
        background: 'var(--topbar-bg)', backdropFilter: 'blur(14px)', position: 'sticky', top: 0, zIndex: 60,
      }}>
        <Link href="/portal" className="logo" style={{ fontSize: 17 }}>
          <span className="logo-mark" style={{ width: 28, height: 28, fontSize: 13 }}>◆</span>FundedDesk
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/challenges" className="btn btn-grad btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> New Challenge
          </Link>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen((v) => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 5px', borderRadius: 99,
              border: '1px solid var(--line2)', background: 'var(--card)', cursor: 'pointer',
            }}>
              <span style={{
                width: 27, height: 27, borderRadius: '50%', background: 'var(--grad)', display: 'grid', placeItems: 'center',
                fontFamily: 'Manrope', fontWeight: 800, fontSize: 12, color: '#fff',
              }}>{initial}</span>
              <span style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{firstName}</span>
              <ChevronDown size={14} color="var(--dim)" />
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 44, width: 200, background: 'var(--card2)', border: '1px solid var(--line2)',
                borderRadius: 12, boxShadow: '0 16px 44px rgba(0,0,0,.55)', overflow: 'hidden', zIndex: 70,
              }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{profile?.full_name || 'Trader'}</div>
                  <div className="dim" style={{ fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile?.email}</div>
                </div>
                <Link href="/portal/settings" onClick={() => setMenuOpen(false)} style={{ display: 'flex', gap: 9, alignItems: 'center', padding: '10px 16px', fontSize: 13.5, color: 'var(--text)', borderBottom: '1px solid var(--line)' }}>
                  <Settings size={15} /> Settings
                </Link>
                {isAdmin && (
                  <Link href="/admin" onClick={() => setMenuOpen(false)} style={{ display: 'flex', gap: 9, alignItems: 'center', padding: '10px 16px', fontSize: 13.5, color: 'var(--gold)', borderBottom: '1px solid var(--line)' }}>
                    <ShieldCheck size={15} /> Admin Panel
                  </Link>
                )}
                <button onClick={logout} style={{ display: 'flex', gap: 9, alignItems: 'center', width: '100%', textAlign: 'left', padding: '10px 16px', fontSize: 13.5, color: 'var(--red)' }}>
                  <LogOut size={15} /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', position: 'relative', zIndex: 1 }} className="portal">
        <aside style={{
          width: 240, flexShrink: 0, borderRight: '1px solid var(--line)',
          background: 'linear-gradient(180deg,var(--sidebar-bg1),var(--sidebar-bg2))', backdropFilter: 'blur(10px)',
          padding: '18px 14px', position: 'sticky', top: 62, alignSelf: 'flex-start', height: 'calc(100vh - 62px)',
          overflowY: 'auto', display: 'flex', flexDirection: 'column',
        }} className="portal-side">

          <div style={{
            padding: '16px 14px', borderRadius: 14, marginBottom: 18,
            background: 'linear-gradient(160deg,rgba(34,197,139,.14),rgba(45,212,191,.05))',
            border: '1px solid rgba(34,197,139,.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{
                width: 38, height: 38, borderRadius: 11, background: 'var(--grad)', display: 'grid', placeItems: 'center',
                fontFamily: 'Manrope', fontWeight: 800, fontSize: 15, color: '#fff', flexShrink: 0,
              }}>{initial}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.full_name || 'Trader'}</div>
                <div className="dim" style={{ fontSize: 10.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{profile?.email}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--green)' }}>
              <Sparkles size={13} /> {accCount} active account{accCount === 1 ? '' : 's'}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className="dim" style={{ fontSize: 10, letterSpacing: '.1em', margin: '4px 10px 6px', fontWeight: 700 }}>MAIN</div>
            {MAIN_LINKS.map(([href, Icon, label]) => (
              <NavItem key={href} href={href} Icon={Icon} label={label} on={path === href} />
            ))}
            <button onClick={openTerminalSelector} style={{
              display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 12px', borderRadius: 10,
              fontSize: 13.5, marginBottom: 2, cursor: 'pointer',
              color: path === '/portal/terminal' || path === '/tv-chart' ? 'var(--text)' : 'var(--muted)',
              fontWeight: path === '/portal/terminal' || path === '/tv-chart' ? 600 : 500,
              background: path === '/portal/terminal' || path === '/tv-chart' ? 'rgba(34,197,139,.15)' : 'transparent',
              borderLeft: path === '/portal/terminal' || path === '/tv-chart' ? '2px solid var(--green)' : '2px solid transparent',
            }}>
              <LineChart size={16} strokeWidth={path === '/portal/terminal' || path === '/tv-chart' ? 2.3 : 2} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Web Terminal</span>
            </button>

            <button onClick={() => setAnalyticsOpen((v) => !v)} style={{
              display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 12px', borderRadius: 10,
              fontSize: 13.5, color: 'var(--muted)', fontWeight: 500, marginTop: 2, marginBottom: 2, cursor: 'pointer',
            }}>
              <BarChart3 size={16} />
              <span style={{ flex: 1, textAlign: 'left' }}>Analytics</span>
              <ChevronDown size={14} style={{ transform: analyticsOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
            </button>
            {analyticsOpen && (
              <div style={{ paddingLeft: 14, borderLeft: '1px dashed var(--line2)', marginLeft: 18, marginBottom: 4 }}>
                {ANALYTICS_LINKS.map(([href, Icon, label]) => (
                  <NavItem key={href} href={href} Icon={Icon} label={label} on={path === href} />
                ))}
              </div>
            )}

            <div className="dim" style={{ fontSize: 10, letterSpacing: '.1em', margin: '16px 10px 6px', fontWeight: 700 }}>OTHER</div>
            {OTHER_LINKS.map(([href, Icon, label]) => (
              <NavItem key={href} href={href} Icon={Icon} label={label} on={path === href} />
            ))}
          </div>

          <div>
            {isAdmin && (
              <Link href="/admin" style={{
                display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 10,
                fontSize: 13.5, color: 'var(--gold)', fontWeight: 600, marginBottom: 4,
              }}><ShieldCheck size={16} /> Admin Panel</Link>
            )}
            <button onClick={logout} style={{
              display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '9px 12px', borderRadius: 10,
              fontSize: 13.5, color: 'var(--red)', fontWeight: 500, cursor: 'pointer', border: '1px solid rgba(240,82,95,.25)',
              background: 'rgba(240,82,95,.06)',
            }}><LogOut size={16} /> Log out</button>
          </div>
        </aside>
        <div style={{ flex: 1, minWidth: 0, padding: '26px 30px' }}>{children}</div>
      </div>
      <TerminalSelectorModal open={termSelectorOpen} onClose={() => setTermSelectorOpen(false)} onSelect={onTerminalSelect} />
      <style dangerouslySetInnerHTML={{ __html: `
        @media(max-width:860px){
          .portal{flex-direction:column}
          .portal-side{width:100%!important;height:auto!important;position:static!important}
        }
      `}} />
    </div>
  );
}
