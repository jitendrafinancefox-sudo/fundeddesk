/**
 * Coupon helpers — Batch 14.
 *
 * The browser NEVER reads the `coupons` table. Validation goes through the
 * `validate_coupon` RPC (supabase/coupons-hardening.sql), which returns a
 * status + minimal fields. The final order price is recomputed server-side
 * by a BEFORE INSERT trigger on `orders`, so nothing here is financially
 * authoritative — a shown discount is a preview only.
 */

import { supabase } from '@/lib/supabaseClient';

export const COUPON_STATUS = {
  VALID: 'VALID',
  INVALID_CODE: 'INVALID_CODE',
  INACTIVE: 'INACTIVE',
  EXPIRED: 'EXPIRED',
  NO_DISCOUNT: 'NO_DISCOUNT',
  BACKEND_ERROR: 'BACKEND_ERROR',
  BACKEND_MISSING: 'BACKEND_MISSING',
};

export const COUPON_STATUS_MESSAGE = {
  INVALID_CODE: 'We couldn’t find that code.',
  INACTIVE: 'That code isn’t active.',
  EXPIRED: 'That code has expired.',
  NO_DISCOUNT: 'That code has no discount attached.',
  BACKEND_ERROR: 'Couldn’t validate this coupon right now. Please try again.',
  BACKEND_MISSING: 'Coupon validation isn’t available yet.',
};

export function couponBackendMissing(error) {
  if (!error) return false;
  const msg = error.message || '';
  return (
    error.code === '42883' ||
    error.code === '42P01' ||
    /does not exist|could not find|not found|schema cache/i.test(msg)
  );
}

/**
 * @param {string} code
 * @param {number|null} planId  (accepted for future plan-eligibility rules)
 * @returns {Promise<{ status: string, code: string|null, discountPercent: number|null, expiresAt: string|null }>}
 */
export async function validateCoupon(code, planId = null) {
  const trimmed = String(code || '').trim().toUpperCase();
  if (!trimmed) return { status: COUPON_STATUS.INVALID_CODE, code: null, discountPercent: null, expiresAt: null };

  const { data, error } = await supabase.rpc('validate_coupon', {
    p_code: trimmed,
    p_plan_id: Number.isFinite(Number(planId)) ? Number(planId) : null,
  });

  if (error) {
    return {
      status: couponBackendMissing(error) ? COUPON_STATUS.BACKEND_MISSING : COUPON_STATUS.BACKEND_ERROR,
      code: null, discountPercent: null, expiresAt: null,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.status) {
    return { status: COUPON_STATUS.BACKEND_ERROR, code: null, discountPercent: null, expiresAt: null };
  }
  return {
    status: row.status,
    code: row.code ?? null,
    discountPercent: Number.isFinite(Number(row.discount_percent)) ? Number(row.discount_percent) : null,
    expiresAt: row.expires_at ?? null,
  };
}
