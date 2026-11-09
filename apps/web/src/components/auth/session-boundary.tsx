'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
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

type SessionRecoveryContextValue = {
  recoverSession: () => Promise<void>;
  isRecoveringSession: boolean;
};

const SessionRecoveryContext =
  createContext<SessionRecoveryContextValue | null>(null);

export function SessionBoundary({ children }: { children: ReactNode }) {
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

  return (
    <SessionRecoveryContext.Provider value={value}>
      {children}
    </SessionRecoveryContext.Provider>
  );
}

export function useSessionRecovery() {
  const context = useContext(SessionRecoveryContext);

  if (!context) {
    throw new Error('SessionBoundary is required to recover a session.');
  }

  return context;
}
