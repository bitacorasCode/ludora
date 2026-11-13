'use client';

import { useCallback, useLayoutEffect, useRef } from 'react';

export function useRequestScope() {
  const lifecycle = useRef({ active: false, generation: 0 });

  useLayoutEffect(() => {
    const current = lifecycle.current;
    current.active = true;

    return () => {
      current.active = false;
      current.generation += 1;
    };
  }, []);

  const invalidate = useCallback(() => {
    lifecycle.current.generation += 1;
  }, []);

  const capture = useCallback(() => {
    const generation = lifecycle.current.generation;

    return () =>
      lifecycle.current.active && lifecycle.current.generation === generation;
  }, []);

  return { capture, invalidate };
}
