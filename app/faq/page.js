import FaqClient from './FaqClient';

export const metadata = {
  title: 'FAQ',
  description: 'Straight answers about FundedDesk evaluations, payouts, breach conditions and funded accounts for Indian options traders — sourced from the same rules used across the platform.',
  alternates: { canonical: 'https://fundeddesk.com/faq' },
  openGraph: {
    type: 'website',
    url: 'https://fundeddesk.com/faq',
    title: 'FAQ | FundedDesk',
    description: 'Straight answers about FundedDesk evaluations, payouts, breach conditions and funded accounts for Indian options traders.',
  },
};

export default function FaqPage() {
  return <FaqClient />;
}
