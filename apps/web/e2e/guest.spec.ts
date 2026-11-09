import esMessages from '../src/messages/es.json';
import { expect, test } from './fixtures/auth';

test.describe('Guest access', () => {
  test('redirects protected account routes to login with the current locale', async ({
    page,
  }) => {
    await page.goto('/es/account/profile');
    await expect(page).toHaveURL('/es/login');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      esMessages.Login.title,
    );
  });

  test('offers public preferences and guest navigation', async ({ page }) => {
    await page.goto('/es/preferences');
    await expect(page).toHaveURL('/es/preferences');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      esMessages.Preferences.title,
    );
    const navigation = page.getByRole('navigation', {
      name: esMessages.Header.navigation.main,
    });
    await expect(
      navigation.getByRole('link', {
        name: esMessages.Header.login,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      navigation.getByRole('link', {
        name: esMessages.Header.register,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      navigation.locator('a[href="/es/account/profile"]'),
    ).toHaveCount(0);
    await expect(
      page.getByRole('switch', { name: esMessages.ThemeSwitch.label }),
    ).toBeEnabled();
  });
});
