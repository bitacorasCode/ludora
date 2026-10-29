'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const COUNTDOWN_INTERVAL_MS = 250;

export function useCountdown(initialSeconds = 0) {
  const [secondsRemaining, setSecondsRemaining] = useState(initialSeconds);
  const deadline = useRef<number | null>(null);
  const isActive = secondsRemaining > 0;

  useEffect(() => {
    if (!isActive) return;

    deadline.current ??= Date.now() + initialSeconds * 1_000;

    const interval = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil(((deadline.current ?? 0) - Date.now()) / 1_000),
      );

      setSecondsRemaining(remaining);
    }, COUNTDOWN_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [isActive, initialSeconds]);

  const restart = useCallback((seconds: number) => {
    const remaining = Math.max(0, Math.ceil(seconds));

    deadline.current = Date.now() + remaining * 1_000;
    setSecondsRemaining(remaining);
  }, []);

  return { secondsRemaining, restart };
}
