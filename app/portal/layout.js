'use client';
import './dashboard.css';
import PortalDataProvider from '@/components/portal/PortalDataProvider';
import PortalShell from '@/components/portal/PortalShell';

export default function PortalLayout({ children }) {
  return (
    <PortalDataProvider>
      <PortalShell>{children}</PortalShell>
    </PortalDataProvider>
  );
}
