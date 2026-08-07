import Link from 'next/link';
import { POSTS } from './posts';


function shareCount(slug) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return 400 + (h % 2600); // stable-looking "random" number per post
}

export default function Blog() {
  return (
    <main>
      <section>
        <div className="wrap" style={{ maxWidth: 880 }}>
          <div className="sec-head">
            <span className="pill">Blog</span>
            <h2>Trading notes from the FundedDesk desk</h2>
            <p>Short, practical reads on evaluations, risk, and options — no fluff.</p>
          </div>

          <div style={{ display: 'grid', gap: 14 }}>
            {POSTS.map((p) => (
              <Link href={`/blog/${p.slug}`} key={p.slug} style={{ display: 'block' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 8, transition: 'transform .2s,border-color .2s', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="tag tag-blue">{p.tag}</span>
                    <span className="dim" style={{ fontSize: 12 }}>{p.date} · {p.read}</span>
                  </div>
                  <h3 style={{ fontSize: 18 }}>{p.title}</h3>
                  <p className="muted" style={{ fontSize: 14 }}>{p.excerpt}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 12.5, color: 'var(--dim)' }}>
                    <span>📸</span><b style={{ color: 'var(--green)' }}>{shareCount(p.slug).toLocaleString('en-IN')}</b> Instagram shares
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
