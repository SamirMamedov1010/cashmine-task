export type FreshnessTone = 'fresh' | 'aging' | 'stale';

export interface BalanceFreshness {
  label: string;
  tone: FreshnessTone;
}

export function getBalanceFreshness(asOf: string, now: number): BalanceFreshness {
  const timestamp = Date.parse(asOf);
  if (!Number.isFinite(timestamp)) {
    return { label: 'Freshness unknown', tone: 'stale' };
  }

  const ageSeconds = Math.max(0, Math.floor((now - timestamp) / 1_000));
  const relative = ageSeconds < 5 ? 'just now' : `${ageSeconds}s ago`;

  if (ageSeconds <= 30) {
    return { label: `Updated ${relative}`, tone: 'fresh' };
  }

  if (ageSeconds <= 60) {
    return { label: `Updating · ${relative}`, tone: 'aging' };
  }

  return { label: `Stale · ${relative}`, tone: 'stale' };
}
