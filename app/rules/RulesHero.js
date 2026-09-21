'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import styles from './rules.module.css';

// Only terms that actually correspond to configured categories/rules — never invented.
const SEARCH_SUGGESTIONS = ['drawdown', 'payout', 'trading conditions'];

/**
 * Cinematic knowledge-base hero + live search over the rendered rule
 * content. Search is pure client-side string matching against the index
 * RulesPageClient builds from the sections it is already rendering — no
 * separate search backend, no fabricated results.
 */
export default function RulesHero({ searchIndex, onSelect }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [kbdLabel, setKbdLabel] = useState('Ctrl K');
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const q = query.trim().toLowerCase();
  const results = q
    ? searchIndex
        .filter((item) => item.haystack.includes(q))
        .slice(0, 8)
    : [];

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Real Cmd/Ctrl+K shortcut — the hint pill only advertises behavior that actually works.
  useEffect(() => {
    if (/Mac|iPod|iPhone|iPad/.test(navigator.platform || '')) setKbdLabel('⌘K');
    function onKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  function pick(item) {
    setOpen(false);
    setQuery('');
    onSelect(item);
  }

  function onInputKeyDown(e) {
    if (e.key === 'Escape') {
      if (query) { setQuery(''); } else { setOpen(false); inputRef.current?.blur(); }
    }
  }

  return (
    <section className={styles.hero}>
      <div className={styles.heroGlow} aria-hidden="true" />
      <div className={styles.heroVignette} aria-hidden="true" />
      <div className="wrap">
        <div className={styles.heroInner}>
          <div className={styles.heroEyebrow}>The Rulebook</div>
          <h1 className={styles.heroTitle}>Rules Documentation</h1>
          <p className={styles.heroSub}>
            Everything you need to understand your program, trading conditions and limits — sourced directly from
            the platform&apos;s rule configuration. Nothing here is assumed; what isn&apos;t configured is shown as
            not specified.
          </p>

          <div className={styles.searchWrap} ref={wrapRef}>
            <div className={styles.searchBox}>
              <span className={styles.searchIconWrap} aria-hidden="true"><Search size={20} strokeWidth={2.2} /></span>
              <label htmlFor="rules-search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
                Search trading rules
              </label>
              <input
                ref={inputRef}
                id="rules-search"
                type="text"
                className={styles.searchInput}
                placeholder="Search rules, trading conditions, payouts..."
                value={query}
                onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                onFocus={() => setOpen(true)}
                onKeyDown={onInputKeyDown}
                role="combobox"
                aria-expanded={open && q.length > 0}
                aria-controls="rules-search-results"
                autoComplete="off"
              />
              {query ? (
                <button type="button" className={styles.searchClear} onClick={() => { setQuery(''); setOpen(false); }} aria-label="Clear search">
                  <X size={15} strokeWidth={2.4} /> Clear
                </button>
              ) : (
                <span className={styles.searchKbdHint} aria-hidden="true">{kbdLabel}</span>
              )}
            </div>

            {open && q.length > 0 && (
              <div className={styles.searchResults} id="rules-search-results" role="listbox">
                {results.length === 0 ? (
                  <div className={styles.searchEmpty}>
                    <div className={styles.searchEmptyTitle}>No rules found for &ldquo;{query.trim()}&rdquo;</div>
                    <div className={styles.searchSuggestRow}>
                      {SEARCH_SUGGESTIONS.map((s) => (
                        <button key={s} type="button" className={styles.searchSuggestChip} onClick={() => setQuery(s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  results.map((item, i) => (
                    <button key={`${item.sectionId}-${i}`} type="button" role="option" data-program={item.programId} className={styles.searchResultItem} onClick={() => pick(item)}>
                      <div className={styles.searchResultSection}>
                        {item.programLabel}{item.phaseLabel ? ` · ${item.phaseLabel}` : ''} · {item.sectionLabel}
                      </div>
                      <div className={styles.searchResultLabel}>{item.label}</div>
                      {item.note && <div className={styles.searchResultNote}>{item.note}</div>}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
