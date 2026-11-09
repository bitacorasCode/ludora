import esMessages from '../src/messages/es.json';
import { API_URL, expect, SESSION_COOKIE, test } from './fixtures/auth';
import { waitForPasswordChangedEmail, waitForPasswordResetEmail } from './fixtures/mailpit';

// Password controls and session responses must not appear in browser artifacts.
test.use({ trace: 'off', screenshot: 'off' });

test.describe('Account settings', () => {
  test('shows the private email without an edit control and the nickname in the header', async ({
    page,
    testAccount,
  }) => {
    await page.goto('/es/account/settings');

    await expect(page.getByRole('heading', { level: 1 }))
      .toHaveText(esMessages.UserSettings.title);
    await expect(page.getByText(testAccount.email, { exact: true })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toHaveCount(0);
    await expect(page.getByRole('button', {
      name: esMessages.UserSettings.password.change,
      exact: true,
    })).toBeEnabled();

    const accountLink = page.locator('header').getByRole('link', {
      name: testAccount.nickname,
      exact: true,
    });
    await expect(accountLink).toHaveAttribute('href', '/es/account/profile');
    await expect(accountLink.locator('[data-slot="avatar"]')).toHaveAttribute('data-size', 'sm');
    await expect(accountLink.locator('[data-slot="avatar-fallback"]'))
      .toHaveText(testAccount.nickname.charAt(0).toUpperCase());
  });

  test('confirms discarding password edits without changing the session', async ({
    page,
    context,
    testAccount,
  }) => {
    const originalSession = (await context.cookies()).find(
      ({ name }) => name === SESSION_COOKIE,
    )?.value;
    await page.goto('/es/account/settings');
    await page.getByRole('button', {
      name: esMessages.UserSettings.password.change,
      exact: true,
    }).click();
    const form = page.getByRole('form', {
      name: esMessages.UserSettings.password.form.title,
    });
    await form.getByLabel(esMessages.UserSettings.password.form.currentPassword, { exact: true })
      .fill(testAccount.password);
    await form.getByRole('button', { name: esMessages.Common.actions.cancel, exact: true }).click();

    const confirmation = page.getByRole('alertdialog', {
      name: esMessages.Common.unsavedChanges.title,
    });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', {
      name: esMessages.Common.unsavedChanges.cancel,
    }).click();
    await expect(form).toBeVisible();

    await form.getByRole('button', { name: esMessages.Common.actions.cancel, exact: true }).click();
    await confirmation.getByRole('button', {
      name: esMessages.Common.unsavedChanges.confirm,
    }).click();
    await expect(form).toHaveCount(0);
    const currentSession = (await context.cookies()).find(
      ({ name }) => name === SESSION_COOKIE,
    )?.value;
    expect(currentSession === originalSession, 'Discarding edits must not change the session').toBe(true);
  });

  test('checks the current password, rotates the session and revokes older tokens', async ({
    page,
    context,
    request,
    testAccount,
  }) => {
    // Playwright loads this spec as CommonJS; the shared package is ESM-only.
    const { AUTH_ERROR_CODES } = await import('@ludora/security');
    const originalSession = (await context.cookies()).find(
      ({ name }) => name === SESSION_COOKIE,
    )?.value;
    expect(Boolean(originalSession), 'An authenticated session is required').toBe(true);
    const newPassword = `${testAccount.password}-updated`;
    let attemptedChange = false;

    try {
      const requestedReset = await request.post(`${API_URL}/auth/forgot-password`, {
        data: { email: testAccount.email },
      });
      expect(requestedReset.status()).toBe(202);
      const pendingReset = await waitForPasswordResetEmail(request, testAccount.email);

      await page.goto('/es/account/settings');
      await page.getByRole('button', {
        name: esMessages.UserSettings.password.change,
        exact: true,
      }).click();
      const form = page.getByRole('form', {
        name: esMessages.UserSettings.password.form.title,
      });
      const currentPassword = form.getByLabel(
        esMessages.UserSettings.password.form.currentPassword,
        { exact: true },
      );
      await currentPassword.fill('incorrect-current-password');
      await form.getByLabel(esMessages.UserSettings.password.form.newPassword, { exact: true })
        .fill(newPassword);
      await form.getByLabel(esMessages.UserSettings.password.form.confirmPassword, { exact: true })
        .fill(newPassword);
      await form.getByRole('button', {
        name: esMessages.UserSettings.password.form.submit,
        exact: true,
      }).click();

      await expect(form.getByText(
        esMessages.UserSettings.password.errors.AUTH_CURRENT_PASSWORD_INVALID,
        { exact: true },
      )).toBeVisible();
      await expect(page).toHaveURL('/es/account/settings');
      const rejectedSession = (await context.cookies()).find(
        ({ name }) => name === SESSION_COOKIE,
      )?.value;
      expect(rejectedSession === originalSession, 'An incorrect password must not replace the session').toBe(true);

      await currentPassword.fill(testAccount.password);
      attemptedChange = true;
      await form.getByRole('button', {
        name: esMessages.UserSettings.password.form.submit,
        exact: true,
      }).click();
      await expect(page.getByText(esMessages.UserSettings.password.form.success, { exact: true }))
        .toBeVisible();
      await expect(form).toHaveCount(0);
      await expect(page).toHaveURL('/es/account/settings');
      const session = (await context.cookies()).find(
        ({ name }) => name === SESSION_COOKIE,
      );
      expect(session).toMatchObject({ httpOnly: true, sameSite: 'Lax' });
      expect(session?.value !== originalSession, 'Password changes must issue a new access token').toBe(true);

      const oldSession = await request.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${originalSession}` },
      });
      expect(oldSession.status()).toBe(401);
      const currentUser = await request.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${session?.value}` },
      });
      expect(currentUser.status()).toBe(200);
      expect((await currentUser.json()).user.id).toBe(testAccount.id);

      const previousReset = await request.post(`${API_URL}/auth/reset-password`, {
        data: { token: pendingReset.url.searchParams.get('token'), password: newPassword },
      });
      expect(previousReset.status()).toBe(400);
      expect((await previousReset.json()).errorCode).toBe(AUTH_ERROR_CODES.passwordResetInvalid);
      const notice = await waitForPasswordChangedEmail(request, testAccount.email);
      expect(notice.text).toContain('Your previous sessions are no longer valid.');

      const oldCredentials = await request.post(`${API_URL}/auth/login`, {
        data: { email: testAccount.email, password: testAccount.password },
      });
      expect(oldCredentials.status()).toBe(401);
      const newCredentials = await request.post(`${API_URL}/auth/login`, {
        data: { email: testAccount.email, password: newPassword },
      });
      expect(newCredentials.status()).toBe(200);
      await page.reload();
      await expect(page.getByText(testAccount.email, { exact: true })).toBeVisible();
      await expect(page.locator('header').getByRole('link', {
        name: testAccount.nickname,
        exact: true,
      })).toBeVisible();
    } finally {
      // Restore only this worker's temporary account for the remaining suites.
      if (attemptedChange) {
        const login = await request.post(`${API_URL}/auth/login`, {
          data: { email: testAccount.email, password: newPassword },
        });
        if (login.ok()) {
          const { accessToken } = await login.json();
          const restored = await request.post(`${API_URL}/auth/change-password`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            data: { currentPassword: newPassword, password: testAccount.password },
          });
          expect(restored.status(), 'Restore the temporary account password').toBe(200);
          const restoredSession = await restored.json();
          expect(restoredSession.user.id).toBe(testAccount.id);
          expect(typeof restoredSession.accessToken === 'string', 'The restored session must include a token').toBe(true);
          testAccount.accessToken = restoredSession.accessToken;
        }
      }
    }
  });
});
