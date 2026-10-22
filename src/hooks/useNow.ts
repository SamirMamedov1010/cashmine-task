import { useEffect, useState } from 'react';

export function useNow(enabled = true, intervalMs = 1_000) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(interval);
  }, [enabled, intervalMs]);

  return now;
}
