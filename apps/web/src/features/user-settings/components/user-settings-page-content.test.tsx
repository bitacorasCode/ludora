import { AUTH_ERROR_CODES } from '@ludora/security';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionBoundary } from '@/components/auth';
import { NavigationGuardProvider } from '@/components/navigation';
import { type ActionResult, OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, HTTP_STATUS } from '@/lib/api/constants';
import esMessages from '@/messages/es.json';

import { currentUser } from '../../../../test/fixtures/current-user';
import { changePassword } from '../actions';
import { UserSettingsPageContent } from './user-settings-page-content';

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => router,
}));
vi.mock('../actions', () => ({ changePassword: vi.fn() }));

const messages = esMessages.UserSettings.password;

function renderSettings() {
  render(
    <NextIntlClientProvider locale='es' messages={esMessages}>
      <NavigationGuardProvider>
        <SessionBoundary>
          <UserSettingsPageContent userId={currentUser.id} email={currentUser.email} />
        </SessionBoundary>
      </NavigationGuardProvider>
    </NextIntlClientProvider>,
  );
}

function fillPasswords() {
  fireEvent.change(screen.getByLabelText(messages.form.currentPassword), {
    target: { value: 'Current-password' },
  });
  fireEvent.change(screen.getByLabelText(messages.form.newPassword), {
    target: { value: 'New-password' },
  });
  fireEvent.change(screen.getByLabelText(messages.form.confirmPassword), {
    target: { value: 'New-password' },
  });
}

beforeEach(() => {
  vi.mocked(changePassword).mockReset().mockResolvedValue({ status: OPERATION_STATUS.success, data: null });
  router.refresh.mockReset();
  vi.spyOn(toast, 'success').mockReturnValue('password-changed');
  vi.spyOn(toast, 'error').mockReturnValue('password-change-error');
  vi.spyOn(toast, 'dismiss').mockReturnValue('password-change-error');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('UserSettingsPageContent', () => {
  it('shows the signed-in email without an edit control and opens an enabled password editor', () => {
    renderSettings();

    expect(screen.getByText(currentUser.email)).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: messages.change }));

    expect(screen.getByRole('form', { name: messages.form.title })).toBeTruthy();
    expect(screen.getByLabelText(messages.form.currentPassword).getAttribute('type')).toBe('password');
    expect(screen.getByLabelText(messages.form.currentPassword).getAttribute('autocomplete')).toBe('current-password');
    expect(document.activeElement).toBe(screen.getByLabelText(messages.form.currentPassword));
  });

  it('validates required fields and password confirmation before submitting', async () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: messages.change }));
    fireEvent.click(screen.getByRole('button', { name: messages.form.submit }));

    expect(await screen.findByText(messages.validation.currentPasswordRequired)).toBeTruthy();
    expect(screen.getByText(messages.validation.confirmPasswordRequired)).toBeTruthy();
    expect(changePassword).not.toHaveBeenCalled();

    fillPasswords();
    fireEvent.change(screen.getByLabelText(messages.form.confirmPassword), { target: { value: 'Different-password' } });
    fireEvent.click(screen.getByRole('button', { name: messages.form.submit }));

    expect(await screen.findByText(messages.validation.passwordMismatch)).toBeTruthy();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('keeps incorrect-current-password feedback in the form without recovering the session', async () => {
    vi.mocked(changePassword).mockResolvedValue({
      status: OPERATION_STATUS.error,
      error: { errorCode: AUTH_ERROR_CODES.currentPasswordInvalid, statusCode: HTTP_STATUS.badRequest },
    });
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: messages.change }));
    fillPasswords();
    fireEvent.click(screen.getByRole('button', { name: messages.form.submit }));

    expect(await screen.findByText(messages.errors.AUTH_CURRENT_PASSWORD_INVALID)).toBeTruthy();
    expect(screen.getByLabelText(messages.form.newPassword)).toHaveProperty('value', 'New-password');
    expect(document.activeElement).toBe(screen.getByLabelText(messages.form.currentPassword));
    expect(router.refresh).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('waits for the server and closes the cleared editor after success', async () => {
    let resolve!: (result: ActionResult) => void;
    const pending = new Promise<ActionResult>((finish) => { resolve = finish; });
    vi.mocked(changePassword).mockReturnValue(pending);
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: messages.change }));
    fillPasswords();
    fireEvent.click(screen.getByRole('button', { name: messages.form.submit }));

    await waitFor(() => expect(changePassword).toHaveBeenCalledExactlyOnceWith('es', currentUser.id, {
      currentPassword: 'Current-password',
      newPassword: 'New-password',
      confirmPassword: 'New-password',
    }));
    expect(screen.getByRole('button', { name: messages.form.submitting }).matches(':disabled')).toBe(true);
    expect(toast.success).not.toHaveBeenCalled();

    await act(async () => {
      resolve({ status: OPERATION_STATUS.success, data: null });
      await pending;
    });

    expect(screen.queryByRole('form')).toBeNull();
    expect(toast.success).toHaveBeenCalledExactlyOnceWith(messages.form.success, { id: 'password-changed' });
    expect(router.refresh).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: messages.change }));
    expect(screen.getByLabelText(messages.form.currentPassword)).toHaveProperty('value', '');
    expect(screen.getByLabelText(messages.form.newPassword)).toHaveProperty('value', '');
    expect(screen.getByLabelText(messages.form.confirmPassword)).toHaveProperty('value', '');
  });

  it('asks before cancelling a dirty password form and preserves values when continuing', async () => {
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: messages.change }));
    fillPasswords();
    fireEvent.click(screen.getByRole('button', { name: esMessages.Common.actions.cancel }));

    expect(screen.getByRole('alertdialog', { name: esMessages.Common.unsavedChanges.title })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: esMessages.Common.unsavedChanges.cancel }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByLabelText(messages.form.newPassword)).toHaveProperty('value', 'New-password');

    fireEvent.click(screen.getByRole('button', { name: esMessages.Common.actions.cancel }));
    fireEvent.click(screen.getByRole('button', { name: esMessages.Common.unsavedChanges.confirm }));
    await waitFor(() => expect(screen.queryByRole('form')).toBeNull());
    expect(changePassword).not.toHaveBeenCalled();
  });

  it('rechecks an expired session without replaying the password change or showing an error toast', async () => {
    vi.mocked(changePassword).mockResolvedValue({
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.authenticationRequired, statusCode: HTTP_STATUS.unauthorized },
    });
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: messages.change }));
    fillPasswords();
    fireEvent.click(screen.getByRole('button', { name: messages.form.submit }));

    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole('button', { name: messages.form.submit }).matches(':disabled')).toBe(false));
    expect(changePassword).toHaveBeenCalledOnce();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('preserves the form after a network failure and uses the existing error toast', async () => {
    vi.mocked(changePassword).mockResolvedValue({
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.unavailable },
    });
    renderSettings();
    fireEvent.click(screen.getByRole('button', { name: messages.change }));
    fillPasswords();
    fireEvent.click(screen.getByRole('button', { name: messages.form.submit }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledOnce());
    expect(screen.getByLabelText(messages.form.newPassword)).toHaveProperty('value', 'New-password');
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
