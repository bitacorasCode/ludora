'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState, useTransition } from 'react';

import { useActionErrorToast, useProtectedRequest } from '@/hooks';
import { ACTION_ERROR_CODES, OPERATION_STATUS } from '@/lib/actions';

import { requestPasswordCreation } from '../actions';

export function useCreatePasswordRequest(userId: string) {
  const locale = useLocale();
  const t = useTranslations('UserSettings.password.create');
  const { execute, isRecoveringSession } = useProtectedRequest();
  const { showError, dismissError } = useActionErrorToast({ title: t('errorTitle') });
  const [isPending, startTransition] = useTransition();
  const [isRequestAccepted, setIsRequestAccepted] = useState(false);
  const requestInFlight = useRef(false);

  function requestCreation() {
    if (requestInFlight.current || isRecoveringSession) return;

    requestInFlight.current = true;
    dismissError();
    setIsRequestAccepted(false);

    startTransition(async () => {
      try {
        const result = await execute(() => requestPasswordCreation(locale, userId));

        if (!result) return;

        if (result.status === OPERATION_STATUS.error) {
          showError(result.error);
          return;
        }

        setIsRequestAccepted(true);
      } catch {
        showError({ errorCode: ACTION_ERROR_CODES.unexpected });
      } finally {
        requestInFlight.current = false;
      }
    });
  }

  return { requestCreation, isRequestAccepted, isSubmitting: isPending || isRecoveringSession };
}
