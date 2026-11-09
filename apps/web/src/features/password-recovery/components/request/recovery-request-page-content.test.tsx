import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { createTranslator, NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, HTTP_STATUS } from '@/lib/api/constants';
import esMessages from '@/messages/es.json';

import { requestPasswordRecovery } from '../../actions';
import { RecoveryRequestPageContent } from './recovery-request-page-content';

vi.mock('@/i18n/navigation', () => ({ Link: 'a' }));
vi.mock('../../actions', () => ({ requestPasswordRecovery: vi.fn() }));

expect.extend(toHaveNoViolations);

const validEmail = 'player@example.com';
const RETRY_AFTER_SECONDS = 45;
const commonStatus = createTranslator({
  locale: 'es',
  messages: esMessages,
  namespace: 'Common.status',
});

function renderRecoveryRequest() {
  return render(
    <NextIntlClientProvider locale='es' messages={esMessages}>
      <RecoveryRequestPageContent />
    </NextIntlClientProvider>,
  );
}

function submitValidRecoveryRequest() {
  fireEvent.change(screen.getByLabelText(esMessages.PasswordRecovery.fields.email.label), {
    target: { value: validEmail },
  });
  fireEvent.submit(screen.getByRole('form', {
    name: esMessages.PasswordRecovery.request.title,
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requestPasswordRecovery).mockReset();
  vi.mocked(requestPasswordRecovery).mockResolvedValue({
    status: OPERATION_STATUS.success,
    data: null,
  });
  vi.spyOn(toast, 'success').mockReturnValue('recovery-request-success');
  vi.spyOn(toast, 'error').mockReturnValue('recovery-request-error');
  vi.spyOn(toast, 'dismiss').mockImplementation((id) => id ?? 'all-toasts');
});

beforeAll(() => {
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {};
  }
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('RecoveryRequestPageContent integration', () => {
  it('didnt have accessibility violations', async () => {
    const { container } = render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <RecoveryRequestPageContent />
      </NextIntlClientProvider>,
    );

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  it('renders a skip link and a link back to login', () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <RecoveryRequestPageContent />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('link', { name: esMessages.PasswordRecovery.skipToForm }).getAttribute('href')).toBe('#recovery-request-form');
    expect(screen.getByRole('link', { name: esMessages.PasswordRecovery.backToLogin }).getAttribute('href')).toContain('/login');
  });

  it('shows an email error without requesting recovery for invalid data', async () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <RecoveryRequestPageContent />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', {
      name: esMessages.PasswordRecovery.request.submit,
    }));

    expect(await screen.findByText(esMessages.PasswordRecovery.validation.emailInvalid)).toBeTruthy();
    expect(requestPasswordRecovery).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('requests recovery and shows generic feedback when the request is accepted', async () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <RecoveryRequestPageContent />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'juan@example.com' },
    });
    fireEvent.click(screen.getByRole('button', {
      name: esMessages.PasswordRecovery.request.submit,
    }));

    await waitFor(() => expect(requestPasswordRecovery).toHaveBeenCalledExactlyOnceWith(
      'es',
      { email: 'juan@example.com' },
    ));
    await waitFor(() => expect(toast.success).toHaveBeenCalledExactlyOnceWith(
      esMessages.PasswordRecovery.request.success.title,
      {
        id: 'recovery-request-success',
        description: esMessages.PasswordRecovery.request.success.message,
      },
    ));

    await waitFor(() => expect(
      screen.getByRole('button', {
        name: esMessages.PasswordRecovery.request.submit,
      }).hasAttribute('disabled'),
    ).toBe(false));

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'not-an-email' },
    });
    expect(requestPasswordRecovery).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledOnce();
  });

  it('disables the form and prevents duplicate submissions while the action is pending', async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof requestPasswordRecovery>>>();
    vi.mocked(requestPasswordRecovery).mockReturnValue(pending.promise);
    renderRecoveryRequest();
    submitValidRecoveryRequest();
    fireEvent.submit(screen.getByRole('form', {
      name: esMessages.PasswordRecovery.request.title,
    }));

    await waitFor(() => expect(requestPasswordRecovery).toHaveBeenCalledOnce());
    const button = await screen.findByRole('button', {
      name: esMessages.PasswordRecovery.request.submitting,
    });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('form').getAttribute('aria-busy')).toBe('true');
    expect(
      screen.getByLabelText(esMessages.PasswordRecovery.fields.email.label)
        .closest('fieldset')?.hasAttribute('disabled'),
    ).toBe(true);

    await act(async () => pending.resolve({ status: OPERATION_STATUS.success, data: null }));
    await waitFor(() => expect(screen.getByRole('button', {
      name: esMessages.PasswordRecovery.request.submit,
    }).hasAttribute('disabled')).toBe(false));
    expect(requestPasswordRecovery).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledOnce();
  });

  it('translates API failures and keeps the error visible while editing', async () => {
    vi.mocked(requestPasswordRecovery).mockResolvedValue({
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.unavailable },
    });
    renderRecoveryRequest();
    submitValidRecoveryRequest();

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      esMessages.PasswordRecovery.request.errorTitle,
      {
        description: esMessages.Common.errors.API_UNAVAILABLE,
        duration: Infinity,
      },
    ));
    fireEvent.change(screen.getByLabelText(esMessages.PasswordRecovery.fields.email.label), {
      target: { value: 'another@example.com' },
    });
    expect(toast.dismiss).not.toHaveBeenCalledWith('recovery-request-error');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('includes the server waiting period in the translated rate limit error', async () => {
    vi.mocked(requestPasswordRecovery).mockResolvedValue({
      status: OPERATION_STATUS.error,
      error: {
        errorCode: 'RATE_LIMIT_EXCEEDED',
        statusCode: HTTP_STATUS.tooManyRequests,
        retryAfterSeconds: RETRY_AFTER_SECONDS,
      },
    });
    renderRecoveryRequest();
    submitValidRecoveryRequest();

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      esMessages.PasswordRecovery.request.errorTitle,
      {
        description: `${esMessages.Common.errors.RATE_LIMIT_EXCEEDED} ${commonStatus('retryAfter', { seconds: RETRY_AFTER_SECONDS })}`,
        duration: Infinity,
      },
    ));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows the generic error when the action unexpectedly rejects', async () => {
    vi.mocked(requestPasswordRecovery).mockRejectedValue(new Error('Unexpected action failure'));
    renderRecoveryRequest();
    submitValidRecoveryRequest();

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      esMessages.PasswordRecovery.request.errorTitle,
      { description: esMessages.Common.errors.unknown, duration: Infinity },
    ));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it.each([
    { status: OPERATION_STATUS.success, data: null },
    { status: OPERATION_STATUS.error, error: { errorCode: API_ERROR_CODES.unavailable } },
  ] as const)('ignores a late result after the form unmounts: %j', async (result) => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof requestPasswordRecovery>>>();
    vi.mocked(requestPasswordRecovery).mockReturnValue(pending.promise);
    const { unmount } = renderRecoveryRequest();
    submitValidRecoveryRequest();
    await waitFor(() => expect(requestPasswordRecovery).toHaveBeenCalledOnce());

    unmount();
    await act(async () => pending.resolve(result));

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('ignores a result from the previous locale', async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof requestPasswordRecovery>>>();
    vi.mocked(requestPasswordRecovery).mockReturnValue(pending.promise);
    const { rerender } = renderRecoveryRequest();
    submitValidRecoveryRequest();
    await waitFor(() => expect(requestPasswordRecovery).toHaveBeenCalledOnce());

    rerender(
      <NextIntlClientProvider locale='en' messages={esMessages}>
        <RecoveryRequestPageContent />
      </NextIntlClientProvider>,
    );
    await act(async () => pending.resolve({ status: OPERATION_STATUS.success, data: null }));

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });
});
