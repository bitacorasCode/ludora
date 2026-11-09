import esMessages from '../src/messages/es.json';
import {
  API_URL,
  createExpiredToken,
  expect,
  SESSION_COOKIE,
  test,
} from './fixtures/auth';
import { fillLogin } from './fixtures/login';

// Authentication traces can include credentials and session tokens.
test.use({ trace: 'off', screenshot: 'off' });

test.describe('Real authentication', () => {
  test('logs in, persists the HttpOnly cookie, protects guest pages and logs out', async ({
    page,
    context,
    testAccount,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/es/login');
    await fillLogin(page, testAccount.email, testAccount.password);
    await expect(page).toHaveURL('/es');
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
    await page.reload();
    await expect(
      navigation.getByRole('link', {
        name: esMessages.Header.account,
        exact: true,
      }),
    ).toBeVisible();
    await page.goto('/es/login');
    await expect(page).toHaveURL('/es');
    await page.goto('/es/register');
    await expect(page).toHaveURL('/es');
    await page.goto('/es/preferences');
    await expect(page).toHaveURL('/es/account/preferences');
    // Capture native document reloads: the logout should use Next navigation.
    await page.evaluate(() => {
      (window as Window & { logoutMarker?: boolean }).logoutMarker = true;
    });
    await page
      .getByRole('button', { name: esMessages.Logout.submit, exact: true })
      .click();
    await expect(page).toHaveURL('/es');
    expect(
      await page.evaluate(
        () => (window as Window & { logoutMarker?: boolean }).logoutMarker,
      ),
    ).toBe(true);
    expect(
      (await context.cookies()).find(({ name }) => name === SESSION_COOKIE),
    ).toBeUndefined();
    await expect(
      navigation.getByRole('link', {
        name: esMessages.Header.login,
        exact: true,
      }),
    ).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL('/es/login');
    await page.goto('/es/account/profile');
    await expect(page).toHaveURL('/es/login');
    expect(errors).toEqual([]);
  });

  test('rejects incorrect credentials without creating a session', async ({
    page,
    context,
    testAccount,
  }) => {
    await page.goto('/es/login');
    await fillLogin(page, testAccount.email, 'incorrect-password');
    await expect(
      page.getByRole('form', { name: esMessages.Login.title }).getByRole('alert'),
    ).toContainText(esMessages.Login.errors.AUTH_INVALID_CREDENTIALS);
    await expect(page).toHaveURL('/es/login');
    expect(
      (await context.cookies()).find(({ name }) => name === SESSION_COOKIE),
    ).toBeUndefined();
  });

  test('disables login while the real API response is pending', async ({
    page,
    apiMode,
    testAccount,
  }) => {
    await page.goto('/es/login');
    await apiMode('delayed');
    await fillLogin(page, testAccount.email, testAccount.password);
    await expect(
      page.getByRole('button', {
        name: esMessages.Login.submitting,
        exact: true,
      }),
    ).toBeDisabled();
    await expect(
      page.getByLabel(esMessages.Login.fields.email.label, { exact: true }),
    ).toBeDisabled();
    await expect(page).toHaveURL('/es');
  });

  test('displays a connection failure without creating a session', async ({
    page,
    context,
    apiMode,
    testAccount,
  }) => {
    await page.goto('/es/login');
    await apiMode('unavailable');
    await fillLogin(page, testAccount.email, testAccount.password);
    await expect(
      page.getByText(esMessages.Common.errors.API_UNAVAILABLE, { exact: true }),
    ).toBeVisible();
    expect(
      (await context.cookies()).find(({ name }) => name === SESSION_COOKIE),
    ).toBeUndefined();
  });

  test('rejects an actually expired JWT and permits logging in again', async ({
    page,
    context,
    request,
    testAccount,
  }) => {
    const token = await createExpiredToken(testAccount);
    const response = await request.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status()).toBe(401);
    await context.addCookies([
      {
        name: SESSION_COOKIE,
        value: token,
        url: 'http://localhost:3100',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
    await page.goto('/es/account/profile');
    await expect(page).toHaveURL('/es/login');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      esMessages.Login.title,
    );
    await fillLogin(page, testAccount.email, testAccount.password);
    await expect(page).toHaveURL('/es');
  });

  test('shows the route error for a session lookup outage instead of showing the login form', async ({
    page,
    context,
    request,
    apiMode,
    testAccount,
  }) => {
    const response = await request.post(`${API_URL}/auth/login`, {
      data: { email: testAccount.email, password: testAccount.password },
    });
    expect(response.status()).toBe(200);
    const { accessToken } = await response.json();
    await context.addCookies([
      {
        name: SESSION_COOKIE,
        value: accessToken,
        url: 'http://localhost:3100',
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
    await apiMode('unavailable');
    await page.goto('/es/account/profile');
    await expect(
      page.getByRole('alert', {
        name: esMessages.RouteError.title,
        exact: true,
      }),
    ).toContainText(esMessages.RouteError.title);
    await expect(
      page.getByRole('button', { name: esMessages.Common.actions.retry }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: esMessages.Login.submit, exact: true }),
    ).toHaveCount(0);
  });
});
