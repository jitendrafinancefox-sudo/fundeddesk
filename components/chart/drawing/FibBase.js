'use client';

// FibBase — the reusable Fibonacci framework root.
//
// Every Fibonacci tool is a thin declaration over the same machinery:
//   FibLevelManager  → level sets (defaults, toggles, custom levels/colors/labels, reordering)
//   FibGeometry      → pure screen-space geometry per tool type
//   FibRenderer      → shared canvas painter (bands/gradients/lines/labels)
//   FibLabelRenderer → label placement + formatting (L/R/center/auto, %/price/both)
//   FibHitTester     → shared hit testing + handle geometry
//   FibSerializer    → v4 payload sanitization
//
// A future custom Fibonacci tool (Gartley, e.g.) only needs a new geometry
// branch and a registration entry here — levels, labels, styling, editing,
// serialization and hit testing all come for free.

import { fibGeometry } from './FibGeometry';
import { isFibType } from './FibGeometry';

export { isFibType };

export const FIB_TOOLS = [
  { id: 'fib', label: 'Fib Retracement', anchors: 2, rotatable: false },
  { id: 'fibExtension', label: 'Fib Extension', anchors: 2, rotatable: false },
  { id: 'fibProjection', label: 'Fib Projection', anchors: 3, rotatable: false },
  { id: 'fibFan', label: 'Fib Fan', anchors: 2, rotatable: false },
  { id: 'fibChannel', label: 'Fib Channel', anchors: 3, rotatable: true },
  { id: 'fibSpiral', label: 'Fib Spiral', anchors: 2, rotatable: true },
  { id: 'fibTimeZone', label: 'Fib Time Zone', anchors: 2, rotatable: false },
  { id: 'trendFib', label: 'Trend Fib', anchors: 2, rotatable: false },
];

export const FIB_TYPES = FIB_TOOLS.map((tool) => tool.id);

// Drawing-definition metadata (merged into DRAWING_DEFINITIONS). render /
// hitTest are attached by DrawingDefinitions (static imports) so this module
// never forces the renderer/hit-tester cycle at init time.
export const FIB_DEFINITIONS = Object.fromEntries(
  FIB_TOOLS.map(({ id, label, anchors, rotatable }) => [
    id,
    { label, anchorCount: anchors, fib: true, rotatable },
  ]),
);

export { fibGeometry };
