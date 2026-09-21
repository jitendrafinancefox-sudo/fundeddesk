-- ============================================================
-- Legal acceptance log  ·  Batch 18  ·  additive
--
-- Records that a user ticked an agreement box for a specific document
-- version at a specific time. Append-only: a user may INSERT their own
-- rows and SELECT their own rows, but cannot UPDATE or DELETE any row —
-- so the accepted version and timestamp cannot be altered after the fact
-- (STEP 26). `record_legal_acceptance` is the write path; it forces
-- user_id = auth.uid() and is idempotent per (user, document, version).
--
-- NOTE: the documents referenced (terms / privacy / disclaimer /
-- risk-disclosure / refund) are currently DRAFTS pending legal review.
-- The version string ('draft-YYYY-MM') records exactly which text the
-- user saw; when counsel finalises the wording the version changes and
-- users are asked to re-accept, with history preserved.
-- ============================================================

create table if not exists public.legal_acceptances (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  document    text not null check (document in
                ('terms','privacy','disclaimer','risk-disclosure','refund','bundle')),
  version     text not null check (length(btrim(version)) between 1 and 64),
  context     text check (context is null or length(context) <= 64),  -- e.g. 'signup' | 'checkout'
  accepted_at timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (user_id, document, version)
);

create index if not exists idx_legal_acceptances_user
  on public.legal_acceptances (user_id, accepted_at desc);

alter table public.legal_acceptances enable row level security;

drop policy if exists "legal acceptances own read"   on public.legal_acceptances;
drop policy if exists "legal acceptances own insert" on public.legal_acceptances;
drop policy if exists "legal acceptances admin read" on public.legal_acceptances;

create policy "legal acceptances own read" on public.legal_acceptances
  for select using (user_id = auth.uid());
create policy "legal acceptances admin read" on public.legal_acceptances
  for select using (public.is_admin());
create policy "legal acceptances own insert" on public.legal_acceptances
  for insert with check (user_id = auth.uid());
-- NO update / delete policy: rows are immutable once written.

create or replace function public.record_legal_acceptance(
  p_document text, p_version text, p_context text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_doc text := lower(btrim(coalesce(p_document,'')));
        v_ver text := btrim(coalesce(p_version,''));
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if v_doc not in ('terms','privacy','disclaimer','risk-disclosure','refund','bundle') then
    raise exception 'unknown document';
  end if;
  if length(v_ver) < 1 or length(v_ver) > 64 then raise exception 'bad version'; end if;

  insert into public.legal_acceptances (user_id, document, version, context)
  values (auth.uid(), v_doc, v_ver, nullif(left(coalesce(p_context,''), 64), ''))
  on conflict (user_id, document, version) do nothing;

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.record_legal_acceptance(text, text, text) to authenticated;

comment on table public.legal_acceptances is
  'Append-only log of which legal-document version a user accepted and when. '
  'Users read/insert their own rows only; no update/delete. Written via '
  'record_legal_acceptance(). Documents are DRAFTS pending legal review.';
