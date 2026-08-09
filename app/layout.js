import './globals.css';
import Nav from '@/components/Nav';
import SiteFooter from '@/components/SiteFooter';
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
        <SiteFooter />
      </body>
    </html>
  );
}
