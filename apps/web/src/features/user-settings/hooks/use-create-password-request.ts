'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRef, useTransition } from 'react';
import { toast } from 'sonner';

import { useActionErrorToast, useProtectedRequest } from '@/hooks';
import { ACTION_ERROR_CODES, OPERATION_STATUS } from '@/lib/actions';

import { requestPasswordCreation } from '../actions';

const PASSWORD_CREATION_REQUEST_TOAST_ID = 'password-creation-request';

export function useCreatePasswordRequest(userId: string) {
  const locale = useLocale();
  const t = useTranslations('UserSettings.password.create');
  const { execute, isRecoveringSession } = useProtectedRequest();
  const { showError, dismissError } = useActionErrorToast({ title: t('errorTitle') });
  const [isPending, startTransition] = useTransition();
  const requestInFlight = useRef(false);

  function requestCreation() {
    if (requestInFlight.current || isRecoveringSession) return;

    requestInFlight.current = true;
    dismissError();

    startTransition(async () => {
      try {
        const result = await execute(() => requestPasswordCreation(locale, userId));

        if (!result) return;

        if (result.status === OPERATION_STATUS.error) {
          showError(result.error);
          return;
        }

        toast.success(t('success.title'), {
          id: PASSWORD_CREATION_REQUEST_TOAST_ID,
          description: t('success.message'),
        });
      } catch {
        showError({ errorCode: ACTION_ERROR_CODES.unexpected });
      } finally {
        requestInFlight.current = false;
      }
    });
  }

  return { requestCreation, isSubmitting: isPending || isRecoveringSession };
}
