import { expect, test } from '@playwright/test';

import enMessages from '../src/messages/en.json';
import esMessages from '../src/messages/es.json';
import { isLoggedIn } from './fixtures/auth-signed-in';

const preferencesPath = isLoggedIn ? '/account/preferences' : '/preferences';

test.describe('User preferences', () => {
  test.use({ locale: 'es-CL', colorScheme: 'light' });

  test('persists the chosen theme across reloads', async ({ page }) => {
    await page.goto(`/es${preferencesPath}`);
    const control = page.getByRole('switch', {
      name: esMessages.ThemeSwitch.label,
    });
    await expect(control).toBeEnabled();
    await expect(control).not.toBeChecked();
    await control.focus();
    await page.keyboard.press('Space');
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('theme')))
      .toBe('dark');
    await page.reload();
    await expect(control).toBeChecked();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await control.click();
    await expect(page.locator('html')).not.toHaveClass(/dark/);
  });

  test('keeps search and hash while switching language and remembers the locale cookie', async ({
    page,
    context,
  }) => {
    await page.goto(`/es${preferencesPath}?tab=appearance#content`);
    await page
      .getByRole('combobox', { name: esMessages.LocaleSwitcher.label })
      .click();
    await page
      .getByRole('option', { name: esMessages.LocaleSwitcher.en, exact: true })
      .click();
    await expect(page).toHaveURL(
      `/en${preferencesPath}?tab=appearance#content`,
    );
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      enMessages.Preferences.title,
    );
    await expect
      .poll(
        async () =>
          (await context.cookies()).find(
            (cookie) => cookie.name === 'NEXT_LOCALE',
          )?.value,
      )
      .toBe('en');
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      enMessages.Preferences.title,
    );
    await page.goto('/');
    await expect(page).toHaveURL('/en');
  });

  test('detects the browser language without a stored preference', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/es');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      esMessages.Home.title,
    );
  });

  test('uses English when the browser language is unsupported', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({ locale: 'ja-JP', baseURL });
    try {
      const page = await context.newPage();
      await page.goto('/');
      await expect(page).toHaveURL('/en');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        enMessages.Home.title,
      );
    } finally {
      await context.close();
    }
  });
});
