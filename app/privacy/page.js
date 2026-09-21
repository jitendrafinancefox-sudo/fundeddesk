import LegalPage from '@/components/legal/LegalPage';
import PrivacyContent from '@/components/legal/PrivacyContent';

export const metadata = {
  title: 'Privacy Policy (Draft)',
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      slug="privacy"
      title="Privacy Policy"
      intro="What personal data the platform stores today, why, and where it is processed."
      sections={[{ id: 'privacy-body', heading: 'Data we hold', body: <PrivacyContent /> }]}
    />
  );
}
