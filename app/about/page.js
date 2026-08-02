export default function About() {
  return (
    <main>
      <section>
        <div className="wrap" style={{ maxWidth: 780 }}>
          <div className="sec-head">
            <span className="pill">About Us</span>
            <h2>Built by traders, for traders</h2>
            <p>FundedDesk exists because most evaluation platforms hide their rules until you breach one.</p>
          </div>

          <div className="grid2" style={{ marginBottom: 18 }}>
            <div className="card">
              <h3 style={{ fontSize: 17, marginBottom: 8 }}>Our Mission</h3>
              <p className="muted" style={{ fontSize: 14 }}>
                Give disciplined Indian traders a fair, transparent shot at trading serious size — without
                risking their own capital — on a simulated NIFTY &amp; BANKNIFTY options terminal built with
                real market data.
              </p>
            </div>
            <div className="card">
              <h3 style={{ fontSize: 17, marginBottom: 8 }}>Why We're Different</h3>
              <p className="muted" style={{ fontSize: 14 }}>
                Every breach condition, every payout rule, every fee is published on our Rules page before
                you pay a rupee. No hidden consistency clauses, no surprise disqualifications.
              </p>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 18 }}>
            <h3 style={{ fontSize: 17, marginBottom: 12 }}>How We Think About Risk</h3>
            <p className="muted" style={{ fontSize: 14, marginBottom: 10 }}>
              All evaluation and funded accounts on FundedDesk run on <b style={{ color: 'var(--text)' }}>simulated
              capital</b> using live market data. Orders are not placed on any exchange. This isn't fine print we're
              hiding — it's the foundation the whole program is built on, and it's why we can be this transparent
              about every other rule.
            </p>
            <p className="muted" style={{ fontSize: 14 }}>
              We built our own live Indian options terminal instead of adapting a generic forex platform, because
              NIFTY and BANKNIFTY traders deserve a challenge that actually reflects the instruments they trade.
            </p>
          </div>

          <div className="grid3">
            {[
              ['📜', 'Transparency First', 'If a rule can end your account, it lives on a public page — not in a support ticket.'],
              ['⚡', 'Built for Speed', 'Payout requests, KYC, and account activation are designed to move in hours, not weeks.'],
              ['🗣️', 'Hindi + English', 'Support that speaks the way our traders actually think, not just corporate English.'],
            ].map(([ic, t, d]) => (
              <div className="card" key={t} style={{ textAlign: 'center', padding: 22 }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{ic}</div>
                <h3 style={{ fontSize: 15, marginBottom: 6 }}>{t}</h3>
                <p className="muted" style={{ fontSize: 13 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
