import LegalPage from '@/components/legal/LegalPage';

export const metadata = {
  title: 'Terms of Service (Draft)',
  robots: { index: false, follow: true },
};

const P = (props) => <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.7, margin: '0 0 10px' }} {...props} />;
const UL = ({ items }) => (
  <ul style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.7, paddingLeft: 20, margin: '0 0 10px' }}>
    {items.map((t, i) => <li key={i}>{t}</li>)}
  </ul>
);

const SECTIONS = [
  {
    id: 'about', heading: 'About this document',
    body: <P>These terms describe how the FundedDesk evaluation and simulated-funded-account service currently works. They are a draft and are not a binding agreement. The operating legal entity, its registered address and the governing law are not yet established.</P>,
    flag: 'Operating entity, registered address and governing law require business + legal confirmation.',
  },
  {
    id: 'nature', heading: 'Nature of the service',
    body: <>
      <P>FundedDesk is a technology platform that runs skill-based trading evaluations on <b>simulated accounts</b> using live and delayed market data. Evaluation accounts and funded-stage accounts both operate on simulated capital. Orders you place on the terminal are <b>not routed to any exchange or broker</b>.</P>
      <P>FundedDesk is not a broker, an exchange, a clearing member, an investment adviser or a portfolio manager, and makes no claim of registration with any securities regulator or affiliation with any exchange.</P>
    </>,
  },
  {
    id: 'eligibility', heading: 'Eligibility',
    body: <P>You must be able to form a binding contract to use the service. Minimum age, residency and any restricted jurisdictions are not defined in the current product.</P>,
    flag: 'Age, residency and restricted-jurisdiction requirements require business + legal decision.',
  },
  {
    id: 'registration', heading: 'Account registration',
    body: <P>You register with an email and password through Supabase Auth. You are responsible for keeping your credentials secure. Email verification and password changes are handled through the platform&apos;s authentication provider. One person should hold one account.</P>,
  },
  {
    id: 'purchase', heading: 'Challenge purchase &amp; fees',
    body: <>
      <P>An evaluation is bought by placing an order for a listed plan. The current flow is a <b>manual UPI transfer</b>: you transfer the fee shown at checkout and submit the bank transaction reference (UTR). The order is created with status <i>pending</i> and an operator verifies the transfer before your account is activated. No card is charged and no payment gateway is integrated.</P>
      <P>The fee payable is the plan fee less any valid coupon discount. The final amount is computed by the server from the plan price when the order is created — the figure shown in the browser is a preview.</P>
    </>,
  },
  {
    id: 'rules', heading: 'Trading rules &amp; account restrictions',
    body: <P>Every evaluation and funded account is graded against the conditions published on the <a href="/rules" style={{ color: 'var(--blue)' }}>Rules</a> page for the relevant plan track and phase. Those conditions — profit target, drawdown limits, minimum profitable days, inactivity, position and stop-loss rules — are the authoritative terms of the evaluation. An account that breaches a hard limit is closed. Soft breaches accumulate toward closure per the published limits.</P>,
  },
  {
    id: 'payouts', heading: 'Payouts',
    body: <>
      <P>Payout requests can be made from a funded, active account that is in profit, subject to the split and any minimum/cap published in the Rules resolver for that plan. Requests are reviewed and paid <b>manually</b> — there is no automated payout system and no committed processing time.</P>
      <P>Payouts are the trader&apos;s profit share on a simulated account. Tax treatment (including any TDS or GST) is not addressed by the platform.</P>
    </>,
    flag: 'Payout legal characterisation and tax treatment require legal + tax advice.',
  },
  {
    id: 'refunds', heading: 'Refunds',
    body: <P>See the <a href="/refund" style={{ color: 'var(--blue)' }}>Refund Policy</a>. In short: there is no published refund window and no automated refund mechanism; any refund is handled case by case by the team.</P>,
    flag: 'Refund entitlement and any window require a business decision.',
  },
  {
    id: 'prohibited', heading: 'Prohibited conduct',
    body: <UL items={[
      'Sharing, selling or transferring an account.',
      'Automated abuse, scraping or attempts to overload the platform.',
      'Exploiting bugs, latency or pricing errors instead of reporting them.',
      'Submitting fraudulent payment references.',
      'Attempting to access another user’s data or any administrative function.',
    ]} />,
  },
  {
    id: 'availability', heading: 'Platform availability, market data &amp; third parties',
    body: <>
      <P>The service is provided on an &quot;as available&quot; basis. Market data is sourced from a separate relay and from public news feeds and can be delayed, incomplete or temporarily unavailable; it is not exchange-authorised data. The platform depends on third-party infrastructure (Supabase, Vercel, the market-data relay) and may be interrupted.</P>
      <P>Nothing on the platform is investment advice or a recommendation to trade.</P>
    </>,
  },
  {
    id: 'ip', heading: 'Intellectual property',
    body: <P>The FundedDesk name, interface and content are the platform&apos;s. Index names (NIFTY, BANKNIFTY, FINNIFTY, SENSEX) and any third-party marks belong to their owners; their use here is descriptive and does not imply endorsement or partnership.</P>,
  },
  {
    id: 'suspension', heading: 'Suspension &amp; termination',
    body: <P>An account may be closed for a rule breach, for prohibited conduct, or where required for the platform&apos;s operation. Where the schema supports it, administrative actions are logged.</P>,
  },
  {
    id: 'liability', heading: 'Limitation of liability',
    body: <P>Placeholder. Meaningful liability, indemnity and warranty-disclaimer wording must be drafted by legal counsel and is not stated here.</P>,
    flag: 'Limitation-of-liability and indemnity terms require legal counsel.',
  },
  {
    id: 'disputes', heading: 'Dispute resolution &amp; governing law',
    body: <P>Not established. The applicable law and the forum for disputes are pending the choice of operating entity and jurisdiction.</P>,
    flag: 'Governing law and dispute forum require legal counsel.',
  },
  {
    id: 'changes', heading: 'Changes to these terms',
    body: <P>These terms will change as the product and its legal structure are finalised. When a final version is published, users may be asked to accept it; the version you previously accepted is retained in your legal-acceptance history.</P>,
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      slug="terms"
      title="Terms of Service"
      intro="A plain-language description of how the service works today, pending a lawyer-drafted agreement."
      sections={SECTIONS}
    />
  );
}
