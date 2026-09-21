'use client';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import PrivacyContent from '@/components/legal/PrivacyContent';

/* Portal-chrome view of the shared Privacy body. The public marketing
   version lives at /privacy — both render <PrivacyContent> so they can't
   drift. Batch 18. */

export default function Page() {
  return (
    <div className="portal-dashboard" style={{ maxWidth: 760 }}>
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <h1 style={{ fontSize: 18, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={19} /> Data &amp; Privacy
          </h1>
          <Link href="/privacy" style={{ fontSize: 12, color: 'var(--green)' }}>Public version →</Link>
        </div>
        <div style={{ padding: 20 }}>
          <PrivacyContent />
        </div>
      </div>
    </div>
  );
}
