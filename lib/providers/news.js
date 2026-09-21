/**
 * News provider — RSS parsing kept OUT of React and OUT of the route body.
 * Batch 11.
 *
 * The only news sources are public RSS feeds from real Indian financial
 * publishers (see FEEDS). No provider partnership, no API key, no
 * fabricated source names — `source` is always the real publisher whose
 * feed the item came from.
 *
 * Normalised article contract:
 *   { id, title, summary, source, url, publishedAt, imageUrl, category }
 * Any field the feed does not provide is `null` (never a placeholder).
 */

export const FEEDS = [
  { name: 'Economic Times', url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms' },
  { name: 'Moneycontrol', url: 'https://www.moneycontrol.com/rss/marketreports.xml' },
];

const stripCdata = (s) => {
  if (s == null) return null;
  const m = String(s).match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  return (m ? m[1] : String(s)).trim();
};

const stripHtml = (s) =>
  s == null
    ? null
    : String(s)
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();

/** Deterministic id from real properties — never random. */
function articleId(url, title, source) {
  const basis = (url && url.length > 8 ? url : `${source}|${title || ''}`).trim();
  let h = 5381;
  for (let i = 0; i < basis.length; i++) h = ((h << 5) + h + basis.charCodeAt(i)) >>> 0;
  return `a_${h.toString(36)}`;
}

function firstTag(block, name) {
  const m = block.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>', 'i'));
  return m ? stripCdata(m[1]) : null;
}

function firstAttr(block, tag, attr) {
  const m = block.match(new RegExp('<' + tag + '\\b[^>]*\\b' + attr + '="([^"]+)"[^>]*/?>', 'i'));
  return m ? m[1] : null;
}

/**
 * @param {string} xml   raw RSS body
 * @param {string} source real publisher name
 * @returns normalised article array (may be empty)
 */
export function parseRssFeed(xml, source) {
  if (typeof xml !== 'string' || !xml.includes('<item')) return [];
  const out = [];
  const seen = new Set();
  const itemRe = /<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1];
    const title = stripHtml(firstTag(block, 'title'));
    const url = firstTag(block, 'link');
    const publishedAt = firstTag(block, 'pubDate') || firstTag(block, 'dc:date') || null;
    if (!title || !publishedAt) continue;

    const summaryRaw = firstTag(block, 'description') || firstTag(block, 'summary');
    const summary = summaryRaw ? clip(stripHtml(summaryRaw), 260) : null;

    const imageUrl =
      firstAttr(block, 'enclosure', 'url') ||
      firstAttr(block, 'media:content', 'url') ||
      firstAttr(block, 'media:thumbnail', 'url') ||
      null;

    const category = stripHtml(firstTag(block, 'category')) || null;

    const id = articleId(url, title, source);
    if (seen.has(id)) continue;
    seen.add(id);

    out.push({
      id,
      title,
      summary: summary && summary !== title ? summary : null,
      source,
      url: url && /^https?:\/\//i.test(url) ? url : null,
      publishedAt,
      imageUrl: imageUrl && /^https?:\/\//i.test(imageUrl) ? imageUrl : null,
      category,
    });
  }
  return out;
}

function clip(s, n) {
  if (!s) return s;
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…';
}

/** Merge, de-dupe across feeds by id, newest first. */
export function mergeArticles(lists) {
  const byId = new Map();
  for (const list of lists) {
    for (const a of list || []) {
      if (!byId.has(a.id)) byId.set(a.id, a);
    }
  }
  return [...byId.values()].sort((a, b) => {
    const ta = Date.parse(a.publishedAt) || 0;
    const tb = Date.parse(b.publishedAt) || 0;
    return tb - ta;
  });
}
