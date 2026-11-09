import { randomUUID } from 'node:crypto';

import type { Page } from '@playwright/test';
import { z } from 'zod';

import esMessages from '../src/messages/es.json';
import {
  API_URL,
  expect,
  expirePasswordReset,
  SESSION_COOKIE,
  test as base,
} from './fixtures/auth';
import { fillLogin } from './fixtures/login';
import {
  findAccountEmails,
  PASSWORD_CHANGED_SUBJECT,
  waitForPasswordChangedEmail,
  waitForPasswordResetEmail,
  waitForVerificationEmail,
} from './fixtures/mailpit';

const RECOVERY_FLOW_TIMEOUT_MS = 90_000;
const FORM_INTERACTION_TIMEOUT_MS = 15_000;
const RESPONSE_STATUS = { ok: 200, badRequest: 400, unauthorized: 401 } as const;
const authResponseSchema = z.object({ accessToken: z.string().min(1) });

type RecoveryAccount = {
  id: string;
  email: string;
  nickname: string;
  password: string;
  accessToken: string;
};

const test = base.extend<{ recoveryAccount: RecoveryAccount }>({
  recoveryAccount: async ({ request, pendingAccount }, provide) => {
    const { code } = await waitForVerificationEmail(request, pendingAccount.email);
    const response = await request.post(`${API_URL}/auth/verify-email`, {
      data: { verificationId: pendingAccount.verificationId, code },
    });
    expect(response.status()).toBe(RESPONSE_STATUS.ok);
    const { accessToken } = authResponseSchema.parse(await response.json());
    await provide({ ...pendingAccount, accessToken });
  },
});

// Credentials and email links must stay out of browser traces and screenshots.
test.use({ trace: 'off', screenshot: 'off' });
test.setTimeout(RECOVERY_FLOW_TIMEOUT_MS);

async function requestRecovery(page: Page, email: string) {
  await page.goto('/es/forgot-password');
  const input = page.getByLabel(esMessages.PasswordRecovery.fields.email.label, { exact: true });

  // An actual validation interaction confirms that React has hydrated the form.
  await expect.poll(async () => {
    await input.fill('not-an-email');
    await input.press('Tab');
    return page.getByText(esMessages.PasswordRecovery.validation.emailInvalid, {
      exact: true,
    }).isVisible();
  }, { timeout: FORM_INTERACTION_TIMEOUT_MS }).toBe(true);

  await input.fill(email);
  await expect(page.getByText(esMessages.PasswordRecovery.validation.emailInvalid, {
    exact: true,
  })).toHaveCount(0);
  await page.getByRole('button', {
    name: esMessages.PasswordRecovery.request.submit,
    exact: true,
  }).click();
  await expect(page.getByText(esMessages.PasswordRecovery.request.success.title, {
    exact: true,
  })).toBeVisible();
}

async function openRecoveryLink(page: Page, emailUrl: URL) {
  const url = new URL(emailUrl.pathname + emailUrl.search, page.url());

  try {
    await page.goto(url.href);
  } catch {
    throw new Error('The temporary password reset page could not be opened.');
  }
}

async function submitPassword(page: Page, password: string) {
  const input = page.getByLabel(esMessages.PasswordRecovery.fields.password.label, { exact: true });
  const show = `${esMessages.FormTextField.show}: ${esMessages.PasswordRecovery.fields.password.label}`;
  const hide = `${esMessages.FormTextField.hide}: ${esMessages.PasswordRecovery.fields.password.label}`;

  await expect.poll(async () => {
    if (await input.getAttribute('type') === 'password') {
      await page.getByRole('button', { name: show, exact: true }).click();
    }
    return input.getAttribute('type');
  }, { timeout: FORM_INTERACTION_TIMEOUT_MS }).toBe('text');
  await page.getByRole('button', { name: hide, exact: true }).click();
  await input.fill(password);
  await page.getByLabel(esMessages.PasswordRecovery.fields.confirmPassword.label, {
    exact: true,
  }).fill(password);
  await page.getByRole('button', {
    name: esMessages.PasswordRecovery.reset.submit,
    exact: true,
  }).click();
}

test.describe('Password recovery with real mail', () => {
  test('changes the password, sends a notice, revokes old sessions and rejects reuse', async ({
    page,
    context,
    request,
    baseURL,
    recoveryAccount,
  }) => {
    const { accessToken, email, password: previousPassword } = recoveryAccount;
    const currentSession = await request.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(currentSession.status()).toBe(RESPONSE_STATUS.ok);
    await context.addCookies([{
      name: SESSION_COOKIE,
      value: accessToken,
      url: baseURL!,
      httpOnly: true,
      sameSite: 'Lax',
    }]);

    await requestRecovery(page, email);
    const recovery = await waitForPasswordResetEmail(request, email);
    await openRecoveryLink(page, recovery.url);
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    const newPassword = `Recovered-${randomUUID()}`;
    await page.evaluate(() => {
      (window as Window & { recoveryNavigation?: boolean }).recoveryNavigation = true;
    });
    await submitPassword(page, newPassword);
    await expect.poll(() => new URL(page.url()).pathname).toBe('/es/login');
    await expect(page.getByText(esMessages.PasswordRecovery.reset.success.title, {
      exact: true,
    })).toBeVisible();
    expect(await page.evaluate(() =>
      (window as Window & { recoveryNavigation?: boolean }).recoveryNavigation,
    )).toBe(true);
    expect((await context.cookies()).some(({ name }) => name === SESSION_COOKIE)).toBe(false);

    const notice = await waitForPasswordChangedEmail(request, email);
    expect(notice.text.includes(previousPassword)).toBe(false);
    expect(notice.text.includes(newPassword)).toBe(false);
    expect(notice.text.includes(recovery.url.searchParams.get('token')!)).toBe(false);
    expect(notice.text).toContain('Your previous sessions are no longer valid.');

    const revoked = await request.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(revoked.status()).toBe(RESPONSE_STATUS.unauthorized);
    await fillLogin(page, email, previousPassword);
    await expect(page.getByRole('form', {
      name: esMessages.Login.title,
      exact: true,
    }).getByRole('alert')).toContainText(
      esMessages.Login.errors.AUTH_INVALID_CREDENTIALS,
    );
    await fillLogin(page, email, newPassword);
    await expect.poll(() => new URL(page.url()).pathname).toBe('/es');
    const newSession = (await context.cookies()).find(({ name }) => name === SESSION_COOKIE);
    expect(newSession?.httpOnly).toBe(true);
    const authenticated = await request.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${newSession!.value}` },
    });
    expect(authenticated.status()).toBe(RESPONSE_STATUS.ok);

    await openRecoveryLink(page, recovery.url);
    await submitPassword(page, `Reuse-${randomUUID()}`);
    await expect(page.getByRole('alert', {
      name: esMessages.PasswordRecovery.reset.invalidLink.title,
      exact: true,
    })).toContainText(
      esMessages.PasswordRecovery.errors.AUTH_PASSWORD_RESET_INVALID,
    );
    await expect(page.getByRole('link', {
      name: esMessages.PasswordRecovery.reset.invalidLink.requestNewLink,
      exact: true,
    })).toBeVisible();
    expect((await context.cookies()).some(({ name, value }) =>
      name === SESSION_COOKIE && value === newSession!.value,
    )).toBe(true);
  });

  test('rejects an expired link without changing the password or invalidating its session', async ({
    page,
    request,
    recoveryAccount,
  }) => {
    await requestRecovery(page, recoveryAccount.email);
    const recovery = await waitForPasswordResetEmail(request, recoveryAccount.email);
    await expirePasswordReset(recoveryAccount);
    await openRecoveryLink(page, recovery.url);
    await submitPassword(page, `Expired-${randomUUID()}`);
    await expect(page.getByRole('alert', {
      name: esMessages.PasswordRecovery.reset.invalidLink.title,
      exact: true,
    })).toContainText(
      esMessages.PasswordRecovery.errors.AUTH_PASSWORD_RESET_INVALID,
    );
    const login = await request.post(`${API_URL}/auth/login`, {
      data: { email: recoveryAccount.email, password: recoveryAccount.password },
    });
    expect(login.status()).toBe(RESPONSE_STATUS.ok);
    const session = await request.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${recoveryAccount.accessToken}` },
    });
    expect(session.status()).toBe(RESPONSE_STATUS.ok);
  });

  test('allows exactly one concurrent consumption and sends one notice', async ({
    request,
    recoveryAccount,
  }) => {
    // Playwright loads these tests as CommonJS; this package exposes ESM only.
    const { AUTH_ERROR_CODES } = await import('@ludora/security');
    const requested = await request.post(`${API_URL}/auth/forgot-password`, {
      data: { email: recoveryAccount.email },
    });
    expect(await requested.json()).toEqual({ accepted: true });
    const recovery = await waitForPasswordResetEmail(request, recoveryAccount.email);
    const passwords = [`First-${randomUUID()}`, `Second-${randomUUID()}`];
    const responses = await Promise.all(passwords.map(password =>
      request.post(`${API_URL}/auth/reset-password`, {
        data: { token: recovery.url.searchParams.get('token'), password },
      }),
    ));
    expect(responses.map(response => response.status()).sort()).toEqual([
      RESPONSE_STATUS.ok, RESPONSE_STATUS.badRequest,
    ]);
    const rejected = responses.find(response => response.status() === RESPONSE_STATUS.badRequest)!;
    expect((await rejected.json()).errorCode).toBe(AUTH_ERROR_CODES.passwordResetInvalid);
    const winner = responses.findIndex(response => response.status() === RESPONSE_STATUS.ok);
    const login = await request.post(`${API_URL}/auth/login`, {
      data: { email: recoveryAccount.email, password: passwords[winner] },
    });
    expect(login.status()).toBe(RESPONSE_STATUS.ok);
    await waitForPasswordChangedEmail(request, recoveryAccount.email);
    const notices = (await findAccountEmails(request, recoveryAccount.email))
      .filter(({ Subject }) => Subject === PASSWORD_CHANGED_SUBJECT);
    expect(notices).toHaveLength(1);
  });

  test('shows recovery actions for missing, malformed and repeated token parameters', async ({ page }) => {
    for (const query of ['', '?token=invalid!', '?token=AAAA&token=BBBB']) {
      await page.goto(`/es/reset-password${query}`);
      await expect(page.getByRole('alert', {
        name: esMessages.PasswordRecovery.reset.invalidLink.title,
        exact: true,
      })).toContainText(
        esMessages.PasswordRecovery.errors.AUTH_PASSWORD_RESET_INVALID,
      );
      await expect(page.getByRole('link', {
        name: esMessages.PasswordRecovery.reset.invalidLink.requestNewLink,
        exact: true,
      })).toHaveAttribute('href', '/es/forgot-password');
      await expect(page.getByLabel(esMessages.PasswordRecovery.fields.password.label, {
        exact: true,
      })).toHaveCount(0);
    }
  });
});
