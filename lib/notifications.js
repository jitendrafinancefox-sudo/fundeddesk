/**
 * Notification helpers — Batch 13.
 *
 * Source of truth: the `public.notifications` table, written ONLY by
 * server-side DB triggers (supabase/notifications.sql). This module holds
 * presentation metadata + a strict allow-list for action links. It never
 * fabricates a notification.
 */

export const NOTIF_TYPES = ['ACCOUNT', 'PAYOUT', 'ORDER'];

export const NOTIF_TYPE_META = {
  ACCOUNT: { label: 'Account', tag: 'tag-blue' },
  PAYOUT: { label: 'Payout', tag: 'tag-green' },
  ORDER: { label: 'Order', tag: 'tag-gold' },
};

export function typeMeta(type) {
  return NOTIF_TYPE_META[type] || { label: type || 'Notice', tag: 'tag-muted' };
}

/**
 * Only allow internal, known routes as notification actions. Anything else
 * (external URLs, javascript:, admin paths, unknown metadata) -> null.
 * The trigger only ever writes /portal/... paths, but this guards the UI
 * regardless of what a row contains.
 */
export function safeActionUrl(url) {
  if (typeof url !== 'string') return null;
  const u = url.trim();
  if (!u.startsWith('/')) return null;            // must be a relative internal path
  if (u.startsWith('//')) return null;            // protocol-relative
  if (/\s/.test(u)) return null;
  const ok = ['/portal/', '/rules', '/challenges', '/faq'];
  if (u === '/portal' || ok.some((p) => u === p || u.startsWith(p))) return u;
  return null;
}

/** Postgrest / PG "relation or function does not exist" -> treat as "not deployed". */
export function notifBackendMissing(error) {
  if (!error) return false;
  const msg = error.message || '';
  return (
    error.code === '42P01' ||
    error.code === '42883' ||
    /does not exist|could not find|not found|schema cache/i.test(msg)
  );
}
