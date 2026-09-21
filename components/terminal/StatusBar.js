'use client';
import { useEffect, useState } from 'react';
import { terminalStatus } from '@/stores/TerminalStatus';
import { T } from './theme';
import { marketData } from '@/services/marketData';
import { IS_MARKET_OPEN } from './constants';

const fmtPx = (v) => (v == null ? '—' : v.toLocaleString('en-IN', { minimumFractionDigits: 2 }));
const fmtTime = (t) => (t == null ? '—' : new Date(t).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));

const segStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '0 8px',
  borderRight: '1px solid var(--border)',
  height: '100%',
  fontSize: 10,
  fontFamily: 'Inter, sans-serif',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};
const labelStyle = { color: 'var(--dim)', fontWeight: 500 };
const valueStyle = { color: 'var(--text)', fontWeight: 600 };

function Dot({ on }) {
  return (
    <span style={{
      width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
      background: on ? 'var(--green)' : 'var(--red)',
      boxShadow: on ? '0 0 0 2px rgba(38,166,154,0.2)' : '0 0 0 2px rgba(239,83,80,0.15)',
    }} />
  );
}

export default function StatusBar({ data }) {
  const [status, setStatus] = useState(terminalStatus.get());

  useEffect(() => terminalStatus.subscribe(setStatus), []);

  // Latency — poll the relay health endpoint every 10s while mounted.
  useEffect(() => {
    let stopped = false;
    let timer = null;
    const poll = async () => {
      const start = performance.now();
      try {
        await marketData.health();
        if (stopped) return;
        terminalStatus.set({ ping: Math.round(performance.now() - start) });
      } catch {
        if (stopped) return;
        terminalStatus.set({ ping: null, connection: 'offline' });
      }
      timer = setTimeout(poll, 10000);
    };
    poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, []);

  // FPS — rAF delta sampling, smoothed; published at most every 500ms.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let frames = 0;
    let published = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = now - last;
      last = now;
      if (dt > 0 && dt < 200) {
        acc += 1000 / dt;
        frames += 1;
        if (now - published > 500) {
          terminalStatus.set({ fps: Math.round(acc / frames) });
          acc = 0; frames = 0; published = now;
        }
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Memory — Chrome-only (performance.memory), sampled every 2s.
  useEffect(() => {
    const nav = navigator;
    if (!nav.performance || !('memory' in nav.performance)) return;
    const timer = setInterval(() => {
      const mem = nav.performance.memory;
      terminalStatus.set({ memory: mem ? Math.round(mem.usedJSHeapSize / 1024 / 1024) : null });
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'IST';
  const connected = data?.status === 'connected';

  return (
    <div style={{
      height: 22,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      background: 'var(--bg2)',
      borderTop: '1px solid var(--border)',
      fontFamily: T.font.family,
      fontSize: 10,
      userSelect: 'none',
      overflow: 'hidden',
    }}>
      <div style={{ ...segStyle, paddingLeft: 10, color: 'var(--muted)', fontWeight: 600 }}>
        <Dot on={IS_MARKET_OPEN()} />
        {IS_MARKET_OPEN() ? 'Market Open' : 'Market Closed'}
      </div>
      <div style={segStyle}>
        <span style={labelStyle}>TZ</span>
        <span style={valueStyle}>{tz}</span>
      </div>
      <div style={segStyle}>
        <span style={labelStyle}>Feed</span>
        <span style={{ color: connected ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
          {connected ? 'DATA LIVE' : 'OFFLINE'}
        </span>
      </div>
      <div style={segStyle}>
        <span style={labelStyle}>Ping</span>
        <span style={valueStyle}>{status.ping != null ? `${status.ping} ms` : '—'}</span>
      </div>
      <div style={segStyle}>
        <span style={labelStyle}>FPS</span>
        <span style={{ color: status.fps != null && status.fps < 40 ? 'var(--red)' : 'var(--text)', fontWeight: 700 }}>
          {status.fps ?? '—'}
        </span>
      </div>
      {status.memory != null && (
        <div style={segStyle}>
          <span style={labelStyle}>Mem</span>
          <span style={valueStyle}>{status.memory} MB</span>
        </div>
      )}
      <div style={segStyle}>
        <span style={labelStyle}>Price</span>
        <span style={valueStyle}>{fmtPx(status.cursor?.price)}</span>
      </div>
      <div style={{ ...segStyle, borderRight: 'none', paddingRight: 10 }}>
        <span style={labelStyle}>Time</span>
        <span style={valueStyle}>{fmtTime(status.cursor?.time)}</span>
      </div>
      <div style={{ flex: 1 }} />
    </div>
  );
}
