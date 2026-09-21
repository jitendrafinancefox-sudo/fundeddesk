/* Shared Privacy body — rendered by /privacy (marketing chrome) and
   /portal/privacy (portal chrome). One source of truth so the two can't
   drift. Content describes ONLY what the platform actually stores today.
   Batch 18. */

const h3 = { fontSize: 14, fontWeight: 700, marginTop: 22, marginBottom: 8, color: 'var(--text)' };
const ul = { paddingLeft: 20, marginBottom: 16 };
const p = { color: 'var(--muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 12 };

export default function PrivacyContent() {
  return (
    <div style={{ fontSize: 14, color: 'var(--text)' }}>
      <p style={{ color: 'var(--dim)', fontSize: 12.5, marginBottom: 18 }}>
        <em>Working draft — assembled from the data the platform currently stores. Not reviewed by legal counsel.
        Retention periods, lawful basis and the full sub-processor list still require confirmation.</em>
      </p>

      <h3 style={h3}>What we store</h3>
      <ul style={ul}>
        <li><b>Authentication:</b> your email address and a password hash, held by Supabase Auth (GoTrue). We never store plaintext passwords.</li>
        <li><b>Profile:</b> your name, and phone number if you add one; your role; a referral code if you signed up through one.</li>
        <li><b>Challenge activity:</b> orders you place (plan, UPI transaction reference you enter, fee, any coupon), the evaluation/funded accounts created for you, and the simulated trades and positions recorded against them.</li>
        <li><b>Payout requests:</b> the amount and status of payout requests you submit.</li>
        <li><b>Support &amp; feedback:</b> the subject, message and replies of any support request or feature suggestion you send, plus the email attached to it.</li>
        <li><b>In-app notifications:</b> system messages generated for you about your orders, accounts and payouts.</li>
        <li><b>Legal acceptances:</b> if you tick an agreement box at checkout, we record which document version you accepted and when.</li>
      </ul>

      <h3 style={h3}>What we do not currently collect</h3>
      <ul style={ul}>
        <li>No KYC identity documents (PAN, Aadhaar, bank proof) — there is no verification system in the platform today.</li>
        <li>No third-party analytics or advertising cookies.</li>
        <li>No payment-card data — the current order flow is a manual UPI transfer with a reference number you type in.</li>
      </ul>

      <h3 style={h3}>Why we hold it</h3>
      <ul style={ul}>
        <li>To operate your account, evaluations and payout requests.</li>
        <li>To verify a manual UPI payment against the reference you provide.</li>
        <li>To respond to your support requests.</li>
        <li>To fix bugs and understand which features are used.</li>
      </ul>

      <h3 style={h3}>Where it lives</h3>
      <p style={p}>
        Application data is stored in <b>Supabase</b> (PostgreSQL). The site is served via <b>Vercel</b>.
        Market data on the terminal and analytics pages comes from a separate market-data relay and public news
        RSS feeds; those requests carry no personal data. Row-Level Security policies restrict each row to its
        owner — you can read only your own profile, orders, accounts, trades, payouts, support requests and
        notifications. An administrator role can read all rows for operational support.
      </p>
      <p style={{ ...p, color: 'var(--gold)', fontSize: 12.5 }}>
        ⚠ The exact list of sub-processors, their locations, data-processing agreements and the lawful basis for
        each processing purpose require confirmation before this document is final.
      </p>

      <h3 style={h3}>Sharing</h3>
      <p style={p}>
        We do not sell personal data. Data is processed by the infrastructure providers above so the service can
        run. Whether any other party ever receives personal data is a business decision that must be documented
        here before launch.
      </p>

      <h3 style={h3}>Retention &amp; deletion</h3>
      <p style={p}>
        There is currently <b>no automated deletion schedule</b>. Deleting your own account from the app is not yet
        available; account-deletion requests are handled manually through Support. Records tied to financial audit
        may need to be retained after a deletion request — the exact retention period requires confirmation.
      </p>
      <p style={{ ...p, color: 'var(--gold)', fontSize: 12.5 }}>
        ⚠ Retention periods are not defined. Do not state a specific number of days until the business sets one.
      </p>

      <h3 style={h3}>Your choices</h3>
      <ul style={ul}>
        <li><b>Access / export:</b> download a JSON copy of your records from Settings → Data &amp; Privacy.</li>
        <li><b>Correction:</b> update your name or phone in Settings, or ask Support.</li>
        <li><b>Deletion:</b> request it through Support; see retention note above.</li>
      </ul>

      <h3 style={h3}>Cookies &amp; local storage</h3>
      <p style={p}>
        The site uses browser local storage for convenience only: your theme choice, your currently-selected
        account, and a temporary record of the plan you are about to buy. Supabase stores your session token in
        local storage so you stay signed in. No advertising or analytics cookies are loaded.
      </p>

      <h3 style={h3}>Contact</h3>
      <p style={p}>
        Questions about this document: <a href="mailto:privacy@fundeddesk.com" style={{ color: 'var(--blue)' }}>privacy@fundeddesk.com</a>.
      </p>
    </div>
  );
}
