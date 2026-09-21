import Link from 'next/link';
import { LEGAL_DOCS, LEGAL_DRAFTED, DRAFT_NOTICE } from '@/lib/legal';

/* Shared shell for the draft legal pages. Semantic headings, a table of
   contents, a persistent DRAFT banner, and links to the sibling documents.
   Server component — pure content. Batch 18. */

export default function LegalPage({ slug, title, intro, sections = [] }) {
  return (
    <main>
      <section style={{ padding: '40px 0 72px' }}>
        <div className="wrap" style={{ maxWidth: 820 }}>
          <div style={{ marginBottom: 18 }}>
            <span className="pill">Legal · Draft</span>
            <h1 style={{ fontSize: 'clamp(24px,3vw,32px)', margin: '8px 0 4px', fontWeight: 800, letterSpacing: '-0.02em' }}>{title}</h1>
            <p className="muted" style={{ fontSize: 12.5, margin: 0 }}>Drafted {LEGAL_DRAFTED} · not an effective legal agreement</p>
          </div>

          <div className="card" role="note" style={{ padding: '14px 16px', marginBottom: 22, border: '1px solid rgba(245,185,62,.35)', background: 'rgba(245,185,62,.06)' }}>
            <b style={{ fontSize: 12.5 }}>Working draft — requires legal counsel review.</b>
            <p className="muted" style={{ fontSize: 12, margin: '4px 0 0', lineHeight: 1.55 }}>{DRAFT_NOTICE}</p>
          </div>

          {intro && <p className="muted" style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 22 }}>{intro}</p>}

          {sections.length > 1 && (
            <nav aria-label="Contents" className="card" style={{ padding: '14px 16px', marginBottom: 24 }}>
              <div className="label" style={{ marginBottom: 8 }}>On this page</div>
              <ol className="legal-toc-list" style={{ margin: 0, paddingLeft: 18, columns: sections.length > 6 ? 2 : 1, columnGap: 24 }}>
                {sections.map((s, i) => (
                  <li key={s.id} style={{ fontSize: 13, marginBottom: 4, breakInside: 'avoid' }}>
                    <a href={`#${s.id}`} style={{ color: 'var(--blue)' }}>{i + 1}. {s.heading}</a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {sections.map((s, i) => (
            <section key={s.id} id={s.id} style={{ marginBottom: 26, scrollMarginTop: 90 }}>
              <h2 style={{ fontSize: 18, margin: '0 0 10px' }}>{i + 1}. {s.heading}</h2>
              {s.body}
              {s.flag && (
                <p style={{ fontSize: 12, color: 'var(--gold)', marginTop: 8, lineHeight: 1.5 }}>
                  ⚠ {s.flag}
                </p>
              )}
            </section>
          ))}

          <div style={{ borderTop: '1px solid var(--line)', paddingTop: 18, marginTop: 8 }}>
            <div className="label" style={{ marginBottom: 8 }}>Related documents</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {LEGAL_DOCS.filter((d) => d.slug !== slug).map((d) => (
                <Link key={d.slug} href={d.href} style={{ fontSize: 13, color: 'var(--blue)' }}>{d.title}</Link>
              ))}
              <Link href="/contact" style={{ fontSize: 13, color: 'var(--blue)' }}>Contact</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
