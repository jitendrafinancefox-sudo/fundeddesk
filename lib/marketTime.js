/**
 * Market date/time — one utility for the market-intelligence pages
 * (heatmap / news / calendar).  Batch 11.
 *
 * Everything user-facing is Asia/Kolkata (IST, fixed +5:30, no DST) so the
 * browser's own timezone can never shift a displayed market time or date.
 * The canonical market-session check is re-exported from the terminal
 * constants — these pages do NOT define their own session logic.
 */

export { IS_MARKET_OPEN } from '@/components/terminal/constants';

const IST = 'Asia/Kolkata';

const _time = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST, hour: '2-digit', minute: '2-digit', hour12: false,
});
const _timeSec = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});
const _dateLong = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST, day: '2-digit', month: 'short', year: 'numeric',
});
const _dateTime = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
});

/** "14:32 IST" for a Date/ms/ISO, or null if not parseable. */
export function istClock(input, withSeconds = false) {
  const d = toDate(input);
  if (!d) return null;
  return `${(withSeconds ? _timeSec : _time).format(d)} IST`;
}

/** "09 Sep 2026" in IST. */
export function istDate(input) {
  const d = toDate(input);
  return d ? _dateLong.format(d) : null;
}

/** "09 Sep 2026, 14:32 IST". */
export function istDateTime(input) {
  const d = toDate(input);
  return d ? `${_dateTime.format(d)} IST` : null;
}

/**
 * Format a plain YYYY-MM-DD calendar date (e.g. an `economic_events.event_date`
 * DATE column) without ever constructing an ambiguous local Date. Returns the
 * raw string if it isn't the expected shape.
 */
export function calendarDateLabel(ymd) {
  if (typeof ymd !== 'string') return '—';
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return ymd;
  const [, y, mo, d] = m;
  const dt = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' }).format(dt);
}

/** YYYY-MM (IST) of a plain YYYY-MM-DD, for month grouping. */
export function calendarMonthKey(ymd) {
  if (typeof ymd !== 'string') return '';
  const m = ymd.match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : '';
}

/** Human "MMM YYYY" for a YYYY-MM key. */
export function monthLabel(key) {
  const m = /^(\d{4})-(\d{2})$/.exec(key || '');
  if (!m) return key || '';
  const dt = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
  return new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', month: 'short', year: 'numeric' }).format(dt);
}

/** IST "today" as YYYY-MM-DD, for comparing against a DATE column. */
export function istTodayYmd() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date());
  return parts; // en-CA gives YYYY-MM-DD
}

/**
 * Relative age of a timestamp ("2h ago", "just now", "3d ago"). Accepts RFC-822
 * (RSS pubDate), ISO 8601, ms, or Date. Returns null if unparseable.
 */
export function relativeAge(input) {
  const d = toDate(input);
  if (!d) return null;
  const diff = Date.now() - d.getTime();
  if (diff < 0) return 'just now';
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return istDate(d);
}

function toDate(input) {
  if (input == null) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  if (typeof input === 'number') {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'string') {
    const d = new Date(input); // RFC-822 and ISO 8601 are both unambiguous to Date
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
