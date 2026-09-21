/**
 * Canonical trade-record statistics  (Batch 7 — Analytics)
 *
 * Pure functions over the ACTUAL trades schema only:
 *   trades(pnl bigint NOT NULL, traded_at timestamptz, instrument text NOT NULL, side text)
 *
 * Nothing is invented. A metric whose denominator is zero / whose inputs are
 * missing returns null, and the UI renders "—".
 *
 * These are "trade-record" figures — they are NOT the same thing as
 * `accounts.equity - plans.capital` (the account-equity P&L), because
 * `accounts.equity` can carry admin adjustments that never appear as trade
 * rows. Analytics labels both explicitly; this module only ever sums real
 * `trades.pnl`.
 *
 * Win-rate denominator = non-break-even trades (per the Batch 7 spec).
 * Break-even (pnl === 0) is never counted as a loss.
 */

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

/**
 * @param {Array<{pnl:number, traded_at?:string}>} trades
 * @returns {{
 *   total:number, wins:number, losses:number, breakEven:number,
 *   winRate:number|null,               // wins / (wins+losses) * 100
 *   grossProfit:number, grossLoss:number,  // grossLoss is a positive magnitude
 *   netPnl:number,                     // SUM(pnl)  — trade-record P&L
 *   avgWin:number|null,                // >0, null when no wins
 *   avgLoss:number|null,               // <0 (signed), null when no losses
 *   bestTrade:number|null,             // MAX(pnl)
 *   worstTrade:number|null,            // MIN(pnl)
 *   profitFactor:number|null,          // grossProfit / grossLoss, null when grossLoss === 0
 *   expectancy:number|null,            // per-trade expected pnl, null when no decided trades
 * }}
 */
export function computeTradeStats(trades) {
  const rows = Array.isArray(trades) ? trades.filter((t) => num(t?.pnl) !== null) : [];
  const total = rows.length;
  if (total === 0) {
    return {
      total: 0, wins: 0, losses: 0, breakEven: 0, winRate: null,
      grossProfit: 0, grossLoss: 0, netPnl: 0,
      avgWin: null, avgLoss: null, bestTrade: null, worstTrade: null,
      profitFactor: null, expectancy: null,
    };
  }

  const pnls = rows.map((t) => Number(t.pnl));
  const winPnls = pnls.filter((p) => p > 0);
  const lossPnls = pnls.filter((p) => p < 0);
  const wins = winPnls.length;
  const losses = lossPnls.length;
  const breakEven = pnls.filter((p) => p === 0).length;
  const decided = wins + losses;

  const grossProfit = winPnls.reduce((s, p) => s + p, 0);
  const grossLoss = Math.abs(lossPnls.reduce((s, p) => s + p, 0));
  const netPnl = pnls.reduce((s, p) => s + p, 0);

  const avgWin = wins ? grossProfit / wins : null;
  const avgLoss = losses ? lossPnls.reduce((s, p) => s + p, 0) / losses : null; // signed, negative

  const winRate = decided ? (wins / decided) * 100 : null;
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : null;

  // Expectancy per trade = p(win)·avgWin + p(loss)·avgLoss  (avgLoss already signed)
  const expectancy = decided && avgWin !== null && avgLoss !== null
    ? (wins / decided) * avgWin + (losses / decided) * avgLoss
    : (decided && avgWin !== null && losses === 0)
      ? avgWin
      : (decided && avgLoss !== null && wins === 0)
        ? avgLoss
        : null;

  return {
    total, wins, losses, breakEven, winRate,
    grossProfit, grossLoss, netPnl,
    avgWin, avgLoss,
    bestTrade: Math.max(...pnls),
    worstTrade: Math.min(...pnls),
    profitFactor, expectancy,
  };
}

/**
 * Maximum drawdown of the realized "trade-record equity" curve
 * (capital + cumulative pnl), as a positive % of capital.
 * Returns null when capital is not a positive number or there are < 1 trades.
 * This is an OBSERVED figure from recorded trades — not a verified complete
 * account history.
 */
export function observedMaxDrawdownPct(trades, capital) {
  const cap = num(capital);
  const rows = Array.isArray(trades)
    ? [...trades].filter((t) => num(t?.pnl) !== null && !Number.isNaN(new Date(t?.traded_at).getTime()))
        .sort((a, b) => new Date(a.traded_at).getTime() - new Date(b.traded_at).getTime())
    : [];
  if (cap === null || cap <= 0 || rows.length === 0) return null;

  let peak = cap;
  let running = cap;
  let maxDd = 0;
  for (const t of rows) {
    running += Number(t.pnl);
    if (running > peak) peak = running;
    const dd = ((peak - running) / peak) * 100;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

/**
 * Groups recorded trades by IST trading day (Asia/Kolkata, fixed +5:30, no DST),
 * so a late-session Indian-market trade never lands on the previous/next
 * calendar date via the browser's own timezone.
 * @returns Array<{ date:string, pnl:number, trades:number }> where date is a
 *          YYYY-MM-DD IST day, newest first. Only days with real trades are
 *          returned — no zero-fill.
 */
const IST_DATE = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
});

export function dailyPnl(trades) {
  const rows = Array.isArray(trades) ? trades : [];
  const byDay = new Map();
  for (const t of rows) {
    if (num(t?.pnl) === null) continue;
    const ts = new Date(t?.traded_at).getTime();
    if (Number.isNaN(ts)) continue;
    const key = IST_DATE.format(new Date(ts));
    const cur = byDay.get(key) || { date: key, pnl: 0, trades: 0 };
    cur.pnl += Number(t.pnl);
    cur.trades += 1;
    byDay.set(key, cur);
  }
  return [...byDay.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/**
 * Net P&L and trade count grouped by a raw trade text field
 * ('instrument' or 'side') — no parsing, no CE/PE inference.
 * @returns Array<{ key:string, pnl:number, trades:number }> sorted by |pnl| desc.
 */
export function pnlByField(trades, field) {
  const rows = Array.isArray(trades) ? trades : [];
  const map = new Map();
  for (const t of rows) {
    if (num(t?.pnl) === null) continue;
    const raw = t?.[field];
    const key = raw == null || raw === '' ? '—' : String(raw);
    const cur = map.get(key) || { key, pnl: 0, trades: 0 };
    cur.pnl += Number(t.pnl);
    cur.trades += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
}
