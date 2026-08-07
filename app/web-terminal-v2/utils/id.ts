let counter = 0;

export function uid(prefix = "id"): string {
  counter = (counter + 1) % 0xffff;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}
