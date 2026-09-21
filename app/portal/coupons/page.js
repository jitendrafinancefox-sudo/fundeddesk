'use client';

// Batch 14: the canonical coupon route is /portal/coupon-codes.
// This path is kept alive so old links / bookmarks don't 404.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CouponsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/portal/coupon-codes'); }, [router]);
  return (
    <div className="portal-dashboard" style={{ maxWidth: 640 }}>
      <p className="muted" style={{ fontSize: 13 }}>
        Moved to <Link href="/portal/coupon-codes" style={{ color: 'var(--green)' }}>Coupon Codes</Link>…
      </p>
    </div>
  );
}
