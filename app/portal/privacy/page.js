'use client';
import { Shield } from 'lucide-react';

export default function Page() {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--line)' }}>
        <h2 style={{ fontSize: 18, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Shield size={20} /> Data & Privacy Policy
        </h2>
      </div>
      <div style={{ padding: '22px', lineHeight: 1.7, fontSize: 14, color: 'var(--text)' }}>
        <p style={{ color: 'var(--dim)', fontSize: 12.5, marginBottom: 18 }}>
          <em>Draft for legal review — not final. We have not engaged a lawyer yet. This document reflects
          what we actually collect and do today, nothing more.</em>
        </p>

        <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 22, marginBottom: 8, color: 'var(--text)' }}>
          What we collect
        </h3>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          <li><b>Account info:</b> your name, email, and phone number (if provided during signup).</li>
          <li><b>KYC documents:</b> if you are approved for a funded account, we store the ID proofs and
            bank details you upload — only the minimum required by our payment partners.</li>
          <li><b>Trading activity:</b> the trades you execute on the challenge accounts, including timestamps,
            instruments, and P&L.</li>
          <li><b>Usage data:</b> basic page views, chart interactions, and error logs. We do not use
            third-party analytics cookies at this time.</li>
        </ul>

        <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 22, marginBottom: 8 }}>
          Why we need it
        </h3>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          <li><b>Account verification:</b> to confirm your identity and prevent fraud.</li>
          <li><b>Payout processing:</b> to send your profit-share to the correct bank account.</li>
          <li><b>Challenge integrity:</b> to verify your evaluation results and detect breaches.</li>
          <li><b>Service improvement:</b> to fix bugs and understand which features you use.</li>
        </ul>

        <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 22, marginBottom: 8 }}>
          How it is stored
        </h3>
        <p style={{ marginBottom: 12 }}>
          All data lives in <b>Supabase</b> (PostgreSQL hosted on AWS in the ap-south-1 region, India).
          Password hashing uses Supabase's built-in auth system (GoTrue). We do not store plain-text
          passwords or API keys in the database.
        </p>
        <p>
          Access is controlled by PostgreSQL Row Level Security policies — you can only read your own
          profile, orders, accounts, and trades. The system administrator role (set manually) can view
          all rows for support purposes.
        </p>

        <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 22, marginBottom: 8 }}>
          Your rights
        </h3>
        <ul style={{ paddingLeft: 20, marginBottom: 16 }}>
          <li><b>Access & export:</b> email <a href="mailto:privacy@fundeddesk.com" style={{ color: 'var(--blue)' }}>privacy@fundeddesk.com</a> with your account email and we will send you a CSV of
            everything we have on record.</li>
          <li><b>Correction:</b> update your name or phone in the profile settings or ask us.</li>
          <li><b>Deletion:</b> request account deletion by email. We will anonymise your trading data
            (strip identifying fields) within 30 days, then purge your profile. Challenge account
            records required for financial audit may be retained in an aggregated, non-identifiable form
            until the audit window closes.</li>
        </ul>

        <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 22, marginBottom: 8 }}>
          Cookies & tracking
        </h3>
        <p>
          We use one cookie — <code>fd-theme</code> — to remember whether you prefer dark or light mode.
          No third-party tracking scripts are loaded. If we add analytics in the future, we will update
          this page first.
        </p>

        <h3 style={{ fontSize: 14, fontWeight: 700, marginTop: 22, marginBottom: 8 }}>
          Referrals
        </h3>
        <p>
          If you sign up using someone's referral link, we store the referrer's code on your profile
          (<code>referred_by</code>) so commissions can be attributed. You can see your own referral link
          in the <a href="/portal/affiliate" style={{ color: 'var(--blue)' }}>Affiliate</a> section.
        </p>

        <div style={{ marginTop: 30, fontSize: 12.5, color: 'var(--dim)' }}>
          <p>Last updated: August 2026</p>
          <p>For questions, email <a href="mailto:privacy@fundeddesk.com" style={{ color: 'var(--blue)' }}>privacy@fundeddesk.com</a>.</p>
        </div>
      </div>
    </div>
  );
}
