'use client';

/* ============================================================
   /portal/gold-coins  —  Loyalty / Gold Coins workspace

   AUDIT RESULT (Batch 12): there is NO reward backend.
     - no rewards / coins / loyalty / points / credits / redemptions
       table in any migration
     - no reward API route, RPC, or admin control
     - no coin/points/balance column on profiles or anywhere else
     - the only "reward" language in the codebase is the trader PROFIT
       SPLIT (payouts) and affiliate/coupon copy — separate systems
   Classification: A — No reward backend.

   Therefore this page shows a truthful "not enabled" state. It does NOT:
     - show a balance number (not even 0)
     - render a transactions table, tier ladder, progress bar, expiry,
       redeem button, or reward catalogue
     - read/write anything from localStorage
   It points to the mechanisms that DO exist today (Affiliate, Coupons),
   which are separate from Gold Coins and do not currently issue coins.
   ============================================================ */

import Link from 'next/link';
import { Coins, Users2, Ticket } from 'lucide-react';
import { usePortalData } from '@/components/portal/PortalDataProvider';

export default function GoldCoinsPage() {
  const { ready, error } = usePortalData();

  if (!ready) {
    return (
      <div className="portal-dashboard" style={{ maxWidth: 720 }}>
        <div style={{ height: 26, width: 170, background: 'rgba(255,255,255,0.05)', borderRadius: 8, marginBottom: 20, animation: 'pulse 1.5s ease-in-out infinite' }} />
        <div className="card" style={{ height: 180, animation: 'pulse 1.5s ease-in-out infinite' }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="portal-dashboard" style={{ maxWidth: 720 }}>
        <div className="card" style={{ padding: 24 }}>
          <p className="err" role="alert" style={{ margin: 0 }}>
            Your session could not be loaded. <Link href="/login" style={{ color: 'var(--green)' }}>Sign in again</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-dashboard" style={{ maxWidth: 720 }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(245,185,62,.14)', border: '1px solid rgba(245,185,62,.3)', display: 'grid', placeItems: 'center' }} aria-hidden="true">
          <Coins size={20} color="var(--gold)" />
        </div>
        <div>
          <h1 style={{ fontSize: 22, margin: 0, fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}>Gold Coins</h1>
          <p className="muted" style={{ fontSize: 13, margin: '2px 0 0' }}>FundedDesk loyalty programme.</p>
        </div>
      </div>

      {/* status — the honest core */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <span className="tag tag-gold" style={{ fontSize: 10 }}>NOT ENABLED</span>
          <h2 style={{ fontSize: 15, margin: 0, fontWeight: 700 }}>The Gold Coins programme isn&apos;t active yet</h2>
        </div>
        <p className="muted" style={{ fontSize: 13, margin: '0 0 14px', lineHeight: 1.6 }}>
          There is no coin ledger, earning engine, rewards catalogue or redemption flow in the platform today, so no
          balance or history is shown here. When the programme launches, this page will show your real balance,
          earning events and redemptions — nothing is estimated in the meantime.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
          <Stat label="Current balance" value="—" note="No reward ledger configured" />
          <Stat label="Earned" value="—" note="Not tracked yet" />
          <Stat label="Redeemed" value="—" note="Not tracked yet" />
        </div>
      </div>

      {/* what it will cover — generic, no numbers/tiers/values */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <h2 style={{ fontSize: 14, margin: '0 0 10px', fontWeight: 700 }}>What it will cover</h2>
        <ul className="muted" style={{ fontSize: 12.5, lineHeight: 1.8, margin: 0, paddingLeft: 18 }}>
          <li>A loyalty balance with an auditable earning/redemption history.</li>
          <li>Earning events tied to real platform activity (defined when the programme launches).</li>
          <li>A rewards catalogue with redemption, validated server-side.</li>
          <li>Loyalty status, if the launched programme includes tiers.</li>
        </ul>
        <p className="dim" style={{ fontSize: 11, marginTop: 10, marginBottom: 0, lineHeight: 1.5 }}>
          Earning rates, coin value, tiers, expiry and catalogue pricing are not defined yet and are deliberately not
          shown. Gold Coins are a loyalty concept — not withdrawable cash — and are separate from trader payouts.
        </p>
      </div>

      {/* what exists today */}
      <div className="card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 14, margin: '0 0 10px', fontWeight: 700 }}>Earn &amp; save today</h2>
        <p className="muted" style={{ fontSize: 12.5, margin: '0 0 14px', lineHeight: 1.6 }}>
          These programmes are live now. They are separate from Gold Coins and do not currently issue coins.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link href="/portal/affiliate" className="card" style={{ padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
            <Users2 size={17} color="var(--green)" />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>Affiliate referrals</span>
              <span className="muted" style={{ fontSize: 11.5 }}>Share your referral link and track sign-ups.</span>
            </span>
            <span className="dim" style={{ fontSize: 12 }}>Open →</span>
          </Link>
          <Link href="/portal/coupons" className="card" style={{ padding: '13px 15px', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', color: 'inherit' }}>
            <Ticket size={17} color="var(--gold)" />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>Coupon codes</span>
              <span className="muted" style={{ fontSize: 11.5 }}>Check a code and apply a discount at checkout.</span>
            </span>
            <span className="dim" style={{ fontSize: 12 }}>Open →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, note }) {
  return (
    <div className="card" style={{ padding: '12px 14px', minWidth: 0 }}>
      <div className="eyebrow" style={{ fontSize: '9px', letterSpacing: '.1em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, fontSize: 20, color: 'var(--muted)', lineHeight: 1 }}>{value}</div>
      <div className="dim" style={{ fontSize: 9.5, marginTop: 4 }}>{note}</div>
    </div>
  );
}
