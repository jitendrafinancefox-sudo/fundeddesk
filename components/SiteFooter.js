'use client';
import { usePathname } from 'next/navigation';

// Site footer, hidden on app routes (mirrors Nav's inAppRoute list) so the
// trading surface renders full-bleed without marketing chrome.
export default function SiteFooter() {
  const pathname = usePathname();
  const inAppRoute = pathname?.startsWith('/portal') || pathname?.startsWith('/admin') || pathname?.startsWith('/india') || pathname?.startsWith('/terminal') || pathname?.startsWith('/web-terminal') || pathname?.startsWith('/tv-chart');
  if (inAppRoute) return null;

  return (
    <footer className="foot">
      <div className="wrap">
        <div className="disc">
          <b>Risk Disclosure:</b> FundedDesk offers skill-based trader evaluations on simulated accounts using
          live market data; orders are not placed on any exchange, and funded-stage capital remains simulated.
          Trading involves risk and is not suitable for everyone. Past performance does not guarantee future
          results. Rewards, payouts, and account access are subject to the Rulebook and program terms.
        </div>
      </div>
    </footer>
  );
}
