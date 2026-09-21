import LegalPage from '@/components/legal/LegalPage';

export const metadata = {
  title: 'Risk Disclosure (Draft)',
  robots: { index: false, follow: true },
};

const P = (props) => <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.7, margin: '0 0 10px' }} {...props} />;

const SECTIONS = [
  {
    id: 'summary', heading: 'In short',
    body: <P>An evaluation is a paid skill test on a <b>simulated</b> options account. You can lose the fee you pay. You will not lose money on the simulated trades themselves, but a breach ends the evaluation and the fee is not automatically refunded.</P>,
  },
  {
    id: 'options', heading: 'Derivatives / options risk',
    body: <P>The platform is built around Indian index options (NIFTY, BANKNIFTY, FINNIFTY, SENSEX). Options can lose value quickly and expire worthless. Even on a simulated account, adverse moves, gaps and volatility spikes can breach a drawdown limit in a single session and close the account.</P>,
  },
  {
    id: 'rules', heading: 'Rule-breach risk',
    body: <P>Your account is closed when a hard limit (daily or maximum drawdown) is hit, and can be closed after the published number of soft breaches (position stacking, missing stop-loss, minimum trade duration, restricted-window trading). The exact limits are on the <a href="/rules" style={{ color: 'var(--blue)' }}>Rules</a> page for your plan and phase — read them before you trade.</P>,
  },
  {
    id: 'data', heading: 'Market-data, slippage &amp; technical risk',
    body: <P>Prices come from a third-party relay and can be delayed, wrong or unavailable. Fills, spreads and depth on the terminal are modelled, not exchange fills. The platform can be slow or down. A data or platform issue can affect an evaluation result; report problems through Support rather than trading around them.</P>,
  },
  {
    id: 'provider', heading: 'Provider dependency',
    body: <P>The service depends on Supabase, Vercel and the market-data relay. If any of these is unavailable, the platform may be partly or fully unusable.</P>,
  },
  {
    id: 'payout', heading: 'Payout &amp; eligibility risk',
    body: <P>Reaching the funded stage does not guarantee a payout. Payouts require an active funded account in profit, are subject to the published split and any minimum, and are reviewed and paid manually with no committed timeframe. Eligibility rules can be enforced.</P>,
  },
  {
    id: 'termination', heading: 'Account termination',
    body: <P>An account can be closed for a rule breach or for prohibited conduct. Fees paid for a closed evaluation are not automatically returned.</P>,
  },
  {
    id: 'nogurantee', heading: 'No guarantee, no advice',
    body: <P>Nothing here is investment advice. There is no guarantee of profit, funding or payout. Only pay an evaluation fee you can afford to lose.</P>,
  },
];

export default function RiskDisclosurePage() {
  return (
    <LegalPage
      slug="risk-disclosure"
      title="Risk Disclosure"
      intro="The specific risks of using this platform, drawn from how the evaluation, terminal and payout systems actually work."
      sections={SECTIONS}
    />
  );
}
