import { AUTH_ERROR_CODES } from '@ludora/security';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { createTranslator, NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { APP_ROUTES } from '@/config/routes';
import { OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, HTTP_STATUS } from '@/lib/api/constants';
import esMessages from '@/messages/es.json';

import { resetPassword } from '../../actions';
import { ResetPasswordPageContent } from './reset-password-page-content';

const token = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const replacementToken = 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
const newPassword = 'NewPassword123!';
const PASSWORD_RESET_SUCCESS_TOAST_ID = 'password-reset-success';
const RETRY_AFTER_SECONDS = 45;
const commonStatus = createTranslator({
  locale: 'es',
  messages: esMessages,
  namespace: 'Common.status',
});
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock('@/i18n/navigation', () => ({ Link: 'a', useRouter: () => router }));
vi.mock('../../actions', () => ({ resetPassword: vi.fn() }));

expect.extend(toHaveNoViolations);

function renderPasswordReset(nextToken: string | null = token) {
  return render(
    <NextIntlClientProvider locale='es' messages={esMessages}>
      <ResetPasswordPageContent token={nextToken} />
    </NextIntlClientProvider>,
  );
}

function submitValidPasswordReset() {
  fireEvent.change(screen.getByLabelText(esMessages.PasswordRecovery.fields.password.label), {
    target: { value: newPassword },
  });
  fireEvent.change(screen.getByLabelText(esMessages.PasswordRecovery.fields.confirmPassword.label), {
    target: { value: newPassword },
  });
  fireEvent.submit(screen.getByRole('form', {
    name: esMessages.PasswordRecovery.reset.title,
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(resetPassword).mockReset();
  vi.mocked(resetPassword).mockResolvedValue({
    status: OPERATION_STATUS.success,
    data: null,
  });
  vi.spyOn(toast, 'success').mockReturnValue(PASSWORD_RESET_SUCCESS_TOAST_ID);
  vi.spyOn(toast, 'error').mockReturnValue('password-reset-error');
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

describe('ResetPasswordPageContent integration', () => {
  it('didnt have accessibility violations', async () => {
    const { container } = render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ResetPasswordPageContent token={token} />
      </NextIntlClientProvider>,
    );

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  it('renders a skip link and a link back to login', () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ResetPasswordPageContent token={token} />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('link', { name: esMessages.PasswordRecovery.skipToForm }).getAttribute('href')).toBe('#reset-password-form');
    expect(screen.getByRole('link', { name: esMessages.PasswordRecovery.backToLogin }).getAttribute('href')).toContain('/login');
  });

  it('shows errors for a short password and empty confirmation', async () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ResetPasswordPageContent token={token} />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('Contraseña nueva'), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByText(esMessages.PasswordRecovery.validation.passwordMin)).toBeTruthy();
    expect(screen.getByText(esMessages.PasswordRecovery.validation.confirmPasswordRequired)).toBeTruthy();
  });

  it('shows the mismatch error on the confirmation field', async () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ResetPasswordPageContent token={token} />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('Contraseña nueva'), {
      target: { value: 'contraseña123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña nueva'), {
      target: { value: 'otraContraseña123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByText(esMessages.PasswordRecovery.validation.passwordMismatch)).toBeTruthy();
    expect(screen.getByLabelText('Confirmar contraseña nueva').getAttribute('aria-invalid')).toBe('true');
  });

  it('lets the user toggle password visibility with the keyboard', async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ResetPasswordPageContent token={token} />
      </NextIntlClientProvider>,
    );

    const password = screen.getByLabelText('Contraseña nueva');
    const toggle = screen.getByRole('button', { name: 'Mostrar: Contraseña nueva' });

    password.focus();
    await user.tab();
    expect(document.activeElement).toBe(toggle);
    expect(password.getAttribute('type')).toBe('password');

    await user.keyboard('{Enter}');
    expect(password.getAttribute('type')).toBe('text');
    expect(screen.getByLabelText('Confirmar contraseña nueva').getAttribute('type')).toBe('password');
  });

  it('clears the passwords, confirms success, and navigates to login', async () => {
    const { unmount } = renderPasswordReset();
    submitValidPasswordReset();

    await waitFor(() => expect(resetPassword).toHaveBeenCalledExactlyOnceWith(
      'es',
      token,
      { password: newPassword, confirmPassword: newPassword },
    ));
    await waitFor(() => expect(toast.success).toHaveBeenCalledExactlyOnceWith(
      esMessages.PasswordRecovery.reset.success.title,
      {
        id: PASSWORD_RESET_SUCCESS_TOAST_ID,
        description: esMessages.PasswordRecovery.reset.success.message,
      },
    ));
    expect(router.replace).toHaveBeenCalledExactlyOnceWith(APP_ROUTES.login);
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(toast.success).toHaveBeenCalledBefore(router.replace);
    expect((screen.getByLabelText(esMessages.PasswordRecovery.fields.password.label) as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText(esMessages.PasswordRecovery.fields.confirmPassword.label) as HTMLInputElement).value).toBe('');

    unmount();
    expect(toast.dismiss).not.toHaveBeenCalledWith(PASSWORD_RESET_SUCCESS_TOAST_ID);
  });

  it('shows a focused and accessible recovery action when the token is missing', async () => {
    const { container } = renderPasswordReset(null);

    const alert = screen.getByRole('alert', {
      name: esMessages.PasswordRecovery.reset.invalidLink.title,
    });
    expect(alert.textContent).toContain(esMessages.PasswordRecovery.errors.AUTH_PASSWORD_RESET_INVALID);
    expect(document.activeElement).toBe(screen.getByRole('region', {
      name: esMessages.PasswordRecovery.reset.invalidLink.title,
    }));
    expect(screen.getByRole('link', {
      name: esMessages.PasswordRecovery.reset.invalidLink.requestNewLink,
    }).getAttribute('href')).toBe(APP_ROUTES.forgotPassword);
    expect(screen.queryByRole('form')).toBeNull();
    expect(resetPassword).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it('replaces the form when the API rejects an expired or used recovery link', async () => {
    vi.mocked(resetPassword).mockResolvedValue({
      status: OPERATION_STATUS.error,
      error: { errorCode: AUTH_ERROR_CODES.passwordResetInvalid },
    });
    renderPasswordReset();
    submitValidPasswordReset();

    const alert = await screen.findByRole('alert', {
      name: esMessages.PasswordRecovery.reset.invalidLink.title,
    });
    expect(alert.textContent).toContain(esMessages.PasswordRecovery.errors.AUTH_PASSWORD_RESET_INVALID);
    expect(screen.queryByRole('form')).toBeNull();
    expect(screen.getByRole('link', {
      name: esMessages.PasswordRecovery.reset.invalidLink.requestNewLink,
    }).getAttribute('href')).toBe(APP_ROUTES.forgotPassword);
    expect(document.activeElement).toBe(screen.getByRole('region', {
      name: esMessages.PasswordRecovery.reset.invalidLink.title,
    }));
    expect(toast.error).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shows the form again when a rejected token is replaced', async () => {
    vi.mocked(resetPassword).mockResolvedValue({
      status: OPERATION_STATUS.error,
      error: { errorCode: AUTH_ERROR_CODES.passwordResetInvalid },
    });
    const { rerender } = renderPasswordReset();
    submitValidPasswordReset();
    await screen.findByRole('alert');

    rerender(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ResetPasswordPageContent token={replacementToken} />
      </NextIntlClientProvider>,
    );

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('form', {
      name: esMessages.PasswordRecovery.reset.title,
    })).toBeTruthy();
    expect((screen.getByLabelText(esMessages.PasswordRecovery.fields.password.label) as HTMLInputElement).value).toBe('');
  });

  it('disables fields and prevents duplicate submissions while the action is pending', async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof resetPassword>>>();
    vi.mocked(resetPassword).mockReturnValue(pending.promise);
    renderPasswordReset();
    submitValidPasswordReset();
    fireEvent.submit(screen.getByRole('form', {
      name: esMessages.PasswordRecovery.reset.title,
    }));

    await waitFor(() => expect(resetPassword).toHaveBeenCalledOnce());
    const button = await screen.findByRole('button', {
      name: esMessages.PasswordRecovery.reset.submitting,
    });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('form').getAttribute('aria-busy')).toBe('true');
    expect(
      screen.getByLabelText(esMessages.PasswordRecovery.fields.password.label)
        .closest('fieldset')?.hasAttribute('disabled'),
    ).toBe(true);

    await act(async () => pending.resolve({ status: OPERATION_STATUS.success, data: null }));
    await waitFor(() => expect(screen.getByRole('button', {
      name: esMessages.PasswordRecovery.reset.submit,
    }).hasAttribute('disabled')).toBe(false));
    expect(resetPassword).toHaveBeenCalledOnce();
  });

  it('translates API failures without navigating or clearing the password fields', async () => {
    vi.mocked(resetPassword).mockResolvedValue({
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.unavailable },
    });
    renderPasswordReset();
    submitValidPasswordReset();

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      esMessages.PasswordRecovery.reset.errorTitle,
      { description: esMessages.Common.errors.API_UNAVAILABLE, duration: Infinity },
    ));
    expect((screen.getByLabelText(esMessages.PasswordRecovery.fields.password.label) as HTMLInputElement).value).toBe(newPassword);
    expect(router.replace).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('shows the server waiting period for rate-limited password resets', async () => {
    vi.mocked(resetPassword).mockResolvedValue({
      status: OPERATION_STATUS.error,
      error: {
        errorCode: 'RATE_LIMIT_EXCEEDED',
        statusCode: HTTP_STATUS.tooManyRequests,
        retryAfterSeconds: RETRY_AFTER_SECONDS,
      },
    });
    renderPasswordReset();
    submitValidPasswordReset();

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      esMessages.PasswordRecovery.reset.errorTitle,
      {
        description: `${esMessages.Common.errors.RATE_LIMIT_EXCEEDED} ${commonStatus('retryAfter', { seconds: RETRY_AFTER_SECONDS })}`,
        duration: Infinity,
      },
    ));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shows the generic error when the action unexpectedly rejects', async () => {
    vi.mocked(resetPassword).mockRejectedValue(new Error('Unexpected action failure'));
    renderPasswordReset();
    submitValidPasswordReset();

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      esMessages.PasswordRecovery.reset.errorTitle,
      { description: esMessages.Common.errors.unknown, duration: Infinity },
    ));
    expect(router.replace).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it.each([
    { status: OPERATION_STATUS.success, data: null },
    { status: OPERATION_STATUS.error, error: { errorCode: API_ERROR_CODES.unavailable } },
  ] as const)('ignores a late result after the form unmounts: %j', async (result) => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof resetPassword>>>();
    vi.mocked(resetPassword).mockReturnValue(pending.promise);
    const { unmount } = renderPasswordReset();
    submitValidPasswordReset();
    await waitFor(() => expect(resetPassword).toHaveBeenCalledOnce());

    unmount();
    await act(async () => pending.resolve(result));

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('ignores success from an earlier token and allows the replacement token to submit', async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof resetPassword>>>();
    vi.mocked(resetPassword).mockReturnValueOnce(pending.promise);
    const { rerender } = renderPasswordReset();
    submitValidPasswordReset();
    await waitFor(() => expect(resetPassword).toHaveBeenCalledOnce());

    rerender(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ResetPasswordPageContent token={replacementToken} />
      </NextIntlClientProvider>,
    );
    await act(async () => pending.resolve({ status: OPERATION_STATUS.success, data: null }));

    expect(toast.success).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    submitValidPasswordReset();
    await waitFor(() => expect(resetPassword).toHaveBeenLastCalledWith(
      'es',
      replacementToken,
      { password: newPassword, confirmPassword: newPassword },
    ));
    await waitFor(() => expect(router.replace).toHaveBeenCalledExactlyOnceWith(APP_ROUTES.login));
  });

  it('ignores a result from the previous locale', async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof resetPassword>>>();
    vi.mocked(resetPassword).mockReturnValue(pending.promise);
    const { rerender } = renderPasswordReset();
    submitValidPasswordReset();
    await waitFor(() => expect(resetPassword).toHaveBeenCalledOnce());

    rerender(
      <NextIntlClientProvider locale='en' messages={esMessages}>
        <ResetPasswordPageContent token={token} />
      </NextIntlClientProvider>,
    );
    await act(async () => pending.resolve({ status: OPERATION_STATUS.success, data: null }));

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
