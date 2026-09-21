'use client';

/* ============================================================
   /faq — public knowledge-base FAQ

   The six questions and answers below are the exact, unmodified
   content that previously lived in a bare <details>/<summary> list on
   this route — nothing has been invented or reworded. This file only
   adds presentation: a hero, client-side search/category filtering
   over that same fixed list, and a real accordion — matching the
   /rules knowledge-base pattern already established on this site.

   "Category" is a presentational grouping over the existing six
   questions, reusing the exact four topic labels already published
   elsewhere on the site (see the FAQ teaser chips on /how-it-works:
   Programs, Trading, Rules, Payouts) plus "Company" for the one
   question that doesn't fit those four (regulation / who runs it).
   No new claims, figures or promises were added anywhere.
   ============================================================ */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, X, Plus } from 'lucide-react';
import styles from './faq.module.css';

const FAQS = [
  {
    q: 'Is the money in my account real?',
    a: 'No — evaluation and funded accounts both run on simulated capital with live market data. Payouts are real money; the trading capital is simulated. We say this on every page, because trust starts with saying it plainly.',
    category: 'Trading',
  },
  {
    q: 'What can breach my account?',
    a: 'Only the conditions listed on the Rules page. Every breach generates a timestamped equity snapshot you can independently verify. There are no unpublished rules.',
    category: 'Rules',
    related: { href: '/rules?category=restrictions', label: 'See Restrictions in the Rulebook' },
  },
  {
    q: 'How fast are payouts?',
    a: 'After your first 5 funded trading days, request anytime under your chosen schedule. Processing completes within 24 hours to your verified bank account.',
    category: 'Payouts',
    related: { href: '/rules?category=payout', label: 'See Payout Rules' },
  },
  {
    q: 'What happens if I fail?',
    a: "Breach a loss limit and the challenge ends without a fee refund — that's the cost of evaluation. Finish in profit but under target with zero breaches, and your retry is free.",
    category: 'Programs',
    related: { href: '/how-it-works', label: 'See how the process works' },
  },
  {
    q: 'Which markets can I trade?',
    a: 'The instrument list will be finalised and published along with our legal structure before launch — visible on this page and inside the platform before any payment is possible.',
    category: 'Trading',
  },
  {
    q: 'Is FundedDesk regulated? Who runs it?',
    a: 'FundedDesk is currently a working prototype under legal and compliance structuring. No accounts are being sold and no payments are collected. The operating entity, jurisdiction and regulatory framework will be published here before launch — not after.',
    category: 'Company',
  },
];

const CATEGORIES = ['All', 'Programs', 'Trading', 'Rules', 'Payouts', 'Company'];

function FaqItem({ item, open, onToggle }) {
  const id = item.q.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return (
    <div className={`${styles.item} ${open ? styles.itemOpen : ''}`}>
      <button
        type="button"
        className={styles.itemHeader}
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        id={`${id}-header`}
        onClick={onToggle}
      >
        <span className={styles.itemHeaderLeft}>
          <span className={`${styles.itemIcon} ${open ? styles.itemIconOpen : ''}`} aria-hidden="true">
            <Plus size={14} strokeWidth={2.4} />
          </span>
          <span className={styles.itemQuestion}>{item.q}</span>
        </span>
        <span className={styles.itemCategoryTag}>{item.category}</span>
      </button>
      <div
        className={`${styles.itemPanel} ${open ? styles.itemPanelOpen : ''}`}
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-header`}
        style={open ? { maxHeight: 420 } : undefined}
      >
        <p className={styles.itemAnswer}>{item.a}</p>
        {item.related && (
          <Link href={item.related.href} className={styles.itemRelated}>
            {item.related.label} <span aria-hidden="true">&rarr;</span>
          </Link>
        )}
      </div>
    </div>
  );
}

export default function FaqClient() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [openId, setOpenId] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQS.filter((item) => {
      const matchesCategory = category === 'All' || item.category === category;
      const matchesQuery = !q || `${item.q} ${item.a}`.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, category]);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroVignette} aria-hidden="true" />
        <div className="wrap">
          <div className={styles.heroInner}>
            <div className={styles.eyebrow}>Support</div>
            <h1 className={styles.heroTitle}>Frequently Asked Questions</h1>
            <p className={styles.heroSub}>
              Straight answers about evaluations, payouts, and how funded accounts actually work — sourced from the
              same rules and process every other page on this site is.
            </p>
          </div>
          <div className={styles.searchWrap}>
            <div className={styles.searchBox}>
              <span className={styles.searchIconWrap} aria-hidden="true"><Search size={20} strokeWidth={2.2} /></span>
              <label htmlFor="faq-search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
                Search FAQ
              </label>
              <input
                id="faq-search"
                type="text"
                className={styles.searchInput}
                placeholder="Search questions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
              {query && (
                <button type="button" className={styles.searchClear} onClick={() => setQuery('')} aria-label="Clear search">
                  <X size={15} strokeWidth={2.4} /> Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.workspace}>
        <div className="wrap">
          <div className={styles.categoryRow} role="group" aria-label="Filter by topic">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                className={`${styles.categoryBtn} ${category === c ? styles.categoryBtnActive : ''}`}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <h2 className={styles.emptyTitle}>No questions found</h2>
              <p className={styles.emptySub}>Try a different search term, or a different topic filter.</p>
            </div>
          ) : (
            <div className={styles.list}>
              {filtered.map((item) => (
                <FaqItem
                  key={item.q}
                  item={item}
                  open={openId === item.q}
                  onToggle={() => setOpenId((o) => (o === item.q ? null : item.q))}
                />
              ))}
            </div>
          )}

          <div className={styles.supportCta}>
            <h2 className={styles.supportTitle}>Still have questions?</h2>
            <p className={styles.supportSub}>Read the full trading rules for your program, or see how the whole process works end to end.</p>
            <div className={styles.supportBtns}>
              <Link href="/rules" className="btn btn-primary btn-sm">Read the Rules</Link>
              <Link href="/how-it-works" className="btn btn-secondary btn-sm">How It Works</Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
