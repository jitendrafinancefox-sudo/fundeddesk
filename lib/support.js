/**
 * Support helpers — Batch 16.
 *
 * Source of truth: public.support_tickets + public.support_ticket_messages
 * (supabase/support.sql). Ticket ownership + read-state is RLS-enforced;
 * replies go through SECURITY DEFINER RPCs so author_role can't be forged.
 *
 * Statuses in use: 'open' | 'closed' (the only two the schema allows).
 * No SLA, no priority, no assignment, no email — those don't exist.
 */

import { supabase } from '@/lib/supabaseClient';

export const TICKET_CATEGORIES = [
  { value: 'ACCOUNT', label: 'Account & verification' },
  { value: 'ORDER', label: 'Order / payment' },
  { value: 'PAYOUT', label: 'Payout' },
  { value: 'TRADING', label: 'Trading & rules' },
  { value: 'TECHNICAL', label: 'Technical issue / bug' },
  { value: 'GENERAL', label: 'General question' },
  { value: 'FEATURE_REQUEST', label: 'Feature request' },
];

export function categoryLabel(v) {
  return TICKET_CATEGORIES.find((c) => c.value === v)?.label || 'General question';
}

export function ticketStatusMeta(status) {
  switch (status) {
    case 'open': return { label: 'Open', tag: 'tag-gold' };
    case 'closed': return { label: 'Closed', tag: 'tag-green' };
    default: return { label: status ? String(status) : 'Open', tag: 'tag-muted' };
  }
}

export function supportBackendMissing(error) {
  if (!error) return false;
  const m = error.message || '';
  return (
    error.code === '42P01' ||  // undefined_table
    error.code === '42703' ||  // undefined_column (migration not applied)
    error.code === '42883' ||  // undefined_function
    /does not exist|could not find|not found|schema cache/i.test(m)
  );
}

/** Trader posts a reply on their own ticket (reopens it if closed). */
export async function replyToTicket(ticketId, body) {
  const { data, error } = await supabase.rpc('reply_ticket', { p_ticket_id: ticketId, p_body: body });
  if (error) {
    return { ok: false, missing: supportBackendMissing(error), error: error.message || 'Reply failed.' };
  }
  return { ok: true, data };
}
