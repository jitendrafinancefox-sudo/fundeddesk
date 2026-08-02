'use client';
export default function ComingSoon({ icon: Icon, title, blurb }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '54px 30px' }}>
      <div style={{
        width: 56, height: 56, borderRadius: 15, background: 'rgba(34,197,139,.13)',
        display: 'grid', placeItems: 'center', margin: '0 auto 18px',
      }}><Icon size={26} color="var(--green)" /></div>
      <h2 style={{ fontSize: 20, marginBottom: 8 }}>{title}</h2>
      <p className="muted" style={{ maxWidth: 420, margin: '0 auto 14px', fontSize: 14 }}>{blurb}</p>
      <span className="tag tag-gold">Coming soon</span>
    </div>
  );
}
