'use client';

// Converts DOM gestures into viewport operations. It owns no chart state and
// only calls the injected engine interface, which keeps input independent from rendering.
// TradingView-style: weighted velocity averaging, vertical inertia, adaptive decay.
const VELOCITY_SLOTS = 5;
// Decay weights, oldest → newest: newer samples weigh more (precomputed so no
// Math.pow per sample per move).
const VELOCITY_WEIGHTS = Array.from({ length: VELOCITY_SLOTS }, (_, i) => Math.pow(1.5, i));
const FRAME_MS = 16.667;

export class InteractionController {
  constructor(engine) {
    this.engine = engine;
    this.last = null;
    this.velocityX = 0;
    this.velocityY = 0;
    this.frame = null;
    // Fixed ring buffer of velocity samples — no push/shift allocations.
    this.samples = Array.from({ length: VELOCITY_SLOTS }, () => ({ vx: 0, vy: 0, at: 0 }));
    this.sampleCount = 0;
    this.sampleHead = 0;
    this.inertiaAt = 0;
  }

  startPan(point) {
    this.stopInertia();
    this.last = { x: point.x, y: point.y, at: performance.now() };
    this.velocityX = 0;
    this.velocityY = 0;
    this.sampleCount = 0;
    this.sampleHead = 0;
  }

  movePan(point) {
    if (!this.last) return;
    const now = performance.now();
    const dx = point.x - this.last.x;
    const dy = point.y - this.last.y;
    const elapsed = Math.max(1, now - this.last.at);

    // Weighted velocity averaging (recent samples weigh more) into the ring.
    const slot = this.samples[this.sampleHead];
    slot.vx = dx / elapsed * 16;
    slot.vy = dy / elapsed * 16;
    slot.at = now;
    this.sampleHead = (this.sampleHead + 1) % VELOCITY_SLOTS;
    if (this.sampleCount < VELOCITY_SLOTS) this.sampleCount += 1;

    let totalWeight = 0;
    let avgVx = 0;
    let avgVy = 0;
    const head = this.sampleHead;
    const count = this.sampleCount;
    for (let i = 0; i < count; i++) {
      const s = this.samples[(head - count + i + VELOCITY_SLOTS) % VELOCITY_SLOTS];
      const weight = VELOCITY_WEIGHTS[i];
      avgVx += s.vx * weight;
      avgVy += s.vy * weight;
      totalWeight += weight;
    }
    this.velocityX = avgVx / totalWeight;
    this.velocityY = avgVy / totalWeight;

    this.engine.pan(dx);
    this.last.x = point.x;
    this.last.y = point.y;
    this.last.at = now;
  }

  endPan() {
    this.last = null;
    this.sampleCount = 0;
    this.sampleHead = 0;
    const speed = Math.hypot(this.velocityX, this.velocityY);
    if (speed > 0.3) this.inertia();
  }

  inertia() {
    this.inertiaAt = performance.now();
    const step = () => {
      const now = performance.now();
      // Time-based decay (0.93 per 60fps frame) so the glide feels identical
      // on 60Hz, 120Hz and variable refresh screens.
      const dt = Math.max(0, (now - this.inertiaAt) / FRAME_MS);
      this.inertiaAt = now;
      this.engine.pan(this.velocityX);
      const decay = Math.pow(0.93, dt);
      this.velocityX *= decay;
      this.velocityY *= decay;
      if (Math.hypot(this.velocityX, this.velocityY) > 0.05) this.frame = requestAnimationFrame(step);
      else this.frame = null;
    };
    step();
  }

  zoom(deltaY, x) { this.engine.zoom(deltaY, x); }

  stopInertia() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.velocityX = 0;
    this.velocityY = 0;
    this.sampleCount = 0;
    this.sampleHead = 0;
  }

  destroy() { this.stopInertia(); }
}
