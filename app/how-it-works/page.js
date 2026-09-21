import HowItWorksClient from './HowItWorksClient';

export const metadata = {
  title: 'How It Works',
  description: 'Learn how FundedDesk programs work, from choosing a challenge and understanding the rules to trading and progressing through supported account stages.',
  alternates: { canonical: 'https://fundeddesk.com/how-it-works' },
  openGraph: {
    type: 'website',
    url: 'https://fundeddesk.com/how-it-works',
    title: 'How It Works | FundedDesk',
    description: 'Learn how FundedDesk programs work, from choosing a challenge and understanding the rules to trading and progressing through supported account stages.',
  },
};

export default function HowItWorksPage() {
  return <HowItWorksClient />;
}
