'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function groupByMonth(events) {
  const groups = {};
  events.forEach((e) => {
    const parts = (e.event_date || '').split('-');
    if (parts.length < 2) return;
    const key = `${parts[0]}-${parts[1]}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  return Object.keys(groups)
    .sort()
    .map((key) => ({ key, events: groups[key] }));
}

export default function Page() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    supabase
      .from('economic_events')
      .select('*')
      .order('event_date', { ascending: true })
      .then(({ data, error }) => {
        if (error) setErr(error.message);
        else setEvents(data || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="card" style={{ padding: 34, textAlign: 'center' }}><p className="muted">Loading events…</p></div>;
  if (err) return <div className="card" style={{ padding: 34 }}><div className="err">{err}</div></div>;

  const groups = groupByMonth(events);

  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
        <h2 style={{ fontSize: 16, margin: 0 }}>Economic Calendar</h2>
      </div>
      <div style={{ padding: '18px' }}>
        {events.length === 0 && (
          <p className="muted" style={{ fontSize: 13.5 }}>No upcoming events scheduled. Check back later.</p>
        )}
        {groups.map(({ key, events: monthEvents }) => {
          const [year, month] = key.split('-');
          const date = new Date(Number(year), Number(month) - 1, 1);
          const label = `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
          return (
            <div key={key} style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
                {label}
              </h3>
              {monthEvents.map((e) => (
                <div
                  key={e.id}
                  style={{
                    padding: '10px 12px', borderBottom: '1px solid var(--line)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{e.title}</div>
                    {e.notes && <p style={{ fontSize: 12, color: 'var(--dim)', marginTop: 4, lineHeight: 1.5 }}>{e.notes}</p>}
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--dim)', whiteSpace: 'nowrap' }}>
                    {e.event_date}
                  </span>
                  {e.category && (
                    <span className="tag" style={{ fontSize: 10, padding: '2px 8px' }}>
                      {e.category}
                    </span>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
