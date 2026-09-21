import LegalPage from '@/components/legal/LegalPage';

export const metadata = {
  title: 'Disclaimer (Draft)',
  robots: { index: false, follow: true },
};

const P = (props) => <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.7, margin: '0 0 10px' }} {...props} />;

const SECTIONS = [
  {
    id: 'what', heading: 'What FundedDesk is',
    body: <>
      <P>FundedDesk runs skill-based trading <b>evaluations on simulated accounts</b>. Both evaluation accounts and funded-stage accounts operate on simulated capital. The terminal shows live and delayed market data for Indian index options; <b>orders placed on it are not sent to any exchange or broker</b> and are settled against a simulated account.</P>
      <P>Payout amounts, when approved, are real money paid as a profit share on that simulated performance, subject to the published rules.</P>
    </>,
  },
  {
    id: 'not', heading: 'What FundedDesk is not',
    body: <P>FundedDesk is not a broker, an exchange, a depository, an investment adviser, a research analyst or a portfolio manager. It makes <b>no claim of registration with SEBI or any other regulator</b>, and <b>no claim of partnership or affiliation with NSE, BSE or any broker</b>. Nothing on the platform is investment advice, a research report or a recommendation to buy or sell any security.</P>,
  },
  {
    id: 'noguarantee', heading: 'No guarantees',
    body: <P>Nothing here guarantees a profit, a payout, account funding, or any particular outcome. Past performance shown anywhere on the site — including any sample or illustrative figures — does not indicate future results. Trading involves substantial risk of loss.</P>,
  },
  {
    id: 'data', heading: 'Market data',
    body: <P>Market data is provided by a third-party relay and by public news feeds. It may be delayed, indicative, incomplete or temporarily unavailable, and it is not exchange-authorised data. Do not rely on it for decisions with real-money consequences elsewhere.</P>,
  },
  {
    id: 'availability', heading: 'Availability',
    body: <P>The platform is provided &quot;as is&quot; and &quot;as available&quot;. It depends on third-party infrastructure and may be interrupted, degraded or discontinued.</P>,
  },
  {
    id: 'status', heading: 'Current status',
    body: <P>FundedDesk is a working build under legal and compliance structuring. The operating entity, jurisdiction and regulatory position will be published before any launch. Until then, treat all policy pages as drafts.</P>,
    flag: 'Operating entity and regulatory classification require business + legal confirmation.',
  },
];

export default function DisclaimerPage() {
  return <LegalPage slug="disclaimer" title="Disclaimer" sections={SECTIONS} />;
}
