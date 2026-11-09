import type { APIRequestContext, BrowserContext, Page } from '@playwright/test';

import esMessages from '../src/messages/es.json';
import { API_URL, expect, SESSION_COOKIE, test } from './fixtures/auth';
import { fillLogin } from './fixtures/login';
import { waitForVerificationEmail } from './fixtures/mailpit';

// Authentication traces can include credentials, verification codes and tokens.
test.use({ trace: 'off', screenshot: 'off' });

async function confirmEmail(page: Page, code: string) {
  await page
    .getByLabel(esMessages.EmailVerification.code.label, { exact: true })
    .fill(code);
  await page
    .getByRole('button', {
      name: esMessages.EmailVerification.submit,
      exact: true,
    })
    .click();
}

async function expectAuthenticatedAccount(
  page: Page,
  context: BrowserContext,
  request: APIRequestContext,
  account: { email: string; nickname: string },
) {
  await expect(page).toHaveURL('/es/account/profile');
  const navigation = page.getByRole('navigation', {
    name: esMessages.Header.navigation.main,
  });
  await expect(
    navigation.getByRole('link', {
      name: esMessages.Header.account,
      exact: true,
    }),
  ).toBeVisible();

  const cookie = (await context.cookies()).find(
    ({ name }) => name === SESSION_COOKIE,
  );
  expect(cookie).toMatchObject({
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
    path: '/',
  });
  expect(await page.evaluate(() => document.cookie)).not.toContain(
    `${SESSION_COOKIE}=`,
  );

  const response = await request.get(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${cookie!.value}` },
  });
  expect(response.status()).toBe(200);
  const { user } = await response.json();
  expect(user).toMatchObject({
    email: account.email,
    nickname: account.nickname,
  });

  await page.reload();
  await expect(page).toHaveURL('/es/account/profile');
  await expect(
    navigation.getByRole('link', {
      name: esMessages.Header.account,
      exact: true,
    }),
  ).toBeVisible();
}

test.describe('Email verification with real mail', () => {
  test('registers, confirms the Mailpit code and persists the authenticated session', async ({
    page,
    context,
    request,
    registrationAccount,
  }) => {
    test.setTimeout(60_000);

    await page.goto('/es/register');
    await page
      .getByLabel(esMessages.Register.fields.nickname.label, { exact: true })
      .fill(registrationAccount.nickname);
    await page
      .getByLabel(esMessages.Register.fields.email.label, { exact: true })
      .fill(registrationAccount.email);
    await page
      .getByLabel(esMessages.Register.fields.password.label, { exact: true })
      .fill(registrationAccount.password);
    await page
      .getByLabel(esMessages.Register.fields.confirmPassword.label, { exact: true })
      .fill(registrationAccount.password);
    await page
      .getByRole('button', { name: esMessages.Register.submit, exact: true })
      .click();

    await expect(page).toHaveURL((url) => url.pathname === '/es/verify-email');
    const verificationUrl = new URL(page.url());
    expect(verificationUrl.searchParams.get('verificationId')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(
      (await context.cookies()).find(({ name }) => name === SESSION_COOKIE),
    ).toBeUndefined();
    await expect(
      page.getByRole('button', {
        name: esMessages.EmailVerification.resend.action,
        exact: true,
      }),
    ).toBeDisabled();

    const email = await waitForVerificationEmail(request, registrationAccount.email);
    await confirmEmail(page, email.code);
    await expectAuthenticatedAccount(page, context, request, registrationAccount);
  });

  test('resumes pending verification from login and confirms a resent Mailpit code', async ({
    page,
    context,
    request,
    pendingAccount,
  }) => {
    test.setTimeout(120_000);
    const firstEmail = await waitForVerificationEmail(request, pendingAccount.email);

    await page.goto('/es/login');
    await fillLogin(page, pendingAccount.email, pendingAccount.password);

    await expect(page).toHaveURL((url) =>
      url.pathname === '/es/verify-email'
      && url.searchParams.get('verificationId') === pendingAccount.verificationId,
    );
    expect(new URL(page.url()).searchParams.get('resendAvailableAt')).toBe(
      pendingAccount.resendAvailableAt,
    );
    expect(
      (await context.cookies()).find(({ name }) => name === SESSION_COOKIE),
    ).toBeUndefined();

    const resendButton = page.getByRole('button', {
      name: esMessages.EmailVerification.resend.action,
      exact: true,
    });
    await expect(resendButton).toBeDisabled();
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      esMessages.EmailVerification.title,
    );
    const resumedUrl = new URL(page.url());
    expect(resumedUrl.searchParams.get('verificationId')).toBe(
      pendingAccount.verificationId,
    );
    expect(resumedUrl.searchParams.get('resendAvailableAt')).toBe(
      pendingAccount.resendAvailableAt,
    );
    await expect(resendButton).toBeDisabled();

    // Wait for the server's real resend window, without changing the clock or database.
    await expect(resendButton).toBeEnabled({ timeout: 75_000 });
    await resendButton.click();
    await expect(
      page.getByText(esMessages.EmailVerification.resend.success.title, { exact: true }),
    ).toBeVisible();
    const resentEmail = await waitForVerificationEmail(request, pendingAccount.email, {
      excludeMessageIds: [firstEmail.id],
    });
    expect(resentEmail.id).not.toBe(firstEmail.id);
    const resentUrl = new URL(page.url());
    expect(resentUrl.searchParams.get('verificationId')).toBe(
      pendingAccount.verificationId,
    );
    const resendAvailableAt = resentUrl.searchParams.get('resendAvailableAt');
    expect(resendAvailableAt).not.toBeNull();
    expect(Date.parse(resendAvailableAt!)).toBeGreaterThan(
      Date.parse(pendingAccount.resendAvailableAt),
    );
    expect(
      (await context.cookies()).find(({ name }) => name === SESSION_COOKIE),
    ).toBeUndefined();
    await expect(resendButton).toBeDisabled();

    await page.reload();
    expect(new URL(page.url()).searchParams.get('verificationId')).toBe(
      pendingAccount.verificationId,
    );
    expect(new URL(page.url()).searchParams.get('resendAvailableAt')).toBe(
      resendAvailableAt,
    );
    await expect(resendButton).toBeDisabled();
    await confirmEmail(page, resentEmail.code);
    await expectAuthenticatedAccount(page, context, request, pendingAccount);
  });
});
