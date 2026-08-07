'use client';

// Shared terminal constants. Single source of truth for instrument tokens,
// timeframe codes, and timeframe labels — imported by TradingTerminal,
// Watchlist, PaneManager, TerminalHeader, TerminalDataLayer, Hotkeys, ChartPane.

export const INDEX_TOKEN = { NIFTY: '99926000', BANKNIFTY: '99926009' };

export const TIMEFRAMES = [
  ['1m', 'ONE_MINUTE'],
  ['3m', 'THREE_MINUTE'],
  ['5m', 'FIVE_MINUTE'],
  ['15m', 'FIFTEEN_MINUTE'],
  ['1h', 'ONE_HOUR'],
  ['4h', 'FOUR_HOUR'],
  ['1D', 'ONE_DAY'],
];

export const TIMEFRAME_LABELS = {
  ONE_MINUTE: '1m',
  THREE_MINUTE: '3m',
  FIVE_MINUTE: '5m',
  FIFTEEN_MINUTE: '15m',
  ONE_HOUR: '1h',
  FOUR_HOUR: '4h',
  ONE_DAY: '1D',
};

// NSE cash market session (Asia/Kolkata). Options/futures trade until 15:30.
export const IS_MARKET_OPEN = () => {
  const now = new Date();
  if (now.getDay() === 0 || now.getDay() === 6) return false;
  const mins = now.getUTCHours() * 60 + now.getUTCMinutes() + 330;
  return mins >= 555 && mins <= 930;
};
