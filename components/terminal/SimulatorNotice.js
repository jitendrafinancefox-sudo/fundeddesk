'use client';

import { Info } from 'lucide-react';

/**
 * Persistent, non-dismissible truthfulness banner for the Web Terminal(s).
 *
 * The terminal's order → fill → position → P&L flow is a fully client-side
 * PRACTICE SIMULATOR (stores/TradingStore.js, localStorage only). There is no
 * broker integration, no live order execution, and nothing here writes to the
 * real trades / accounts / positions tables. This strip states that plainly so
 * "Executed" / "Filled" / "LIVE DATA" in the UI are never mistaken for real
 * broker execution or an effect on the funded/evaluation account.
 */
export default function SimulatorNotice({ compact = false }) {
  return (
    <div
      role="note"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: compact ? '4px 12px' : '6px 14px',
        background: '#FFF7E6',
        borderBottom: '1px solid #F0D9A8',
        color: '#8A5A00',
        fontSize: 11.5,
        lineHeight: 1.35,
        fontFamily: 'Inter, system-ui, sans-serif',
        flexShrink: 0,
      }}
    >
      <Info size={13} style={{ flexShrink: 0 }} aria-hidden="true" />
      <span>
        <strong>Practice simulator.</strong> Orders, fills, positions and P&amp;L here are simulated and stored only in
        this browser — nothing is sent to a broker or exchange, and none of it affects your evaluation or funded
        account. Prices are from a delayed/indicative market-data feed.
      </span>
    </div>
  );
}
