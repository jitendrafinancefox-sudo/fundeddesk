import LegalPage from '@/components/legal/LegalPage';

export const metadata = {
  title: 'Refund Policy (Draft)',
  robots: { index: false, follow: true },
};

const P = (props) => <p style={{ color: 'var(--muted)', fontSize: 13.5, lineHeight: 1.7, margin: '0 0 10px' }} {...props} />;

const SECTIONS = [
  {
    id: 'status', heading: 'Current position',
    body: <>
      <P>There is <b>no published refund window</b> and <b>no automated refund mechanism</b> in the platform. The order flow is a manual UPI transfer verified by an operator; there is no payment gateway to reverse a charge.</P>
      <P>Any refund is therefore handled case by case by the team. This page does not promise a refund, a timeframe, or a &quot;no questions asked&quot; policy — none of those has been set.</P>
    </>,
    flag: 'Whether evaluation fees are refundable, and any window or conditions, is an unresolved business decision.',
  },
  {
    id: 'notrefunded', heading: 'When a fee is not returned',
    body: <P>As the <a href="/rules" style={{ color: 'var(--blue)' }}>Rules</a> and <a href="/faq" style={{ color: 'var(--blue)' }}>FAQ</a> currently state: if an evaluation account breaches a loss limit, the evaluation ends and the fee is not automatically refunded — that is the cost of the evaluation.</P>,
  },
  {
    id: 'howto', heading: 'Requesting a review',
    body: <P>If you believe you were charged in error, charged twice, or your account was never activated after a verified payment, raise an <b>Order / payment</b> request in <a href="/portal/support" style={{ color: 'var(--blue)' }}>Support</a> with your UPI transaction reference. The team will review it manually.</P>,
  },
  {
    id: 'tax', heading: 'Taxes on refunds',
    body: <P>Tax treatment of any refunded amount is not addressed by the platform.</P>,
    flag: 'Tax handling requires professional advice.',
  },
];

export default function RefundPage() {
  return (
    <LegalPage
      slug="refund"
      title="Refund Policy"
      intro="What the platform can and cannot do about refunds today. This is a factual description, not a customer promise."
      sections={SECTIONS}
    />
  );
}
