export function parseDelayToMs(value: string): number {
  const match = value.trim().match(/^(\d+)(ms|s|m|h|d)$/i);
  if (!match) return 0;
  const n = parseInt(match[1], 10);
  switch (match[2].toLowerCase()) {
    case 'ms':
      return n;
    case 's':
      return n * 1000;
    case 'm':
      return n * 60_000;
    case 'h':
      return n * 3_600_000;
    case 'd':
      return n * 86_400_000;
    default:
      return 0;
  }
}
