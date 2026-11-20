'use client';

import { useRouter } from 'next/navigation';
import {
  useCallback,
  useMemo,
  useRef,
  useTransition,
} from 'react';

import { ACTION_ERROR_CODES, OPERATION_STATUS } from '@/lib/actions';
import { refreshSession } from '@/lib/session/actions';
import { type RefreshSessionResult, SESSION_REFRESH_OUTCOME } from '@/lib/session/refresh-result';
import { withSessionLock } from '@/lib/session/session-lock';

export function useSessionRecoveryController() {
  const router = useRouter();
  const [isRecoveringSession, startTransition] = useTransition();
  const pendingRecovery = useRef<Promise<RefreshSessionResult> | null>(null);

  const recoverSession = useCallback(() => {
    if (pendingRecovery.current) {
      return pendingRecovery.current;
    }

    const recovery = new Promise<RefreshSessionResult>((resolve) => {
      startTransition(async () => {
        try {
          const result = await withSessionLock(refreshSession);

          if (
            result.status === OPERATION_STATUS.success
            && result.data !== SESSION_REFRESH_OUTCOME.renewed
          ) {
            router.refresh();
          }

          resolve(result);
        } catch {
          resolve({
            status: OPERATION_STATUS.error,
            error: { errorCode: ACTION_ERROR_CODES.unexpected },
          });
        }
      });
    }).finally(() => {
      pendingRecovery.current = null;
    });

    pendingRecovery.current = recovery;

    return recovery;
  }, [router, startTransition]);

  return useMemo(
    () => ({ recoverSession, isRecoveringSession }),
    [recoverSession, isRecoveringSession],
  );
}
