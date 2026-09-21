import { Suspense } from 'react';
import RulesPageClient from './RulesPageClient';

export const metadata = {
  title: 'Trading Rules & Risk Documentation',
  description:
    'The complete rulebook for FundedDesk funded trading accounts: profit targets, daily and maximum drawdown, trading restrictions, payout policy and refund terms for One-Step, Two-Step and Instant programs.',
  keywords: [
    'funded trading rules India',
    'funded account rules',
    'trading risk rules',
    'payout rules',
    'drawdown rules',
    'trading restrictions',
  ],
  alternates: { canonical: 'https://fundeddesk.com/rules' },
  openGraph: {
    type: 'website',
    url: 'https://fundeddesk.com/rules',
    title: 'Trading Rules & Risk Documentation | FundedDesk',
    description: 'Profit targets, drawdown limits, trading restrictions and payout policy for every FundedDesk program, sourced from the live rule configuration.',
  },
};

export default function RulesPage() {
  return (
    <Suspense fallback={(
      <main>
        <section style={{ padding: '48px 0' }}><div className="wrap"><p className="muted">Loading the knowledge base&hellip;</p></div></section>
      </main>
    )}>
      <RulesPageClient />
    </Suspense>
  );
}
