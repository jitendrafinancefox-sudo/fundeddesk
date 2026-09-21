/** @type {import('next').NextConfig} */

// Baseline security response headers (Batch 24). Deliberately NOT a strict CSP:
// the app relies on Supabase (REST + realtime WebSocket), a configurable market-
// data relay, Google Fonts, cdnjs, and inline <style>/<script> (JSON-LD, scoped
// CSS) — a wrong CSP would break those with no visible error. These headers are
// safe with all of the above and add real protection (MIME sniffing, referrer
// leakage, clickjacking, unused browser features).
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
];

const nextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
