import { NextResponse } from 'next/server';
import { FEEDS, parseRssFeed, mergeArticles } from '@/lib/providers/news';

// Always run on request (not prerendered at build) — the RSS fetch must not
// execute in the build sandbox. A CDN can still cache via the header below.
export const dynamic = 'force-dynamic';

const FEED_TIMEOUT_MS = 6000;

async function fetchFeed(feed) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FEED_TIMEOUT_MS);
  try {
    const res = await fetch(feed.url, {
      signal: ctrl.signal,
      headers: { 'user-agent': 'FundedDesk/1.0 (+market-news)' },
      cache: 'no-store',
    });
    if (!res.ok) return { name: feed.name, ok: false, articles: [] };
    const xml = await res.text();
    return { name: feed.name, ok: true, articles: parseRssFeed(xml, feed.name) };
  } catch (e) {
    return { name: feed.name, ok: false, articles: [] };
  } finally {
    clearTimeout(t);
  }
}

export async function GET() {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const okFeeds = results.filter((r) => r.ok);
  const articles = mergeArticles(results.map((r) => r.articles)).slice(0, 30);

  if (okFeeds.length === 0) {
    return NextResponse.json(
      {
        articles: [],
        fetchedAt: new Date().toISOString(),
        sources: FEEDS.map((f) => f.name),
        degraded: true,
        error: 'No news feeds could be reached.',
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    {
      articles,
      fetchedAt: new Date().toISOString(),
      sources: okFeeds.map((r) => r.name),
      degraded: okFeeds.length < FEEDS.length,
    },
    { headers: { 'cache-control': 's-maxage=120, stale-while-revalidate=300' } },
  );
}
