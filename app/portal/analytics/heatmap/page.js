'use client';
import { Grid3x3 } from 'lucide-react';
import ComingSoon from '../../_ComingSoon';
export default function Page() {
  return <ComingSoon icon={Grid3x3} title="Market Heatmap"
    blurb="A live cross-instrument heatmap for NIFTY, BANKNIFTY and major pairs — needs a market-data feed integration, arriving in Phase 2." />;
}
