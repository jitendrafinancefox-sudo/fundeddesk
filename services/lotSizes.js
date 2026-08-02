// Global contract-multiplier dictionary for Indian index option lots.
// Keys are the canonical underlying names; values are the exchange lot sizes.
// trueQuantity (contracts) = lotsInput * LOT_SIZES[currentSymbol].
export const LOT_SIZES = { 'NIFTY 50': 75, 'BANKNIFTY': 30, 'FINNIFTY': 25 };

// Resolve a multiplier from any symbol/underlying label the terminal produces:
// 'NIFTY 50' / 'NIFTY 24500 CE' / 'NIFTY' -> 75 · 'BANKNIFTY' -> 30 · 'FINNIFTY' -> 25.
const ALIASES = { NIFTY: 'NIFTY 50', BANKNIFTY: 'BANKNIFTY', FINNIFTY: 'FINNIFTY' };
export function contractMultiplier(symbol = '') {
  const key = Object.keys(LOT_SIZES).find((name) => symbol.startsWith(name)) || ALIASES[symbol.split(' ')[0]];
  return LOT_SIZES[key] ?? null;
}
