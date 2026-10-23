'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import type { ActionError } from '@/lib/actions';

type ErrorTranslator = {
  (key: string): string;
  has: (key: string) => boolean;
};

type ActionErrorToastOptions = {
  title: string;
  featureErrors?: ErrorTranslator;
};

export function useActionErrorToast({
  title,
  featureErrors,
}: ActionErrorToastOptions) {
  const commonErrors = useTranslations('Common.errors');
  const isMounted = useRef(false);
  const activeToastId = useRef<ReturnType<typeof toast.error> | null>(null);

  const dismissError = useCallback(() => {
    const id = activeToastId.current;

    if (id !== null) {
      toast.dismiss(id);
      activeToastId.current = null;
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      dismissError();
    };
  }, [dismissError]);

  function showError({ errorCode, validationErrors }: ActionError) {
    if (!isMounted.current) {
      return;
    }

    const [validationMessage] = validationErrors ?? [];
    let description: string;

    if (validationMessage) {
      description = validationMessage;
    } else if (featureErrors?.has(errorCode)) {
      description = featureErrors(errorCode);
    } else if (commonErrors.has(errorCode)) {
      description = commonErrors(errorCode);
    } else {
      description = commonErrors('unknown');
    }

    dismissError();
    activeToastId.current = toast.error(title, {
      description,
      duration: Infinity,
    });
  }

  return { showError, dismissError };
}
