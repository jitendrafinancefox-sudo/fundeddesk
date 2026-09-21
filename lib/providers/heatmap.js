/**
 * Heatmap provider adapter — Batch 11.
 *
 * The heatmap's only source is the existing shared market-data relay
 * (`services/marketData.js` -> `${NEXT_PUBLIC_RELAY_URL}/api/heatmap`), the
 * same relay the Web Terminal uses. This module does NOT open a second
 * integration — it only normalises the relay rows into a stable contract:
 *
 *   { symbol, name, changePct, price, sector, weight }
 *
 * Fields the relay does not return stay `null`. A missing change/price is
 * `null` — never 0 / 0.00 / "N/A" — so the UI can honestly render "—".
 */

const num = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const str = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
};

/** @param {Array<object>} rows raw relay heatmap rows @returns normalised rows */
export function normalizeHeatmap(rows) {
  if (!Array.isArray(rows)) return [];
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const symbol = str(r.symbol) || str(r.tradingsymbol) || str(r.token);
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    out.push({
      symbol,
      name: str(r.name) || str(r.companyName) || null,
      // relay uses dayChangePercent; accept a few aliases, else null
      changePct: num(r.dayChangePercent ?? r.changePercent ?? r.pChange ?? r.changePct),
      price: num(r.ltp ?? r.lastPrice ?? r.price ?? r.close),
      sector: str(r.sector) || null,
      weight: num(r.weight ?? r.indexWeight),
    });
  }
  return out;
}

/** Sort worst-first so the biggest movers read at the edges; stable by symbol. */
export function sortHeatmap(rows) {
  return [...rows].sort((a, b) => {
    const ca = a.changePct == null ? 0 : a.changePct;
    const cb = b.changePct == null ? 0 : b.changePct;
    if (cb !== ca) return cb - ca;
    return a.symbol.localeCompare(b.symbol);
  });
}

/** Breadth counts from real values only (nulls excluded from both sides). */
export function breadth(rows) {
  let up = 0, down = 0, flat = 0, unknown = 0;
  for (const r of rows) {
    if (r.changePct == null) unknown++;
    else if (r.changePct > 0) up++;
    else if (r.changePct < 0) down++;
    else flat++;
  }
  return { up, down, flat, unknown, total: rows.length };
}
