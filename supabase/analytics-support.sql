-- ============================================================
-- Analytics + Support migration  ·  additive only
--   - CREATE new tables: economic_events, support_tickets, admin_actions
--   - CREATE function: log_admin_action
--   (no changes to existing tables)
-- ============================================================

-- ---------- ECONOMIC EVENTS ----------
create table if not exists public.economic_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date not null,
  category text,
  notes text,
  created_at timestamptz default now()
);

-- ---------- SUPPORT TICKETS ----------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'open',
  created_at timestamptz default now()
);

-- ---------- ADMIN AUDIT LOG ----------
create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.profiles(id) on delete set null,
  action text not null,
  table_name text,
  row_id uuid,
  details jsonb,
  created_at timestamptz default now()
);

create or replace function public.log_admin_action(p_action text, p_table text default null, p_row uuid default null, p_details jsonb default '{}')
returns void as $$
begin
  insert into public.admin_actions (admin_id, action, table_name, row_id, details)
  values (auth.uid(), p_action, p_table, p_row, p_details);
end;
$$ language plpgsql security definer;

-- ---------- ROW LEVEL SECURITY ----------
alter table public.economic_events  enable row level security;
alter table public.support_tickets   enable row level security;
alter table public.admin_actions     enable row level security;

-- economic_events: anyone can read active events; admin can write
create policy "events public read"   on public.economic_events
  for select using (true);
create policy "events admin write"   on public.economic_events
  for all using (public.is_admin());

-- support_tickets: users read their own; guests can submit; admin sees all
create policy "tickets own read"     on public.support_tickets
  for select using (auth.uid() = user_id or public.is_admin());
create policy "tickets public insert" on public.support_tickets
  for insert with check (user_id is null or auth.uid() = user_id);
create policy "tickets admin write"   on public.support_tickets
  for all using (public.is_admin());

-- admin_actions: only admins can read; RPC inserts for admins
create policy "actions admin read"     on public.admin_actions
  for select using (public.is_admin());
