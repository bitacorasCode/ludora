'use client';

import { SESSION_ACTIVITY_INTERVAL_SECONDS } from '@ludora/security';
import { startTransition, useEffect } from 'react';

import { isAuthenticationError, OPERATION_STATUS } from '@/lib/actions';
import { recordSessionActivity } from '@/lib/session/actions';
import { type RefreshSessionResult, SESSION_REFRESH_OUTCOME } from '@/lib/session/refresh-result';
import { withSessionLock } from '@/lib/session/session-lock';
import { MILLISECONDS_PER_SECOND } from '@/lib/time';

const ACTIVITY_INTERVAL_MS = SESSION_ACTIVITY_INTERVAL_SECONDS * MILLISECONDS_PER_SECOND;

export function useSessionActivity(recoverSession: () => Promise<RefreshSessionResult>) {
  useEffect(() => {
    let active = true;
    let inFlight = false;
    let nextReportAtMs = 0;

    function reportActivity(event: Event) {
      const nowMs = performance.now();

      if (
        !event.isTrusted
        || document.visibilityState !== 'visible'
        || inFlight
        || nowMs < nextReportAtMs
      ) return;

      inFlight = true;
      nextReportAtMs = nowMs + ACTIVITY_INTERVAL_MS;

      startTransition(async () => {
        try {
          const result = await withSessionLock(recordSessionActivity);

          if (
            !active
            || result.status !== OPERATION_STATUS.error
            || !isAuthenticationError(result.error)
          ) return;

          const recovery = await recoverSession();

          if (
            active
            && recovery.status === OPERATION_STATUS.success
            && recovery.data !== SESSION_REFRESH_OUTCOME.ended
          ) {
            await withSessionLock(recordSessionActivity);
          }
        } catch {
          // Reporting activity is best-effort and should not interrupt the interaction.
        } finally {
          inFlight = false;
        }
      });
    }

    document.addEventListener('pointerdown', reportActivity, { passive: true });
    document.addEventListener('keydown', reportActivity);

    return () => {
      active = false;
      document.removeEventListener('pointerdown', reportActivity);
      document.removeEventListener('keydown', reportActivity);
    };
  }, [recoverSession]);
}
