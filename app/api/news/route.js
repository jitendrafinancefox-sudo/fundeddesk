import { NextResponse } from 'next/server';

const FEEDS = [
  { name: 'Economic Times', url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms' },
  { name: 'Moneycontrol',   url: 'https://www.moneycontrol.com/rss/marketreports.xml' },
];

function extractItems(xml) {
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const tag = (name) => {
      const m = block.match(new RegExp('<' + name + '[^>]*>(.*?)</' + name + '>', 'is'));
      if (!m) return null;
      let val = m[1].trim();
      // strip CDATA if present
      const cdata = val.match(/<!\[CDATA\[(.*?)\]\]>/s);
      if (cdata) val = cdata[1].trim();
      return val;
    };
    const title = tag('title');
    const link = tag('link');
    const pubDate = tag('pubDate');
    if (title && pubDate) items.push({ title, link, pubDate });
  }
  return items;
}

export async function GET() {
  try {
    const results = await Promise.all(
      FEEDS.map(async (feed) => {
        const res = await fetch(feed.url, { next: { revalidate: 120 } });
        if (!res.ok) return [];
        const xml = await res.text();
        return extractItems(xml).map((item) => ({ ...item, source: feed.name }));
      })
    );
    const merged = results.flat();
    merged.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    return NextResponse.json(merged.slice(0, 20));
  } catch (e) {
    return NextResponse.json({ error: e.message || 'Failed to fetch news' }, { status: 500 });
  }
}
