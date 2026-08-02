const RULES = [
  ['Maximum Daily Loss', '5%', 'HARD', 'Equity must not fall more than 5% below your day-start balance (5:30 AM IST reset). Includes floating P&L.', 'Account closed immediately with a timestamped equity snapshot emailed to you.'],
  ['Maximum Loss', '10%', 'HARD', 'Static drawdown from initial balance. It never trails your profits.', 'Account closed immediately with a full evidence report on your dashboard.'],
  ['Profit Targets', '8% → 5%', 'PASS', 'Phase 1 requires 8%, Phase 2 requires 5%. No time limit — your challenge never expires while you trade.', 'Automatic advance to the next phase. KYC required before the funded stage.'],
  ['Minimum Trading Days', '3 / phase', 'SOFT', 'At least three separate days with one closed trade each; profit or loss does not matter.', 'Not a breach — passing simply waits until the day count is met.'],
  ['Prohibited Practices', 'Zero tolerance', 'HARD', 'Copy trading across accounts, mirror trading, demo-latency exploits and third-party account management are prohibited.', 'All linked accounts closed with an evidence report. Repeat offenders banned.'],
  ['Inactivity', '30 days', 'HARD', 'Accounts with zero trades for 30 consecutive days expire. Reminders sent on day 21 and 28.', 'Account expires without refund. One reactivation available within 7 days on request.'],
  ['Payouts', '70–90%', 'PASS', 'First payout after 5 funded trading days. Split depends on your chosen schedule.', 'Processed within 24 hours to your verified bank account with a public ledger entry.'],
  ['News Events', '±2 min', 'HARD', 'No opening/closing positions within 2 minutes of Tier-1 scheduled events. Calendar published every Sunday.', 'The trade is voided. Three violations breach the account.'],
];

export default function Rules() {
  return (
    <main>
      <section>
        <div className="wrap">
          <div className="sec-head">
            <span className="pill">The Rulebook</span>
            <h2>Every rule. Every breach condition. In writing.</h2>
            <p>If a condition is not listed on this page, it cannot be used against your account.</p>
          </div>
          <div className="grid2">
            {RULES.map(([name, limit, type, desc, breach]) => (
              <div className="card" key={name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <h3 style={{ fontSize: 17 }}>{name}</h3>
                  <span className="num" style={{ fontFamily: 'Manrope', fontWeight: 800, color: type === 'PASS' ? 'var(--green)' : 'var(--blue)', whiteSpace: 'nowrap' }}>{limit}</span>
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--muted)' }}>{desc}</p>
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed var(--line)', fontSize: 13 }}>
                  <b style={{ color: type === 'PASS' || type === 'SOFT' ? 'var(--green)' : 'var(--red)', fontSize: 11, letterSpacing: '.08em' }}>
                    {type === 'PASS' ? 'ON COMPLETION' : type === 'SOFT' ? 'NOT A BREACH' : 'ON BREACH'}
                  </b>{' — '}{breach}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
