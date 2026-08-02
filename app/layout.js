import './globals.css';
import Nav from '@/components/Nav';
import SiteBackground from '@/components/SiteBackground';
import ThemeToggle from '@/components/ThemeToggle';

export const metadata = {
  title: 'FundedDesk — Your Skill. Our Capital.',
  description: 'Skill-based trader evaluation platform. Every rule public.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=Unbounded:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SiteBackground />
        <ThemeToggle />
        <Nav />
        {children}
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
      </body>
    </html>
  );
}
