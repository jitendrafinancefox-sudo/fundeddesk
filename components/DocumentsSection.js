'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';

// Only documents that ACTUALLY exist and resolve are listed here. The five
// legal documents below are the working drafts published in-app (Batch 18);
// each links to its real route. No fabricated corporate / tax / audit /
// insurance / KYC certificates, and no "VERIFIED" / government-issuer badges —
// there is no operating-entity registration or verification to attest to yet
// (Batch 23). Corporate and regulatory documents appear here only once real.
const DOCUMENTS = [
  { id: 'terms',           title: 'Terms of Service',  issuer: 'FundedDesk', status: 'DRAFT', type: 'legal',  href: '/terms',           available: true },
  { id: 'privacy',         title: 'Privacy Policy',    issuer: 'FundedDesk', status: 'DRAFT', type: 'legal',  href: '/privacy',         available: true },
  { id: 'risk-disclosure', title: 'Risk Disclosure',   issuer: 'FundedDesk', status: 'DRAFT', type: 'policy', href: '/risk-disclosure', available: true },
  { id: 'disclaimer',      title: 'Disclaimer',        issuer: 'FundedDesk', status: 'DRAFT', type: 'legal',  href: '/disclaimer',      available: true },
  { id: 'refund',          title: 'Refund Policy',     issuer: 'FundedDesk', status: 'DRAFT', type: 'policy', href: '/refund',          available: true },
];

const getStatusConfig = (status) => {
  switch (status) {
    case 'CURRENT':
    case 'ACTIVE':
      return {
        bg: 'rgba(34,197,139,0.12)',
        color: 'var(--brand)',
        border: '1px solid rgba(34,197,139,0.2)',
        icon: '✓',
      };
    case 'DRAFT':
    case 'PENDING':
      return {
        bg: 'rgba(245,185,62,0.12)',
        color: 'var(--gold)',
        border: '1px solid rgba(245,185,62,0.2)',
        icon: '○',
      };
    default:
      return { 
        bg: 'rgba(255,255,255,0.04)', 
        color: 'var(--muted)', 
        border: '1px solid var(--border)',
        icon: '○',
      };
  }
};

const getTypeIcon = (type) => {
  switch (type) {
    case 'corporate': return '🏢';
    case 'tax': return '📋';
    case 'policy': return '🛡️';
    case 'legal': return '📜';
    case 'audit': return '🔍';
    case 'insurance': return '🛡️';
    default: return '📄';
  }
};

export default function DocumentsSection() {
  return (
    <div className="grid3" style={{ gap: '20px' }}>
      {DOCUMENTS.map((doc, i) => {
        const statusConfig = getStatusConfig(doc.status);
        const typeIcon = getTypeIcon(doc.type);
        
        return (
          <motion.div
            key={doc.id}
            className="card"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -10% 0px" }}
            transition={{ duration: 0.5, delay: 0.1 + i * 0.06, ease: [0.19, 1, 0.22, 1] }}
            style={{ 
              position: 'relative', 
              overflow: 'hidden',
              border: `1px solid ${statusConfig.border}`,
              background: statusConfig.bg,
              transition: 'transform var(--normal) var(--ease), border-color var(--normal) var(--ease), box-shadow var(--normal) var(--ease)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.borderColor = 'var(--brand)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md), var(--shadow-glow)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = statusConfig.border;
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{ 
              position: 'absolute', 
              top: 0, left: 0, right: 0, height: '3px', 
              background: 'var(--grad)', 
              opacity: 0.8 
            }} />
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '16px',
              padding: '20px 20px 16px',
            }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                background: 'var(--bg-elevated)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontSize: '20px',
                flexShrink: 0,
              }}>
                {typeIcon}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{doc.title}</h3>
                  <span style={{
                    ...statusConfig,
                    padding: '3px 10px',
                    borderRadius: '99px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '.06em',
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    {statusConfig.icon} {doc.status}
                  </span>
                </div>
                <p className="body-sm" style={{ color: 'var(--muted)', margin: 0, marginBottom: '12px' }}>
                  Issued by {doc.issuer} · {new Date(doc.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                
                {doc.available && (
                  <Link
                    href={doc.href}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '8px 16px', fontSize: '12px' }}
                  >
                    Read document →
                  </Link>
                )}
                {!doc.available && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--r-sm)',
                    fontSize: '12px',
                    color: 'var(--muted)',
                    cursor: 'not-allowed',
                  }}>
                    <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: 'var(--border)' }} />
                    Document not yet available
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}