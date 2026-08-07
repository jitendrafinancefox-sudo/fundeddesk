-- ============================================================
-- User watchlist persistence
--   - user_watchlist_items table (already exists in Supabase;
--     IF NOT EXISTS keeps this idempotent)
-- ============================================================

create table if not exists public.user_watchlist_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  token text not null,
  exch text,
  symbol_label text not null,
  kind text not null default 'stock',          -- 'index' | 'stock' | 'option'
  created_at timestamptz default now(),
  unique (user_id, token)
);

-- ---------- ROW LEVEL SECURITY ----------
alter table public.user_watchlist_items enable row level security;

create policy "watchlist own read"    on public.user_watchlist_items for select using (auth.uid() = user_id);
create policy "watchlist own insert"  on public.user_watchlist_items for insert with check (auth.uid() = user_id);
create policy "watchlist own delete"  on public.user_watchlist_items for delete using (auth.uid() = user_id);
create policy "watchlist admin all"   on public.user_watchlist_items for all using (public.is_admin());
