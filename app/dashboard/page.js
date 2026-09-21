'use client';

/* Batch 19: the trader dashboard is /portal. This legacy standalone
   route pre-dated the portal shell and duplicated account / order /
   payout views (with its own client-side payout insert and a hard-coded
   "processing within 24h" line that no longer matches the manual,
   no-committed-timeframe payout flow). It is not linked anywhere. Kept
   alive as a redirect so old bookmarks don't 404. */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/portal'); }, [router]);
  return (
    <div className="wrap" style={{ padding: '80px 0' }}>
      <p className="muted" style={{ fontSize: 13 }}>
        Moved to your <Link href="/portal" style={{ color: 'var(--green)' }}>portal dashboard</Link>…
      </p>
    </div>
  );
}
