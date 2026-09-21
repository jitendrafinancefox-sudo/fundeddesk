/**
 * Legal document registry — Batch 18.
 *
 * These documents are WORKING DRAFTS assembled from the platform's actual
 * behaviour (simulated evaluation accounts, manual UPI order verification,
 * manual payouts, no broker execution, no KYC system, no email provider).
 * They have NOT been reviewed by legal counsel and are not final agreements.
 *
 * `LEGAL_VERSION` is the string recorded in `legal_acceptances` so that,
 * when counsel finalises the wording, users can be asked to re-accept a
 * new version without losing the history of what they previously saw.
 */

export const LEGAL_VERSION = 'draft-2026-09';

// Human "drafted on" label. NOT an effective date — these aren't effective.
export const LEGAL_DRAFTED = 'September 2026';

export const LEGAL_DOCS = [
  { slug: 'terms', href: '/terms', title: 'Terms of Service' },
  { slug: 'privacy', href: '/privacy', title: 'Privacy Policy' },
  { slug: 'disclaimer', href: '/disclaimer', title: 'Disclaimer' },
  { slug: 'risk-disclosure', href: '/risk-disclosure', title: 'Risk Disclosure' },
  { slug: 'refund', href: '/refund', title: 'Refund Policy' },
];

export const DRAFT_NOTICE =
  'This document is a working draft assembled from how the platform currently behaves. ' +
  'It has not been reviewed by legal counsel, is not a binding agreement, and may change ' +
  'materially before launch. Do not rely on it as legal advice.';

// Items that need a human decision before any of this can be finalised.
export const LEGAL_REVIEW_FLAGS = [
  'Operating legal entity name and registered address',
  'Governing law and dispute-resolution jurisdiction',
  'Regulatory classification of the service in India',
  'Whether and how evaluation fees are refundable, and any refund window',
  'Tax treatment of payouts (TDS/GST) and who is responsible',
  'Minimum age / residency / eligibility requirements',
  'Restricted countries or states, if any',
  'Whether KYC (PAN/Aadhaar/bank proof) is required and which provider is used',
  'Data-retention periods and lawful basis for processing',
  'Exact list of sub-processors and what personal data each receives',
  'Limitation-of-liability and indemnity terms',
];
