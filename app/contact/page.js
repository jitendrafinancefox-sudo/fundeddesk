import Link from 'next/link';

export const metadata = {
  title: 'Contact',
  robots: { index: false, follow: true },
};

export default function ContactPage() {
  return (
    <main>
      <section style={{ padding: '48px 0 72px' }}>
        <div className="wrap" style={{ maxWidth: 620 }}>
          <span className="pill">Contact</span>
          <h1 style={{ fontSize: 'clamp(24px,3vw,30px)', margin: '8px 0 14px', fontWeight: 800, letterSpacing: '-0.02em' }}>Get in touch</h1>
          <p className="muted" style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 22 }}>
            The fastest route is a support request from inside the portal — it&apos;s tracked against your account and
            answered in a thread.
          </p>

          <div className="card" style={{ padding: 20, marginBottom: 14 }}>
            <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>Account holders</h2>
            <p className="muted" style={{ fontSize: 13, margin: '0 0 12px', lineHeight: 1.6 }}>
              Open a request in <Link href="/portal/support" style={{ color: 'var(--blue)' }}>Support</Link> (billing, account, payout, technical or general). Feature ideas go to <Link href="/portal/suggest-feature" style={{ color: 'var(--blue)' }}>Suggest a Feature</Link>.
            </p>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 15, margin: '0 0 8px' }}>Email</h2>
            <ul className="muted" style={{ fontSize: 13, lineHeight: 1.9, margin: 0, paddingLeft: 18 }}>
              <li>General: <a href="mailto:support@fundeddesk.com" style={{ color: 'var(--blue)' }}>support@fundeddesk.com</a></li>
              <li>Privacy / data requests: <a href="mailto:privacy@fundeddesk.com" style={{ color: 'var(--blue)' }}>privacy@fundeddesk.com</a></li>
            </ul>
            <p className="dim" style={{ fontSize: 11.5, marginTop: 12, marginBottom: 0, lineHeight: 1.5 }}>
              There is no phone line or live chat. A registered postal address will be published once the operating
              entity is confirmed.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
