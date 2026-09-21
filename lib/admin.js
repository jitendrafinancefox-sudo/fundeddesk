/**
 * Admin operations client wrappers — Batch 15.
 *
 * Every privileged mutation goes through a SECURITY DEFINER RPC
 * (supabase/admin-hardening.sql) that re-checks is_admin() server-side,
 * locks the row, is idempotent, and writes an admin_actions audit row.
 * The browser never approves an order / sets a payout status / changes an
 * account state by writing a table field directly.
 *
 * Each wrapper returns { ok, data, error, missing } — `missing` means the
 * RPC isn't deployed yet (the admin page then shows an honest state).
 */

import { supabase } from '@/lib/supabaseClient';

function rpcMissing(error) {
  if (!error) return false;
  const m = error.message || '';
  return error.code === '42883' || /does not exist|could not find|not found|schema cache/i.test(m);
}

async function call(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    return {
      ok: false,
      data: null,
      missing: rpcMissing(error),
      error: rpcMissing(error)
        ? 'This admin action is not deployed yet (run supabase/admin-hardening.sql).'
        : (/not authorized/i.test(error.message) ? 'Not authorized.' : (error.message || 'Action failed.')),
    };
  }
  return { ok: true, data: data || null, missing: false, error: null };
}

export const approveOrder      = (orderId)                 => call('admin_approve_order', { p_order_id: orderId });
export const rejectOrder       = (orderId)                 => call('admin_reject_order',  { p_order_id: orderId });
export const setPayoutStatus   = (payoutId, status)        => call('admin_set_payout_status', { p_payout_id: payoutId, p_status: status });
export const setAccountStatus  = (accountId, status, reason) =>
  call('admin_set_account_status', { p_account_id: accountId, p_status: status, p_reason: reason || null });
export const replyTicket       = (ticketId, body)          => call('admin_reply_ticket', { p_ticket_id: ticketId, p_body: body });
export const setTicketStatus   = (ticketId, status)        => call('admin_set_ticket_status', { p_ticket_id: ticketId, p_status: status });
