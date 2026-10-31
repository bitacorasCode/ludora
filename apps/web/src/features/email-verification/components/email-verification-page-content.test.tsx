import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import esMessages from '@/messages/es.json';

import { resendVerification, verifyEmail } from '../actions';
import { EmailVerificationPageContent } from './email-verification-page-content';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock('@/i18n/navigation', () => ({ Link: 'a', useRouter: () => router }));
vi.mock('../actions', () => ({
  resendVerification: vi.fn(),
  verifyEmail: vi.fn(),
}));

expect.extend(toHaveNoViolations);

const verificationId = '2cfa016c-57e0-4342-8815-2dcf33638e46';
const resendAvailableAt = '2026-10-29T12:01:00.000Z';
const messages = esMessages.EmailVerification;

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(toast, 'error').mockReturnValue('verification-error');
  vi.spyOn(toast, 'success').mockReturnValue('verification-success');
  vi.spyOn(toast, 'warning').mockReturnValue('verification-warning');
  vi.spyOn(toast, 'dismiss').mockReturnValue('verification-dismissed');
  vi.mocked(verifyEmail).mockReset();
  vi.mocked(resendVerification).mockReset();
  vi.mocked(verifyEmail).mockResolvedValue({ status: 'success', data: null });
  vi.mocked(resendVerification).mockResolvedValue({
    status: 'success',
    data: {
      verificationId,
      emailSent: true,
      resendAvailableAt,
      retryAfterSeconds: 60,
    },
  });
  window.history.replaceState(null, '', `/es/verify-email?verificationId=${verificationId}`);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('EmailVerificationPageContent integration', () => {
  function renderVerification({ initialWaitSeconds = 0, deliveryUnconfirmed = false } = {}) {
    return render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <EmailVerificationPageContent
          verificationId={verificationId}
          initialWaitSeconds={initialWaitSeconds}
          deliveryUnconfirmed={deliveryUnconfirmed}
        />
      </NextIntlClientProvider>,
    );
  }

  function enterCode(code = '123456') {
    fireEvent.change(screen.getByLabelText(messages.codeLabel), {
      target: { value: code },
    });
  }

  function submitVerification(code = '123456') {
    enterCode(code);
    fireEvent.click(screen.getByRole('button', { name: messages.submit }));
  }

  it('renders accessible code, resend, skip and login controls', async () => {
    const { container } = renderVerification();
    const code = screen.getByLabelText(messages.codeLabel);

    expect(code.getAttribute('autocomplete')).toBe('one-time-code');
    expect(code.getAttribute('inputmode')).toBe('numeric');
    expect(code.getAttribute('maxlength')).toBe('6');
    expect(document.activeElement).toBe(code);
    expect(screen.getByRole('link', { name: messages.skipToForm }).getAttribute('href'))
      .toBe('#email-verification-form');
    expect(screen.getByRole('link', { name: messages.backToLogin }).getAttribute('href'))
      .toBe('/login');
    expect(screen.getByRole('button', { name: messages.resend.action }).getAttribute('aria-describedby'))
      .toBe(screen.getByText(messages.resend.hint).id);
    expect(await axe(container)).toHaveNoViolations();
  });

  it.each([
    ['', messages.validation.codeRequired],
    ['123', messages.validation.codeInvalid],
    ['abcdef', messages.validation.codeInvalid],
  ])('rejects invalid code %j before calling the action', async (code, error) => {
    renderVerification();

    submitVerification(code);

    expect(await screen.findByText(error)).toBeTruthy();
    expect(verifyEmail).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('confirms valid codes and refreshes the authenticated profile route', async () => {
    renderVerification();

    submitVerification();

    await waitFor(() => expect(router.replace).toHaveBeenCalledExactlyOnceWith('/account/profile'));
    expect(verifyEmail).toHaveBeenCalledExactlyOnceWith('es', {
      verificationId,
      code: '123456',
    });
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(resendVerification).not.toHaveBeenCalled();
  });

  it('keeps incorrect code feedback in the field and focuses it without navigating', async () => {
    vi.mocked(verifyEmail).mockResolvedValue({
      status: 'error',
      error: { errorCode: 'AUTH_EMAIL_VERIFICATION_CODE_INVALID', statusCode: 400 },
    });
    renderVerification();

    submitVerification();

    expect(await screen.findByText(messages.errors.AUTH_EMAIL_VERIFICATION_CODE_INVALID)).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(messages.codeLabel)));
    expect(screen.getByLabelText(messages.codeLabel).getAttribute('aria-invalid')).toBe('true');
    expect(toast.error).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('translates confirmation errors in a persistent toast', async () => {
    vi.mocked(verifyEmail).mockResolvedValue({
      status: 'error',
      error: { errorCode: 'AUTH_EMAIL_VERIFICATION_EXPIRED', statusCode: 400 },
    });
    renderVerification();

    submitVerification();

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      messages.feedback.errorTitle,
      { description: messages.errors.AUTH_EMAIL_VERIFICATION_EXPIRED, duration: Infinity },
    ));
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('shows a generic error when confirmation rejects unexpectedly', async () => {
    vi.mocked(verifyEmail).mockRejectedValue(new Error('Connection interrupted'));
    renderVerification();

    submitVerification();

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      messages.feedback.errorTitle,
      { description: esMessages.Common.errors.unknown, duration: Infinity },
    ));
  });

  it('resends without a code, clears the old code and persists the server wait in the URL', async () => {
    window.history.replaceState(null, '', `${window.location.href}&delivery=unconfirmed#code`);
    renderVerification({ deliveryUnconfirmed: true });
    enterCode('123');

    fireEvent.click(screen.getByRole('button', { name: messages.resend.action }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledExactlyOnceWith(
      messages.resend.successTitle,
      { description: messages.resend.successMessage },
    ));
    expect(resendVerification).toHaveBeenCalledExactlyOnceWith('es', { verificationId });
    expect(verifyEmail).not.toHaveBeenCalled();
    expect((screen.getByLabelText(messages.codeLabel) as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('button', { name: messages.resend.action }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Podrás reenviar en 60 segundos.')).toBeTruthy();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(messages.codeLabel)));
    expect(screen.queryByText(messages.feedback.deliveryUnconfirmedTitle)).toBeNull();
    const url = new URL(window.location.href);
    expect(url.pathname).toBe('/es/verify-email');
    expect(url.searchParams.get('verificationId')).toBe(verificationId);
    expect(url.searchParams.get('resendAvailableAt')).toBe(resendAvailableAt);
    expect(url.searchParams.has('delivery')).toBe(false);
    expect(url.hash).toBe('#code');
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('warns about unconfirmed mail delivery while keeping the renewed code wait', async () => {
    vi.mocked(resendVerification).mockResolvedValue({
      status: 'success',
      data: { verificationId, emailSent: false, resendAvailableAt, retryAfterSeconds: 60 },
    });
    renderVerification();
    enterCode();

    fireEvent.click(screen.getByRole('button', { name: messages.resend.action }));

    await waitFor(() => expect(toast.warning).toHaveBeenCalledExactlyOnceWith(
      messages.feedback.deliveryUnconfirmedTitle,
      { description: messages.feedback.deliveryUnconfirmedMessage },
    ));
    expect(screen.getByRole('status').textContent).toContain(messages.feedback.deliveryUnconfirmedMessage);
    expect((screen.getByLabelText(messages.codeLabel) as HTMLInputElement).value).toBe('');
    expect(new URL(window.location.href).searchParams.get('delivery')).toBe('unconfirmed');
    expect(screen.getByRole('button', { name: messages.resend.action }).hasAttribute('disabled')).toBe(true);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('uses the server 429 wait without discarding the entered code', async () => {
    vi.mocked(resendVerification).mockResolvedValue({
      status: 'error',
      error: {
        errorCode: 'AUTH_EMAIL_VERIFICATION_RESEND_TOO_SOON',
        statusCode: 429,
        retryAfterSeconds: 25,
        retryAt: resendAvailableAt,
      },
    });
    renderVerification();
    enterCode();

    fireEvent.click(screen.getByRole('button', { name: messages.resend.action }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      messages.resend.errorTitle,
      {
        description: `${messages.errors.AUTH_EMAIL_VERIFICATION_RESEND_TOO_SOON} Podrás volver a intentarlo en 25 segundos.`,
        duration: Infinity,
      },
    ));
    expect((screen.getByLabelText(messages.codeLabel) as HTMLInputElement).value).toBe('123456');
    expect(screen.getByText('Podrás reenviar en 25 segundos.')).toBeTruthy();
    expect(screen.getByRole('button', { name: messages.resend.action }).hasAttribute('disabled')).toBe(true);
    expect(new URL(window.location.href).searchParams.get('resendAvailableAt')).toBe(resendAvailableAt);
  });

  it('preserves the code and allows another resend after a transport failure', async () => {
    vi.mocked(resendVerification).mockResolvedValue({
      status: 'error',
      error: { errorCode: 'API_UNAVAILABLE' },
    });
    renderVerification();
    enterCode();

    fireEvent.click(screen.getByRole('button', { name: messages.resend.action }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      messages.resend.errorTitle,
      { description: esMessages.Common.errors.API_UNAVAILABLE, duration: Infinity },
    ));
    expect((screen.getByLabelText(messages.codeLabel) as HTMLInputElement).value).toBe('123456');
    expect(screen.getByRole('button', { name: messages.resend.action }).hasAttribute('disabled')).toBe(false);
  });

  it('counts down the initial wait and enables resend when it ends', async () => {
    vi.useFakeTimers();
    renderVerification({ initialWaitSeconds: 2 });
    const button = screen.getByRole('button', { name: messages.resend.action });

    expect(button.hasAttribute('disabled')).toBe(true);
    fireEvent.click(button);
    expect(resendVerification).not.toHaveBeenCalled();

    await act(async () => vi.advanceTimersByTimeAsync(1_000));
    expect(screen.getByText('Podrás reenviar en 1 segundo.')).toBeTruthy();
    await act(async () => vi.advanceTimersByTimeAsync(1_000));

    expect(button.hasAttribute('disabled')).toBe(false);
    expect(screen.getByText(messages.resend.hint)).toBeTruthy();
  });

  it('prevents confirmation and duplicate resends while a resend is pending', async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof resendVerification>>>();
    vi.mocked(resendVerification).mockReturnValue(pending.promise);
    renderVerification();
    enterCode();

    fireEvent.click(screen.getByRole('button', { name: messages.resend.action }));
    const resend = await screen.findByRole('button', { name: messages.resend.pending });
    const code = screen.getByLabelText(messages.codeLabel);
    expect(resend.hasAttribute('disabled')).toBe(true);
    expect(code.closest('fieldset')?.hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('form', { name: messages.title }).getAttribute('aria-busy')).toBe('true');
    fireEvent.click(resend);
    // A synthetic submit also exercises the request guard beyond disabled controls.
    fireEvent.submit(screen.getByRole('form', { name: messages.title }));
    await act(async () => {});
    expect(resendVerification).toHaveBeenCalledOnce();
    expect(verifyEmail).not.toHaveBeenCalled();

    await act(async () => pending.resolve({
      status: 'success',
      data: { verificationId, emailSent: true, resendAvailableAt, retryAfterSeconds: 60 },
    }));
    await waitFor(() => expect(code.closest('fieldset')?.hasAttribute('disabled')).toBe(false));
  });

  it('disables resending while confirmation is pending', async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof verifyEmail>>>();
    vi.mocked(verifyEmail).mockReturnValue(pending.promise);
    renderVerification();

    submitVerification();

    const submit = await screen.findByRole('button', { name: messages.submitting });
    expect(submit.hasAttribute('disabled')).toBe(true);
    const resend = screen.getByRole('button', { name: messages.resend.action });
    expect(resend.hasAttribute('disabled')).toBe(true);
    fireEvent.click(resend);
    fireEvent.submit(screen.getByRole('form', { name: messages.title }));
    await act(async () => {});
    expect(verifyEmail).toHaveBeenCalledOnce();
    expect(resendVerification).not.toHaveBeenCalled();

    await act(async () => pending.resolve({ status: 'success', data: null }));
  });

  it('does not navigate when confirmation completes after unmounting', async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof verifyEmail>>>();
    vi.mocked(verifyEmail).mockReturnValue(pending.promise);
    const { unmount } = renderVerification();
    submitVerification();
    await waitFor(() => expect(verifyEmail).toHaveBeenCalledOnce());

    unmount();
    await act(async () => pending.resolve({ status: 'success', data: null }));

    expect(router.replace).not.toHaveBeenCalled();
    expect(router.refresh).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does not change the URL or show resend feedback after unmounting', async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof resendVerification>>>();
    vi.mocked(resendVerification).mockReturnValue(pending.promise);
    const { unmount } = renderVerification();
    fireEvent.click(screen.getByRole('button', { name: messages.resend.action }));
    await waitFor(() => expect(resendVerification).toHaveBeenCalledOnce());

    unmount();
    const previousLocation = window.location.href;
    await act(async () => pending.resolve({
      status: 'success',
      data: { verificationId, emailSent: true, resendAvailableAt, retryAfterSeconds: 60 },
    }));

    expect(window.location.href).toBe(previousLocation);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
