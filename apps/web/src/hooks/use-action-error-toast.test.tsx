import { act, cleanup, renderHook } from '@testing-library/react';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ActionError } from '@/lib/actions';
import { API_ERROR_CODES, HTTP_STATUS } from '@/lib/api/constants';
import esMessages from '@/messages/es.json';

import { useActionErrorToast } from './use-action-error-toast';

const title = esMessages.EmailVerification.feedback.errorTitle;
const rateLimitError = {
  errorCode: 'RATE_LIMIT_EXCEEDED',
  statusCode: HTTP_STATUS.tooManyRequests,
} as const satisfies ActionError;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(toast, 'error').mockReturnValue('action-error');
  vi.spyOn(toast, 'dismiss').mockReturnValue('dismissed-error');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useActionErrorToast', () => {
  function renderErrorToast() {
    return renderHook(() => {
      const featureErrors = useTranslations('EmailVerification.errors');

      return useActionErrorToast({ title, featureErrors });
    }, {
      wrapper: ({ children }: { children: ReactNode }) => (
        <NextIntlClientProvider locale='es' messages={esMessages}>
          {children}
        </NextIntlClientProvider>
      ),
    });
  }

  it.each([
    { seconds: 1, wait: 'Podrás volver a intentarlo en 1 segundo.' },
    { seconds: 42, wait: 'Podrás volver a intentarlo en 42 segundos.' },
  ])('translates the rate limit and its waiting time of $seconds seconds', ({ seconds, wait }) => {
    const { result } = renderErrorToast();

    act(() => result.current.showError({ ...rateLimitError, retryAfterSeconds: seconds }));

    expect(toast.error).toHaveBeenCalledExactlyOnceWith(title, {
      description: `${esMessages.Common.errors.RATE_LIMIT_EXCEEDED} ${wait}`,
      duration: Infinity,
    });
  });

  it.each([undefined, 0, -1, 1.5, Number.NaN, Infinity])(
    'omits an absent or invalid waiting time: %s',
    (retryAfterSeconds) => {
      const { result } = renderErrorToast();

      act(() => result.current.showError({ ...rateLimitError, retryAfterSeconds }));

      expect(toast.error).toHaveBeenCalledExactlyOnceWith(title, {
        description: esMessages.Common.errors.RATE_LIMIT_EXCEEDED,
        duration: Infinity,
      });
    },
  );

  it.each([undefined, HTTP_STATUS.unauthorized])(
    'omits the waiting time when the status is not 429: %s',
    (statusCode) => {
      const { result } = renderErrorToast();

      act(() => result.current.showError({ ...rateLimitError, statusCode, retryAfterSeconds: 42 }));

      expect(toast.error).toHaveBeenCalledExactlyOnceWith(title, {
        description: esMessages.Common.errors.RATE_LIMIT_EXCEEDED,
        duration: Infinity,
      });
    },
  );

  it('keeps a feature error message when appending the server waiting time', () => {
    const { result } = renderErrorToast();

    act(() => result.current.showError({
      errorCode: 'AUTH_EMAIL_VERIFICATION_RESEND_TOO_SOON',
      statusCode: HTTP_STATUS.tooManyRequests,
      retryAfterSeconds: 25,
    }));

    expect(toast.error).toHaveBeenCalledExactlyOnceWith(title, {
      description: `${esMessages.EmailVerification.errors.AUTH_EMAIL_VERIFICATION_RESEND_TOO_SOON} Podrás volver a intentarlo en 25 segundos.`,
      duration: Infinity,
    });
  });

  it('keeps the first validation message ahead of catalog messages', () => {
    const { result } = renderErrorToast();
    const validationMessage = 'Revisa los datos del formulario.';

    act(() => result.current.showError({
      errorCode: API_ERROR_CODES.unavailable,
      validationErrors: [validationMessage, 'Otro error de validación.'],
    }));

    expect(toast.error).toHaveBeenCalledExactlyOnceWith(title, {
      description: validationMessage,
      duration: Infinity,
    });
  });

  it('falls back to the common message when there are no validation errors', () => {
    const { result } = renderErrorToast();

    act(() => result.current.showError({
      errorCode: API_ERROR_CODES.unavailable,
      validationErrors: [],
    }));

    expect(toast.error).toHaveBeenCalledExactlyOnceWith(title, {
      description: esMessages.Common.errors.API_UNAVAILABLE,
      duration: Infinity,
    });
  });

  it('shows the generic fallback for an unknown error code', () => {
    const { result } = renderErrorToast();

    act(() => result.current.showError({ errorCode: 'UNKNOWN_ERROR_CODE' }));

    expect(toast.error).toHaveBeenCalledExactlyOnceWith(title, {
      description: esMessages.Common.errors.unknown,
      duration: Infinity,
    });
  });

  it('dismisses the previous toast before showing a new error', () => {
    vi.mocked(toast.error).mockReturnValueOnce('first-error').mockReturnValueOnce('second-error');
    const { result } = renderErrorToast();

    act(() => result.current.showError(rateLimitError));
    act(() => result.current.showError({ errorCode: API_ERROR_CODES.unavailable }));

    expect(toast.error).toHaveBeenCalledTimes(2);
    expect(toast.dismiss).toHaveBeenCalledExactlyOnceWith('first-error');
  });

  it('allows explicitly dismissing an error without dismissing it twice', () => {
    const { result } = renderErrorToast();
    act(() => result.current.showError(rateLimitError));

    act(() => result.current.dismissError());
    act(() => result.current.dismissError());

    expect(toast.dismiss).toHaveBeenCalledExactlyOnceWith('action-error');
  });

  it('dismisses the active toast on unmount and ignores late errors', () => {
    const { result, unmount } = renderErrorToast();
    const showError = result.current.showError;
    act(() => showError(rateLimitError));

    unmount();
    act(() => showError(rateLimitError));

    expect(toast.error).toHaveBeenCalledOnce();
    expect(toast.dismiss).toHaveBeenCalledExactlyOnceWith('action-error');
  });

  it('does not dismiss any toast when unmounting without an error', () => {
    const { unmount } = renderErrorToast();

    unmount();

    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.dismiss).not.toHaveBeenCalled();
  });
});
