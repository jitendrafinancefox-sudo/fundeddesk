'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, LineChart, Users, Wallet, Trophy, ScrollText, Settings,
  ShieldCheck, LogOut, ChevronDown, BarChart3,
  Grid3x3, Newspaper, CalendarClock, Users2, LifeBuoy, Ticket, ShieldQuestion,
  Target, TrendingUp, ArrowRight, Bell, Moon, Sun,
  ChevronRight, Menu, X, Search, HelpCircle, Sparkles
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import AccountSelector from './AccountSelector';

const SIDEBAR_LINKS = [
  { icon: Home, label: 'Home', href: '/portal' },
  { icon: Target, label: 'New Challenge', href: '/challenges' },
  { icon: LineChart, label: 'Web Terminal', href: '/portal/terminal' },
  { icon: Users, label: 'Accounts', href: '/portal/accounts' },
  { icon: Wallet, label: 'Payouts', href: '/portal/payouts' },
  { icon: Trophy, label: 'Leaderboard', href: '/portal/leaderboard' },
  { icon: Users2, label: 'Affiliate', href: '/portal/affiliate' },
  { icon: Ticket, label: 'Coupons', href: '/portal/coupons' },
  { icon: ScrollText, label: 'Rules', href: '/rules' },
];

const ANALYTICS_LINKS = [
  ['/portal/analytics/heatmap', Grid3x3, 'Market Heatmap'],
  ['/portal/analytics/news', Newspaper, 'Market News'],
  ['/portal/analytics/calendar', CalendarClock, 'Economic Calendar'],
];

const OTHER_LINKS = [
  ['/portal/support', LifeBuoy, 'Support'],
  ['/portal/privacy', ShieldQuestion, 'Data & Privacy'],
  ['/portal/settings', Settings, 'Settings'],
];

function NavItem({ href, Icon, label, on }) {
  return (
    <Link href={href} style={{
      display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 10,
      fontSize: 13.5, marginBottom: 2, color: on ? 'var(--text)' : 'var(--muted)', fontWeight: on ? 600 : 500,
      background: on ? 'rgba(34,197,139,.13)' : 'transparent',
      borderLeft: on ? '2px solid var(--green)' : '2px solid transparent',
    }}>
      <Icon size={16} strokeWidth={on ? 2.3 : 2} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </Link>
  );
}

export default function DashboardShell({ children, account, accounts, onAccountChange, onNewChallenge, loading, profile }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'light' : 'dark');
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut({ scope: 'local' }).catch(() => {}); } catch (e) {}
    try {
      Object.keys(localStorage).filter(k => k.startsWith('sb-')).forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch (e) {}
    setTimeout(() => window.location.replace('/'), 100);
  };

  const handleNewChallenge = () => {
    window.location.href = '/challenges';
  };

  const handleAccountChange = (accountId) => {
    if (onAccountChange) onAccountChange(accountId);
  };

  const profileInitial = (profile?.full_name || profile?.email || 'T')[0].toUpperCase();

  return (
    <div className="dashboard-shell" style={{ minHeight: '100vh', background: 'var(--bg)', position: 'relative' }}>
      {/* Background gradients */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(900px 500px at 8% -8%, rgba(34,197,139,.08), transparent 60%), radial-gradient(700px 460px at 100% 8%, rgba(45,212,191,.05), transparent 60%)',
      }} />

      {/* Top Header - Compact */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        height: 56, padding: '0 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--line)',
        background: 'var(--topbar-bg)', backdropFilter: 'blur(14px)',
      }}>
        {/* Left: Logo & Brand */}
        <Link href="/portal" className="logo" style={{ 
          fontSize: 16, fontWeight: 800, fontFamily: "'Unbounded', sans-serif",
          color: 'var(--text)', textDecoration: 'none',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{
            width: 24, height: 24, borderRadius: 8, background: 'var(--grad)',
            display: 'grid', placeItems: 'center', fontFamily: 'Manrope, sans-serif',
            fontWeight: 800, fontSize: 11, color: '#040806',
          }}>◆</span>
          <span>FundedDesk</span>
        </Link>

        {/* Center: Account Selector */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <AccountSelector 
            accounts={accounts} 
            selectedAccountId={account?.id} 
            onSelect={onAccountChange}
          />
        </div>

        {/* Right: Theme, Notifications, Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Theme Toggle */}
          <button onClick={toggleTheme} aria-label="Toggle theme" style={{
            width: 32, height: 32, borderRadius: 8,
            display: 'grid', placeItems: 'center',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--line)',
            color: 'var(--text)',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Notifications */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setNotificationOpen(!notificationOpen)} aria-label="Notifications" style={{
              width: 32, height: 32, borderRadius: 8,
              display: 'grid', placeItems: 'center',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--line)',
              color: 'var(--text)',
              cursor: 'pointer',
              transition: 'all 0.2s',
              position: 'relative',
            }}>
              <Bell size={16} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2,
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'var(--red)', border: '2px solid var(--bg)',
                }} />
              )}
            </button>

            <AnimatePresence>
              {notificationOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    width: 320, maxHeight: 360, overflowY: 'auto',
                    background: 'var(--card)', border: '1px solid var(--line)',
                    borderRadius: 10, boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    zIndex: 100,
                  }}
                >
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 12.5 }}>Notifications</span>
                      <button onClick={() => setNotifications(n => n.map(n => ({...n, read: true})))} 
                        style={{ fontSize: 11, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Mark all read
                      </button>
                    </div>
                  </div>
                  <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
                        No notifications
                      </div>
                    ) : (
                      notifications.map(n => (
                        <motion.div
                          key={n.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ 
                            padding: '10px 12px', borderBottom: '1px solid var(--line)',
                            opacity: n.read ? 0.6 : 1,
                          }}
                        >
                          <div style={{ fontSize: 11.5, fontWeight: 500, marginBottom: 2 }}>{n.title}</div>
                          <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{n.message}</div>
                          <div style={{ fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
                            {new Date(n.timestamp).toLocaleTimeString()}
                          </div>
                        </motion.div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile Menu */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setUserMenuOpen(!userMenuOpen)} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 8px 4px 4px', borderRadius: 9999,
              border: '1px solid var(--line2)',
              background: 'rgba(34,197,139,0.08)',
              color: 'var(--text)', cursor: 'pointer',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34,197,139,0.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(34,197,139,0.08)'; }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--grad)',
                display: 'grid', placeItems: 'center',
                fontFamily: 'Manrope, sans-serif',
                fontWeight: 800, fontSize: 11, color: '#040806',
                flexShrink: 0,
              }}>
                {profileInitial}
              </div>
              <div style={{ 
                flex: 1, minWidth: 0, textAlign: 'left',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                <div style={{ fontWeight: 600, fontSize: 12 }}>
                  {profile?.full_name || 'User'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {profile?.email || 'trader@example.com'}
                </div>
              </div>
              <ChevronDown size={11} style={{ color: 'var(--muted)', transition: 'transform 0.2s', transform: userMenuOpen ? 'rotate(180deg)' : 'none' }} />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                    width: 200, background: 'var(--card)', border: '1px solid var(--line)',
                    borderRadius: 10, boxShadow: '0 16px 44px rgba(0,0,0,0.4)',
                    zIndex: 100, overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)' }}>
                    <div style={{ fontWeight: 700, fontSize: 11.5 }}>User Name</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                      {profile?.email || 'trader@example.com'}
                    </div>
                  </div>
                  <Link href="/portal/settings" onClick={() => setUserMenuOpen(false)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                    color: 'var(--text)', fontSize: 12, fontWeight: 500,
                  }}>
                    <Settings size={13} /> Settings
                  </Link>
                  <button onClick={handleLogout} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '10px 12px', textAlign: 'left',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, color: 'var(--red)', fontWeight: 500,
                  }}>
                    <LogOut size={13} /> Log out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="mobile-menu-toggle"
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)} 
            style={{ width: 36, height: 36, borderRadius: 8,
              display: 'grid', placeItems: 'center',
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)',
              color: 'var(--text)', cursor: 'pointer' }}
            aria-label="Toggle menu"
          >
            {mobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, position: 'relative', zIndex: 1 }}>
        {/* Sidebar */}
        <aside style={{
          width: 230, flexShrink: 0, borderRight: '1px solid var(--line)',
          background: 'var(--sidebar-bg)', backdropFilter: 'blur(10px)',
          padding: '16px 12px', position: 'sticky', top: 56,
          height: 'calc(100vh - 56px)', overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
          transition: 'transform 0.3s ease',
        }} className="dashboard-sidebar" data-mobile-open={mobileSidebarOpen ? 'true' : 'false'}>
          {/* User Profile Card */}
          <div style={{
            padding: '12px 8px', borderRadius: 10, marginBottom: 14,
            background: 'linear-gradient(160deg,rgba(34,197,139,.12),rgba(45,212,191,.04))',
            border: '1px solid rgba(34,197,139,.2)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px', background: 'var(--grad)',
                display: 'grid', placeItems: 'center',
                fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: '12px',
                color: '#040806', flexShrink: 0,
              }}>
                {profileInitial}
              </div>
              <div style={{ 
                flex: 1, minWidth: 0, textAlign: 'left',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                <div style={{ fontWeight: 700, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.full_name || 'Trader'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {profile?.email || 'trader@fundeddesk.com'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--green)' }}>
              <Sparkles size={10} /> {accounts?.length || 0} active account{accounts?.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Navigation */}
          <nav style={{ flex: 1, paddingTop: '4px' }}>
            <div style={{ fontSize: 9, letterSpacing: '.1em', margin: '0 6px 6px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
              MAIN
            </div>
            
            {SIDEBAR_LINKS.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileSidebarOpen(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                  borderRadius: 8, fontSize: 12.5,
                  color: path === item.href ? 'var(--text)' : 'var(--muted)',
                  fontWeight: path === item.href ? 600 : 500,
                  background: path === item.href ? 'rgba(34,197,139,.13)' : 'transparent',
                  borderLeft: path === item.href ? '2px solid var(--green)' : '2px solid transparent',
                  marginBottom: 1, textDecoration: 'none', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
              >
                <item.icon size={14} strokeWidth={path === item.href ? 2.3 : 2} style={{ flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.label}
                </span>
              </Link>
            ))}

            {/* Analytics Dropdown */}
            <button onClick={() => setAnalyticsOpen(!analyticsOpen)} style={{
              display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 10px',
              borderRadius: 8, fontSize: 12.5, color: 'var(--muted)', fontWeight: 500,
              background: 'transparent', border: 'none', cursor: 'pointer',
              marginTop: 2, textAlign: 'left',
            }}>
              <BarChart3 size={14} />
              <span style={{ flex: 1, textAlign: 'left' }}>Analytics</span>
              <ChevronDown size={12} style={{ transform: analyticsOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
            </button>
            {analyticsOpen && (
              <div style={{ paddingLeft: 10, borderLeft: '1px dashed var(--line2)', marginLeft: 14, marginBottom: 6 }}>
                {ANALYTICS_LINKS.map(([href, Icon, label]) => (
                  <Link key={href} href={href} style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                    borderRadius: 8, fontSize: 12, fontWeight: 500,
                    color: path === href ? 'var(--text)' : 'var(--muted)',
                    background: path === href ? 'rgba(34,197,139,.08)' : 'transparent',
                    borderLeft: path === href ? '2px solid var(--green)' : 'none',
                    marginBottom: 1, textDecoration: 'none',
                  }}>
                    <Icon size={12} />
                    <span>{label}</span>
                  </Link>
                ))}
              </div>
            )}

            <div style={{ fontSize: 9, letterSpacing: '.1em', margin: '12px 6px 6px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
              OTHER
            </div>
            {OTHER_LINKS.map(([href, Icon, label]) => (
              <Link key={href} href={href} style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                borderRadius: 8, fontSize: 12.5, fontWeight: 500,
                color: path === href ? 'var(--text)' : 'var(--muted)',
                background: path === href ? 'rgba(34,197,139,.13)' : 'transparent',
                borderLeft: path === href ? '2px solid var(--green)' : '2px solid transparent',
                marginBottom: 1, textDecoration: 'none',
              }}>
                <Icon size={14} strokeWidth={path === href ? 2.3 : 2} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Mobile Overlay */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,0.5)' }}
              onClick={() => setMobileSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Main Content - Full width, no right sidebar */}
        <main style={{ flex: 1, minWidth: 0, padding: '16px 20px', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}