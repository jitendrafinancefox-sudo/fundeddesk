-- ============================================================
-- Notifications  ·  Batch 13  ·  additive, minimal
--
-- WHY THIS IS SAFE / MINIMAL
--   There was NO notification infrastructure (no table, no API route, no
--   email, no push, no realtime, no preference store). The only real
--   user-facing "events" are STATUS TRANSITIONS on tables the user already
--   owns: orders.status, accounts.status/phase, payouts.status. Those
--   transitions are performed today by the admin panel.
--
--   Rather than let browser JS write "system notifications" (unsafe), the
--   emission happens in trusted server-side DB TRIGGERS: one notification
--   row per real transition, made idempotent by UNIQUE(user_id, ref) +
--   ON CONFLICT DO NOTHING. Every trigger body is wrapped so a notify
--   failure can NEVER block the underlying order/account/payout update.
--
--   Users can only SELECT their own rows. There is NO user insert / update
--   / delete policy — read-state changes go through two SECURITY DEFINER
--   RPCs scoped to auth.uid(). No email, no push, no preferences, no
--   realtime publication, no fabricated content — titles/bodies are
--   derived deterministically from the row.
-- ============================================================

create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  account_id  uuid references public.accounts(id) on delete set null,
  type        text not null check (type in ('ACCOUNT', 'PAYOUT', 'ORDER')),
  title       text not null,
  body        text,
  action_url  text,
  ref         text not null,            -- "<table>:<id>:<field>:<value>" — idempotency key
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  unique (user_id, ref)
);

create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_user_unread
  on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

-- read: own rows only
drop policy if exists "notifications own read" on public.notifications;
create policy "notifications own read" on public.notifications
  for select using (user_id = auth.uid());

-- NO insert / update / delete policy for users. Triggers (definer) write;
-- read-state is changed only through the RPCs below.

-- ------------------------------------------------------------
-- ORDER: pending -> approved | rejected
-- ------------------------------------------------------------
create or replace function public.tg_notify_order()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    if tg_op = 'UPDATE'
       and new.status is distinct from old.status
       and new.status in ('approved', 'rejected') then
      insert into public.notifications (user_id, type, title, body, action_url, ref)
      values (
        new.user_id, 'ORDER',
        case new.status when 'approved' then 'Order approved' else 'Order not approved' end,
        case new.status
          when 'approved' then 'Your challenge order was approved — the trading account will appear under Accounts.'
          else 'Your challenge order was not approved. Contact support if you have questions.'
        end,
        '/portal/accounts',
        'orders:' || new.id::text || ':status:' || new.status
      )
      on conflict (user_id, ref) do nothing;
    end if;
  exception when others then
    return new; -- never block the order update
  end;
  return new;
end $$;

drop trigger if exists notify_order_status on public.orders;
create trigger notify_order_status
  after update on public.orders
  for each row execute function public.tg_notify_order();

-- ------------------------------------------------------------
-- ACCOUNT: status -> breached | passed ; phase -> funded
-- ------------------------------------------------------------
create or replace function public.tg_notify_account()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    if tg_op = 'UPDATE'
       and new.status is distinct from old.status
       and new.status in ('breached', 'passed') then
      insert into public.notifications (user_id, account_id, type, title, body, action_url, ref)
      values (
        new.user_id, new.id, 'ACCOUNT',
        case new.status when 'breached' then 'Account breached' else 'Evaluation passed' end,
        case new.status
          when 'breached' then 'Account ' || coalesce(new.login_id, '') || ' hit a loss limit and is now closed.'
          else 'Account ' || coalesce(new.login_id, '') || ' passed its evaluation.'
        end,
        '/portal/accounts/' || new.id::text,
        'accounts:' || new.id::text || ':status:' || new.status
      )
      on conflict (user_id, ref) do nothing;
    end if;

    if tg_op = 'UPDATE'
       and new.phase is distinct from old.phase
       and new.phase = 'funded' then
      insert into public.notifications (user_id, account_id, type, title, body, action_url, ref)
      values (
        new.user_id, new.id, 'ACCOUNT',
        'Account funded',
        'Account ' || coalesce(new.login_id, '') || ' is now a funded account.',
        '/portal/accounts/' || new.id::text,
        'accounts:' || new.id::text || ':phase:funded'
      )
      on conflict (user_id, ref) do nothing;
    end if;
  exception when others then
    return new;
  end;
  return new;
end $$;

drop trigger if exists notify_account_status on public.accounts;
create trigger notify_account_status
  after update on public.accounts
  for each row execute function public.tg_notify_account();

-- ------------------------------------------------------------
-- PAYOUT: requested -> paid | rejected
-- ------------------------------------------------------------
create or replace function public.tg_notify_payout()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    if tg_op = 'UPDATE'
       and new.status is distinct from old.status
       and new.status in ('paid', 'rejected') then
      insert into public.notifications (user_id, account_id, type, title, body, action_url, ref)
      values (
        new.user_id, new.account_id, 'PAYOUT',
        case new.status when 'paid' then 'Payout paid' else 'Payout not approved' end,
        case new.status
          when 'paid' then 'Your payout request has been marked paid.'
          else 'Your payout request was not approved.'
        end,
        '/portal/payouts',
        'payouts:' || new.id::text || ':status:' || new.status
      )
      on conflict (user_id, ref) do nothing;
    end if;
  exception when others then
    return new;
  end;
  return new;
end $$;

drop trigger if exists notify_payout_status on public.payouts;
create trigger notify_payout_status
  after update on public.payouts
  for each row execute function public.tg_notify_payout();

-- ------------------------------------------------------------
-- Read-state RPCs — the ONLY way a user changes a notification.
-- Both are scoped to auth.uid(); a user cannot touch another user's rows.
-- ------------------------------------------------------------
create or replace function public.mark_notifications_read(p_ids uuid[])
returns integer language sql security definer set search_path = public as $$
  with upd as (
    update public.notifications
       set read_at = now()
     where user_id = auth.uid()
       and read_at is null
       and id = any(coalesce(p_ids, '{}'::uuid[]))
     returning 1
  )
  select count(*)::int from upd
$$;

create or replace function public.mark_all_notifications_read()
returns integer language sql security definer set search_path = public as $$
  with upd as (
    update public.notifications
       set read_at = now()
     where user_id = auth.uid() and read_at is null
     returning 1
  )
  select count(*)::int from upd
$$;

grant execute on function public.mark_notifications_read(uuid[]) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

comment on table public.notifications is
  'Per-user system notifications, written only by DB triggers on order / '
  'account / payout status transitions. Users may SELECT their own rows and '
  'mark them read via mark_notifications_read / mark_all_notifications_read.';
