-- ============================================================
-- Support Center  ·  Batch 16  ·  additive
--
-- BEFORE: a single fire-and-forget `support_tickets` table (one message per
-- ticket, no thread, no visibility for the trader), SELECT/INSERT RLS was
-- fine but INSERT let a signed-in user set an arbitrary `email` and a null
-- `user_id`.  No reply mechanism.  No email provider.  No notification on
-- ticket events.
--
-- THIS MIGRATION (minimum viable, no invented business rules):
--   1. support_tickets: + category (small controlled enum), + optional
--      account_id (ownership-checked), + updated_at, + closed_at.
--      status locked to the two values actually used: 'open' | 'closed'.
--   2. BEFORE INSERT trigger: force user_id = auth.uid() and
--      email = auth.email() for authenticated inserts (fixes VULN-S1);
--      null a non-owned account_id; default category to 'GENERAL'.
--   3. support_ticket_messages: real two-way thread. SELECT-only RLS
--      (you see messages of tickets you can see). NO direct insert policy —
--      replies go through RPCs so `author_role` cannot be forged.
--   4. RPCs: reply_ticket (trader), admin_reply_ticket / admin_set_ticket_status
--      (admin, audited via log_admin_action).
--   5. AFTER UPDATE trigger: on status -> 'closed', emit a SUPPORT
--      notification (Batch 13 table) — guarded so it no-ops if that table
--      isn't deployed.
-- ============================================================

-- ---- 1. widen support_tickets ------------------------------------
alter table public.support_tickets add column if not exists category   text;
alter table public.support_tickets add column if not exists account_id  uuid references public.accounts(id) on delete set null;
alter table public.support_tickets add column if not exists updated_at  timestamptz not null default now();
alter table public.support_tickets add column if not exists closed_at   timestamptz;

alter table public.support_tickets drop constraint if exists support_tickets_category_chk;
alter table public.support_tickets add  constraint support_tickets_category_chk
  check (category is null or category in
    ('ACCOUNT','ORDER','PAYOUT','TRADING','TECHNICAL','GENERAL','FEATURE_REQUEST')) not valid;

alter table public.support_tickets drop constraint if exists support_tickets_status_chk;
alter table public.support_tickets add  constraint support_tickets_status_chk
  check (status in ('open','closed')) not valid;

create index if not exists idx_support_tickets_user_created
  on public.support_tickets (user_id, created_at desc);

-- ---- 2. insert guard (fixes VULN-S1) ---------------------------
create or replace function public.tg_support_ticket_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
    new.email   := coalesce(auth.email(), new.email);
  end if;
  new.status     := 'open';
  new.updated_at := now();
  new.closed_at  := null;
  if new.category is null then new.category := 'GENERAL'; end if;

  -- optional account link must belong to the ticket owner, else drop it
  if new.account_id is not null then
    if not exists (select 1 from public.accounts a
                   where a.id = new.account_id and a.user_id = new.user_id) then
      new.account_id := null;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists support_ticket_insert_guard on public.support_tickets;
create trigger support_ticket_insert_guard
  before insert on public.support_tickets
  for each row execute function public.tg_support_ticket_insert();

-- ---- 3. thread table ------------------------------------------
create table if not exists public.support_ticket_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets(id) on delete cascade,
  author_id   uuid references public.profiles(id) on delete set null,
  author_role text not null check (author_role in ('trader','support')),
  body        text not null check (length(btrim(body)) between 1 and 5000),
  created_at  timestamptz not null default now()
);
create index if not exists idx_ticket_messages_ticket
  on public.support_ticket_messages (ticket_id, created_at);

alter table public.support_ticket_messages enable row level security;

drop policy if exists "ticket messages read" on public.support_ticket_messages;
create policy "ticket messages read" on public.support_ticket_messages
  for select using (
    exists (select 1 from public.support_tickets t
            where t.id = ticket_id and (t.user_id = auth.uid() or public.is_admin()))
  );
-- NO insert / update / delete policy: all writes go through the RPCs below.

-- ---- 4. reply / status RPCs ----------------------------------
create or replace function public.reply_ticket(p_ticket_id uuid, p_body text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare t public.support_tickets%rowtype; v_body text := btrim(coalesce(p_body,''));
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if length(v_body) < 1 or length(v_body) > 5000 then raise exception 'message must be 1-5000 characters'; end if;
  select * into t from public.support_tickets where id = p_ticket_id for update;
  if not found or t.user_id is distinct from auth.uid() then raise exception 'ticket not found'; end if;

  insert into public.support_ticket_messages (ticket_id, author_id, author_role, body)
  values (p_ticket_id, auth.uid(), 'trader', v_body);

  update public.support_tickets
     set updated_at = now(),
         status     = case when status = 'closed' then 'open' else status end,
         closed_at  = case when status = 'closed' then null else closed_at end
   where id = p_ticket_id;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_reply_ticket(p_ticket_id uuid, p_body text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_body text := btrim(coalesce(p_body,''));
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if length(v_body) < 1 or length(v_body) > 5000 then raise exception 'message must be 1-5000 characters'; end if;
  if not exists (select 1 from public.support_tickets where id = p_ticket_id) then raise exception 'ticket not found'; end if;

  insert into public.support_ticket_messages (ticket_id, author_id, author_role, body)
  values (p_ticket_id, auth.uid(), 'support', v_body);

  update public.support_tickets set updated_at = now() where id = p_ticket_id;
  perform public.log_admin_action('ticket.reply', 'support_tickets', p_ticket_id, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_set_ticket_status(p_ticket_id uuid, p_status text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  if p_status not in ('open','closed') then raise exception 'invalid status'; end if;
  update public.support_tickets
     set status = p_status,
         updated_at = now(),
         closed_at = case when p_status = 'closed' then now() else null end
   where id = p_ticket_id;
  if not found then raise exception 'ticket not found'; end if;
  perform public.log_admin_action('ticket.' || p_status, 'support_tickets', p_ticket_id, '{}'::jsonb);
  return jsonb_build_object('status', p_status);
end;
$$;

grant execute on function public.reply_ticket(uuid, text)             to authenticated;
grant execute on function public.admin_reply_ticket(uuid, text)       to authenticated;
grant execute on function public.admin_set_ticket_status(uuid, text)  to authenticated;

-- ---- 5. notify the trader when their ticket is closed --------
create or replace function public.tg_notify_ticket()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  begin
    if tg_op = 'UPDATE'
       and new.status is distinct from old.status
       and new.status = 'closed'
       and new.user_id is not null then
      insert into public.notifications (user_id, type, title, body, action_url, ref)
      values (
        new.user_id, 'SUPPORT', 'Support request closed',
        'Your request "' || left(coalesce(new.subject,'request'), 80) || '" was marked resolved.',
        '/portal/support/' || new.id::text,
        'support_tickets:' || new.id::text || ':status:closed'
      )
      on conflict (user_id, ref) do nothing;
    end if;
  exception when others then
    return new; -- notifications table absent / type not allowed -> never block
  end;
  return new;
end;
$$;
drop trigger if exists notify_ticket_status on public.support_tickets;
create trigger notify_ticket_status
  after update on public.support_tickets
  for each row execute function public.tg_notify_ticket();

-- allow the SUPPORT notification type (Batch 13's notifications table), guarded
do $$
begin
  alter table public.notifications drop constraint if exists notifications_type_check;
  alter table public.notifications add  constraint notifications_type_check
    check (type in ('ACCOUNT','PAYOUT','ORDER','SUPPORT'));
exception when undefined_table then null;
end $$;
