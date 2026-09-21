import './globals.css';
import { Inter, Manrope, Unbounded } from 'next/font/google';
import Nav from '@/components/Nav';
import SiteFooter from '@/components/SiteFooter';
import SiteBackground from '@/components/SiteBackground';
import ThemeToggle from '@/components/ThemeToggle';

// Font optimization with next/font
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weights: ['400', '500', '600', '700'],
});

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
  weights: ['500', '600', '700', '800'],
});

const unbounded = Unbounded({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-unbounded',
  weights: ['500', '600', '700'],
});

const metadata = {
  title: {
    default: 'FundedDesk — Indian Funded Trading Firm for Options Traders',
    template: '%s | FundedDesk',
  },
  description: 'India\'s premier funded trading firm for NIFTY & BANKNIFTY options traders. Transparent rules, fast payouts, unlimited time to pass. Start your funded trading journey today.',
  keywords: [
    'funded trading firm India',
    'Indian prop firm',
    'funded trading firm India',
    'Indian options trading',
    'NIFTY options funded account',
    'BANKNIFTY funded trader',
    'funded trader program India',
    'prop trading firm India',
    'funded options trader',
    'trading challenge India',
  ],
  authors: [{ name: 'FundedDesk' }],
  creator: 'FundedDesk',
  publisher: 'FundedDesk',
  formatDetection: { telephone: false },
  metadataBase: new URL('https://fundeddesk.com'),
  alternates: {
    canonical: 'https://fundeddesk.com',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://fundeddesk.com',
    siteName: 'FundedDesk',
    title: 'FundedDesk — Indian Funded Trading Firm for Options Traders',
    description: 'India\'s premier funded trading firm for NIFTY & BANKNIFTY options traders. Transparent rules, fast payouts, unlimited time to pass.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'FundedDesk - Indian Funded Trading Firm for Options Traders',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FundedDesk — Indian Funded Trading Firm for Options Traders',
    description: 'India\'s premier funded trading firm for NIFTY & BANKNIFTY options traders. Transparent rules, fast payouts, unlimited time to pass.',
    images: ['/og-image.jpg'],
    creator: '@fundeddesk',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
  },
};

export const generateStaticParams = () => [
  { locale: 'en' },
];

export default function RootLayout({ children }) {
  const htmlLang = 'en';
  const htmlClass = `${inter.variable} ${manrope.variable} ${unbounded.variable}`;

  return (
    <html lang="en" className={htmlClass} data-scroll-behavior="smooth">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=Unbounded:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'FundedDesk',
              url: 'https://fundeddesk.com',
              name: 'FundedDesk',
              description: "India's premier funded trading firm for NIFTY & BANKNIFTY options traders. Transparent rules, fast payouts, unlimited time to pass.",
              publisher: {
                '@type': 'Organization',
                name: 'FundedDesk',
                logo: 'https://fundeddesk.com/logo.png',
              },
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: 'https://fundeddesk.com/search?q={search_term_string}',
                },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Organization',
              name: 'FundedDesk',
              url: 'https://fundeddesk.com',
              logo: 'https://fundeddesk.com/logo.png',
              sameAs: [
                'https://twitter.com/fundeddesk',
                'https://linkedin.com/company/fundeddesk',
                'https://discord.gg/fundeddesk',
              ],
              contactPoint: {
                '@type': 'ContactPoint',
                telephone: '+91-XXXXXXXXXX',
                contactType: 'customer service',
                availableLanguage: ['English', 'Hindi'],
              },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: [
                {
                  '@type': 'Question',
                  name: 'What is a funded trading firm?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'A funded trading firm provides traders with simulated capital to trade after passing an evaluation. Traders keep a percentage of profits while the firm absorbs losses.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'Which markets can I trade at FundedDesk?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'FundedDesk specializes in NIFTY 50 and BANKNIFTY options trading on the Indian market.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How does the challenge work?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Choose your account size and step type (1-step or 2-step). Hit the profit target while respecting risk limits. Unlimited time to pass.',
                  },
                },
                {
                  '@type': 'Question',
                  name: 'How are payouts processed?',
                  acceptedAnswer: {
                    '@type': 'Answer',
                    text: 'Payouts are processed within 24 hours after requesting. You can request payouts after 5 trading days on your funded account.',
                  },
                },
              ],
            }),
          }}
        />
      </head>
      <body className={`${inter.variable} ${manrope.variable} ${unbounded.variable}`}>
        <SiteBackground />
        <ThemeToggle />
        <Nav />
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}