'use client';
import { CoordinateEngine } from './coords/CoordinateEngine';

// Backward-compatible facade: the terminal (and any existing consumer) keeps
// constructing a ViewportEngine, but all coordinate math now lives in the
// CoordinateEngine stack (TimeScale + PriceScale + ViewportTransformer +
// ProjectionService). Public API and `state` shape are unchanged.
export class ViewportEngine extends CoordinateEngine {}
