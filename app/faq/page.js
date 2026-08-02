const FAQS = [
  ['Is the money in my account real?', 'No — evaluation and funded accounts both run on simulated capital with live market data. Payouts are real money; the trading capital is simulated. We say this on every page, because trust starts with saying it plainly.'],
  ['What can breach my account?', 'Only the conditions listed on the Rules page. Every breach generates a timestamped equity snapshot you can independently verify. There are no unpublished rules.'],
  ['How fast are payouts?', 'After your first 5 funded trading days, request anytime under your chosen schedule. Processing completes within 24 hours to your verified bank account.'],
  ['What happens if I fail?', "Breach a loss limit and the challenge ends without a fee refund — that's the cost of evaluation. Finish in profit but under target with zero breaches, and your retry is free."],
  ['Which markets can I trade?', 'The instrument list will be finalised and published along with our legal structure before launch — visible on this page and inside the platform before any payment is possible.'],
  ['Is FundedDesk regulated? Who runs it?', 'FundedDesk is currently a working prototype under legal and compliance structuring. No accounts are being sold and no payments are collected. The operating entity, jurisdiction and regulatory framework will be published here before launch — not after.'],
];

export default function Faq() {
  return (
    <main>
      <section>
        <div className="wrap" style={{ maxWidth: 820 }}>
          <div className="sec-head">
            <span className="pill">FAQ</span>
            <h2>Straight answers</h2>
          </div>
          {FAQS.map(([q, a]) => (
            <details className="card" key={q} style={{ marginBottom: 12, padding: 0, overflow: 'hidden' }}>
              <summary style={{ cursor: 'pointer', padding: '19px 24px', fontFamily: 'Manrope', fontWeight: 700, fontSize: 16, listStyle: 'none' }}>{q}</summary>
              <p style={{ padding: '0 24px 19px', color: 'var(--muted)', fontSize: 14.5 }}>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
