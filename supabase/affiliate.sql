-- ============================================================
-- Affiliate module  ·  Batch 8  ·  additive only, NO new tables
--
-- SCOPE
--   The product's affiliate backend today is JUST:
--     - public.referrals(referrer_id, referred_user_id, code)   -- code holder rows
--     - profiles.referred_by text                               -- set at signup from ?ref=
--   There is NO affiliates table, NO commission model, NO affiliate
--   payout table, NO order-level attribution. This migration adds
--   nothing of the sort. It only adds two SECURITY DEFINER helpers so
--   the /portal/affiliate page can (a) mint a collision-safe code
--   server-side and (b) list the caller's own referrals without PII and
--   without weakening RLS (profiles/orders stay own-read only).
--
--   Same pattern as supabase/leaderboard.sql: security definer,
--   set search_path = public, explicit return columns, auth.uid()
--   derived, authenticated execute, no service role.
-- ============================================================

-- ------------------------------------------------------------
-- create_affiliate_code()
--   Returns the caller's existing referral code, or mints a new
--   collision-safe one (server-side) and returns it. Idempotent.
--   Ownership is auth.uid(); uniqueness is enforced by the existing
--   referrals.code UNIQUE constraint with a bounded retry.
-- ------------------------------------------------------------
create or replace function public.create_affiliate_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing text;
  v_code     text;
  v_try      int := 0;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select code into v_existing
  from public.referrals
  where referrer_id = auth.uid() and referred_user_id is null
  order by created_at asc
  limit 1;

  if v_existing is not null then
    return v_existing;
  end if;

  loop
    v_try := v_try + 1;
    v_code := 'FD' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
    begin
      insert into public.referrals (referrer_id, referred_user_id, code)
      values (auth.uid(), null, v_code);
      return v_code;
    exception when unique_violation then
      if v_try > 8 then
        raise exception 'could not allocate an affiliate code, please retry';
      end if;
    end;
  end loop;
end;
$$;

comment on function public.create_affiliate_code() is
  'Idempotently returns/mints the caller''s referral code in public.referrals. '
  'Server-side ownership (auth.uid()) and uniqueness. No commission/payout logic.';

grant execute on function public.create_affiliate_code() to authenticated;


-- ------------------------------------------------------------
-- get_affiliate_referrals()
--   Privacy-safe list of profiles that signed up with any of the
--   caller's referral codes (profiles.referred_by). Returns:
--     - referral_tag : anonymised, deterministic (md5 of profile id)
--     - joined_at    : profiles.created_at
--     - has_purchased: whether that profile has ANY orders row
--   No email / name / phone / user id / order amount / commission is
--   returned (there is no commission model to attribute).
-- ------------------------------------------------------------
create or replace function public.get_affiliate_referrals()
returns table (
  referral_tag  text,
  joined_at     timestamptz,
  has_purchased boolean
)
language sql
security definer
set search_path = public
stable
as $$
  with my_codes as (
    select code from public.referrals where referrer_id = auth.uid()
  )
  select
    'REF-' || upper(substr(md5(p.id::text), 1, 4))                      as referral_tag,
    p.created_at                                                        as joined_at,
    exists (select 1 from public.orders o where o.user_id = p.id)       as has_purchased
  from public.profiles p
  where p.referred_by is not null
    and p.referred_by in (select code from my_codes)
    and p.id <> auth.uid()
  order by p.created_at desc
  limit 500
$$;

comment on function public.get_affiliate_referrals() is
  'Anonymised list of the caller''s referred sign-ups (profiles.referred_by). '
  'SECURITY DEFINER so it can read other profiles/orders while RLS stays intact. '
  'Returns no PII and no financial amounts.';

grant execute on function public.get_affiliate_referrals() to authenticated;
