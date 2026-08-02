'use client';
// Data-source agnostic replay state machine. A future feed adapter can supply
// candles without coupling replay controls to Angel One or rendering code.
export class ReplayController {
  constructor({ onCursor } = {}) { this.cursor = 0; this.playing = false; this.onCursor = onCursor; this.frame = null; }
  seek(index) { this.cursor = Math.max(0, index); this.onCursor?.(this.cursor); }
  play({ speed = 1 } = {}) { this.playing = true; const tick = () => { if (!this.playing) return; this.seek(this.cursor + speed); this.frame = requestAnimationFrame(tick); }; tick(); }
  pause() { this.playing = false; if (this.frame) cancelAnimationFrame(this.frame); this.frame = null; }
  reset() { this.pause(); this.seek(0); }
}
