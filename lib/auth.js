/**
 * Canonical auth helpers  (Batch 9)
 *
 * One implementation of "sign out on this device" so PortalShell, Nav and
 * Settings can't drift. Uses the existing browser Supabase client only —
 * no server client, no service role, no middleware in this project.
 */

import { supabase } from '@/lib/supabaseClient';

/**
 * Sign out the current device and return to the marketing home.
 * Mirrors the sequence PortalShell/Nav have always used: local scope so a
 * network failure can't leave the user stuck, then clear the persisted
 * Supabase tokens, then hard-redirect.
 */
export function signOutLocal(redirectTo = '/') {
  try { supabase.auth.signOut({ scope: 'local' }).catch(() => {}); } catch (e) {}
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('sb-'))
      .forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch (e) {}
  setTimeout(() => window.location.replace(redirectTo), 100);
}

/**
 * Revoke every OTHER session for this user (keeps the current one).
 * Real Supabase capability (`scope: 'others'`); surfaces the real error.
 * @returns {Promise<{error: import('@supabase/supabase-js').AuthError | null}>}
 */
export async function signOutOtherDevices() {
  try {
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    return { error: error || null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error('Sign-out failed') };
  }
}
