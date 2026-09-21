export const metadata = {
  title: 'Careers',
  robots: { index: false, follow: true },
};

export default function CareersPage() {
  return (
    <main>
      <section style={{ padding: '48px 0 72px' }}>
        <div className="wrap" style={{ maxWidth: 560 }}>
          <span className="pill">Careers</span>
          <h1 style={{ fontSize: 'clamp(24px,3vw,30px)', margin: '8px 0 14px', fontWeight: 800, letterSpacing: '-0.02em' }}>Careers</h1>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.7 }}>
            There are no roles listed publicly at the moment. If you build trading infrastructure, market-data
            systems or Indian-market fintech and want to talk, email{' '}
            <a href="mailto:careers@fundeddesk.com" style={{ color: 'var(--blue)' }}>careers@fundeddesk.com</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
