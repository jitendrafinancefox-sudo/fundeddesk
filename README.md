# FundedDesk — Full-Stack Working Model

Prop-firm style evaluation platform prototype.
Stack: **Next.js 14 (App Router) + Supabase (Auth + Postgres + RLS) + Vercel**

## Features
- Public: Landing, Challenges, Rules, FAQ
- Auth: Email/password signup & login (Supabase Auth)
- Trader dashboard: accounts with live objective bars (profit target, daily loss, max loss),
  trades list, order history, payout requests
- Order flow: pick plan → pay via QR (placeholder) → submit UTR → admin verifies
- Admin panel (`/admin`): approve/reject orders (auto-creates trading account),
  manage accounts (phase, breach/activate, day reset, add trades with auto-breach engine),
  manage users (promote/demote admin), process payouts
- Full Row Level Security: traders see only their own data; admins see everything

## Setup (15 minutes)

### 1. Supabase
1. Create a project at supabase.com
2. SQL Editor → paste the whole of `supabase/schema.sql` → Run
3. Authentication → Providers → Email: for quick testing you can disable "Confirm email"
4. Project Settings → API → copy the URL and anon key

### 2. Local
```bash
cp .env.local.example .env.local   # paste your URL + anon key
npm install
npm run dev                        # http://localhost:3000
```

### 3. Make yourself admin
Sign up on the site first, then in Supabase SQL Editor:
```sql
update public.profiles set role = 'admin' where email = 'YOUR-EMAIL@gmail.com';
```
Refresh the site → the gold **Admin** link appears in the nav.

### 4. Deploy
Push to GitHub → import on Vercel → add the two env vars → deploy.

## Test flow
1. Sign up as a normal user (second email) → Challenges → pick plan → enter any UTR → submit
2. Log in as admin → Admin → Orders → **Approve** → account is created automatically
3. Admin → Accounts → add trades (negative P&L auto-breaches when limits hit)
4. User dashboard shows equity, progress bars, trades in real time
5. Set an account phase to `funded` → user can request payout → admin marks Paid

## Important
This is a prototype. The QR is a placeholder and no payments should be collected
until the legal/compliance structure is finalised. Keep the disclaimer bar until launch.
