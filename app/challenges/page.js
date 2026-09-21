import { Suspense } from 'react';
import ChallengesClient from './ChallengesClient';

export const metadata = {
  title: 'Funding Programs',
  description: 'Choose a FundedDesk funding program and account size for Indian options trading — One-Step, Two-Step and Instant funding, with real account sizes, pricing and configured trading rules.',
  alternates: { canonical: 'https://fundeddesk.com/challenges' },
  openGraph: {
    type: 'website',
    url: 'https://fundeddesk.com/challenges',
    title: 'Funding Programs | FundedDesk',
    description: 'Choose a funding program and account size — One-Step, Two-Step and Instant funding for Indian traders, with real pricing and configured trading rules.',
  },
};

export default function ChallengesPage() {
  return (
    <Suspense fallback={(
      <main>
        <section style={{ padding: '48px 0' }}><div className="wrap"><p className="muted">Loading funding programs&hellip;</p></div></section>
      </main>
    )}>
      <ChallengesClient />
    </Suspense>
  );
}
