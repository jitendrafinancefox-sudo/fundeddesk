'use client';

/* Right-rail "which account is this" card — the compact identity summary
   the reference always keeps visible next to the chart. Every field is a
   real column on the selected account/plan row; nothing here is fetched
   separately (all already available via usePortalData()/page.js props).

   NOTE: the reference's card also has a "Credentials" button. FundedDesk
   has no broker-credentials feature built yet (checked: no such page/data
   exists anywhere in the app) — inventing that button would point at
   nothing real, so it's left out. "Open Terminal" is the one real,
   existing action for this account. */

import Link from 'next/link';
import { formatINR } from '@/lib/format';

export default function AccountSummaryCard({ account, totalTrades = 0, tradingDays = 0, isLoading = false }) {
  if (isLoading) {
    return (
      <div className="card" style={{ padding: '16px', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--brand)', animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }
  if (!account) return null;

  const capRaw = Number(account.plans?.capital);
  const cap = Number.isFinite(capRaw) && capRaw > 0 ? capRaw : null;
  const planType = account.plans?.plan_type || null;
  const status = account.status || null;
  const statusTag = status === 'active' ? 'tag-green' : status === 'breached' ? 'tag-red' : status ? 'tag-gold' : 'tag-muted';

  return (
    <div className="card" style={{ padding: '16px' }}>
      <div className="eyebrow" style={{ marginBottom: 12, fontSize: 10.5 }}>Accounts</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%', background: 'var(--grad)', display: 'grid', placeItems: 'center',
          fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 15, color: '#040806', flexShrink: 0,
        }}>
          {(account.login_id || 'T')[0].toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {account.login_id || '—'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {planType ? planType.replace('_', ' ') : 'Account'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 3, fontSize: 9.5 }}>Account Size</div>
          <div style={{ fontFamily: "'Unbounded','Manrope',sans-serif", fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>
            {cap != null ? formatINR(cap, { decimals: 0 }) : '—'}
          </div>
        </div>
        <span className={`tag ${statusTag}`} style={{ fontSize: 10 }}>{status ? status.toUpperCase() : 'UNKNOWN'}</span>
      </div>

      <div style={{ display: 'flex', gap: 20, marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 3, fontSize: 9.5 }}>Trades</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{totalTrades}</div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 3, fontSize: 9.5 }}>Days Traded</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{tradingDays}</div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 14 }}>
        Created {account.created_at ? new Date(account.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
      </div>

      <Link href="/portal/terminal" className="btn btn-primary btn-sm" style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
        Open Terminal →
      </Link>
    </div>
  );
}
