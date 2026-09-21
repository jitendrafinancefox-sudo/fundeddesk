'use client';

/* ============================================================
   PORTAL DATA PROVIDER

   Single source of truth for the authenticated session, the user
   profile and the user's challenge accounts + the currently
   selected account. Both the portal shell (topbar account
   selector) and the pages inside /portal read from this one
   context — there is no second session / accounts fetch anywhere
   in the portal.

   - No data is fabricated. If a query fails, `error` is set and
     the shell shows a real error state.
   - The selected account is persisted per-browser in localStorage
     so it survives navigation and reloads. It is only ever set to
     an id that actually exists in the fetched list.
   ============================================================ */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { notifBackendMissing } from '@/lib/notifications';

const SELECTED_KEY = 'fd-selected-account';

const PortalDataContext = createContext(null);

export function usePortalData() {
  const ctx = useContext(PortalDataContext);
  if (!ctx) {
    throw new Error('usePortalData must be used inside <PortalDataProvider>');
  }
  return ctx;
}

// Non-throwing variant for components that render both inside the portal
// (e.g. /portal/terminal, wrapped in <PortalDataProvider>) and standalone
// (e.g. /tv-chart, which has no provider) — returns null outside the portal
// instead of crashing, so the same component can stay account-aware where
// a real account context exists and fall back gracefully where it doesn't.
export function usePortalDataOptional() {
  return useContext(PortalDataContext);
}

export default function PortalDataProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  // ---- notifications: only the lightweight unread count is shared here.
  // The dropdown and /portal/notifications fetch their own lists on demand.
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifDeployed, setNotifDeployed] = useState(true);
  const userIdRef = useRef(null);

  const refreshUnread = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
      .is('read_at', null);
    if (error) {
      if (notifBackendMissing(error)) setNotifDeployed(false);
      return; // never fabricate a count on error
    }
    setNotifDeployed(true);
    setUnreadCount(count || 0);
  }, []);

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = '/login';
        return;
      }
      setUserId(session.user.id);
      userIdRef.current = session.user.id;

      const [profRes, accRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).single(),
        supabase
          .from('accounts')
          .select('*, plans(*)')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (accRes.error) throw accRes.error;

      const prof = profRes.data || null;
      const list = accRes.data || [];

      setProfile({ ...(prof || {}), email: session.user.email });
      setIsAdmin(prof?.role === 'admin');
      setAccounts(list);

      setSelectedAccountId((prev) => {
        if (prev && list.some((a) => a.id === prev)) return prev;
        let stored = null;
        try { stored = localStorage.getItem(SELECTED_KEY); } catch (e) {}
        if (stored && list.some((a) => a.id === stored)) return stored;
        return list[0]?.id ?? null;
      });

      setError(null);
    } catch (e) {
      setError(e?.message || 'We could not load your portal data.');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Fetch the unread count once ready, and whenever the tab regains focus.
  // No polling — a new notification shows on the next focus / navigation /
  // explicit refresh from the panel.
  useEffect(() => {
    if (!userId) return;
    refreshUnread();
    const onVis = () => { if (document.visibilityState === 'visible') refreshUnread(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [userId, refreshUnread]);

  const selectAccount = useCallback((id) => {
    setSelectedAccountId(id);
    try { if (id) localStorage.setItem(SELECTED_KEY, id); } catch (e) {}
  }, []);

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || null;

  const value = {
    ready,
    error,
    userId,
    profile,
    isAdmin,
    accounts,
    selectedAccountId,
    selectedAccount,
    selectAccount,
    refresh: load,
    unreadCount,
    notifDeployed,
    refreshUnread,
  };

  return (
    <PortalDataContext.Provider value={value}>
      {children}
    </PortalDataContext.Provider>
  );
}
