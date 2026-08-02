'use client';
export class ToolRegistry {
  constructor() { this.tools = new Map(); }
  register(tool) { if (!tool?.id || !tool.create) throw new Error('Tools require an id and create function'); this.tools.set(tool.id, tool); return () => this.tools.delete(tool.id); }
  get(id) { return this.tools.get(id); }
  list() { return [...this.tools.values()]; }
}

export const defaultToolRegistry = new ToolRegistry();
['trend', 'hline', 'vline', 'rect', 'ellipse', 'ray', 'extended', 'text', 'arrow', 'measure', 'fib', 'brush', 'parallelChannel', 'pitchfork'].forEach((id) => defaultToolRegistry.register({ id, create: (drawing) => drawing }));
