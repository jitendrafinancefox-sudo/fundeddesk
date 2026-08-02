import Link from 'next/link';
import { notFound } from 'next/navigation';
import { POSTS } from '../page';

function shareCount(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return 400 + (h % 2600);
}

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export default function BlogPost({ params }) {
  const post = POSTS.find((p) => p.slug === params.slug);
  if (!post) return notFound();

  return (
    <main>
      <section>
        <div className="wrap" style={{ maxWidth: 720 }}>
          <Link href="/blog" className="dim" style={{ fontSize: 13, display: 'inline-block', marginBottom: 22 }}>← Back to Blog</Link>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
            <span className="tag tag-blue">{post.tag}</span>
            <span className="dim" style={{ fontSize: 12.5 }}>{post.date} · {post.read}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(26px,3.6vw,38px)', marginBottom: 22, lineHeight: 1.2 }}>{post.title}</h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
            {post.body.map((para, i) => (
              <p key={i} className="muted" style={{ fontSize: 15.5, lineHeight: 1.75 }}>{para}</p>
            ))}
          </div>

          <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5 }}>
              <span>📸</span><b style={{ color: 'var(--green)' }}>{shareCount(post.slug).toLocaleString('en-IN')}</b>
              <span className="dim">Instagram shares</span>
            </div>
            <Link className="btn btn-grad btn-sm" href="/challenges">Start Your Challenge →</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
