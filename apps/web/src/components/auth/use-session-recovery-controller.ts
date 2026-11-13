'use client';

import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useTransition,
} from 'react';

type PendingRecovery = {
  promise: Promise<void>;
  resolve: () => void;
  observedPending: boolean;
};

export function useSessionRecoveryController() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const pendingRecovery = useRef<PendingRecovery | null>(null);

  const finishRecovery = useCallback(() => {
    const recovery = pendingRecovery.current;

    pendingRecovery.current = null;
    recovery?.resolve();
  }, []);

  useEffect(() => {
    const recovery = pendingRecovery.current;

    if (!recovery) return;

    if (isPending) {
      recovery.observedPending = true;
      return;
    }

    if (recovery.observedPending) {
      finishRecovery();
    }
  }, [isPending, finishRecovery]);

  useLayoutEffect(() => finishRecovery, [finishRecovery]);

  const recoverSession = useCallback(() => {
    if (pendingRecovery.current) {
      return pendingRecovery.current.promise;
    }

    let finish!: () => void;

    const promise = new Promise<void>((resolve) => {
      finish = resolve;
    });

    pendingRecovery.current = {
      promise,
      resolve: finish,
      observedPending: false,
    };

    startTransition(() => {
      router.refresh();
    });

    return promise;
  }, [router, startTransition]);

  const value = useMemo(
    () => ({
      recoverSession,
      isRecoveringSession: isPending,
    }),
    [recoverSession, isPending],
  );

  return value;
}
