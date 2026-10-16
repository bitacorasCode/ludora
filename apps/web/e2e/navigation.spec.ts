import { expect, test } from '@playwright/test';

import enMessages from '../src/messages/en.json';
import esMessages from '../src/messages/es.json';
import { isLoggedIn } from './fixtures/auth-signed-in';

test.describe('Platform navigation', () => {
  test('closes the mobile menu after navigating and restores focus on Escape', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/es/games');
    const trigger = page.getByRole('button', {
      name: esMessages.Header.menu,
      exact: true,
    });
    await trigger.click();
    const dialog = page.getByRole('dialog', {
      name: esMessages.Header.menuTitle,
    });
    await expect(dialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await dialog
      .getByRole('link', { name: esMessages.Header.ranking, exact: true })
      .click();
    await expect(page).toHaveURL('/es/ranking');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      esMessages.Ranking.title,
    );
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('html')).toHaveJSProperty('scrollWidth', 390);
  });

  test('marks the selected account section and handles preferences access', async ({
    page,
  }) => {
    await page.goto('/es/preferences');
    await expect(page).toHaveURL(
      isLoggedIn ? '/es/account/preferences' : '/es/preferences',
    );
    if (isLoggedIn) {
      const navigation = page.getByRole('navigation', {
        name: esMessages.Account.navigationLabel,
      });
      await expect(
        navigation.getByRole('link', { name: esMessages.Account.preferences }),
      ).toHaveAttribute('aria-current', 'page');
      await navigation
        .getByRole('link', { name: esMessages.Account.activity })
        .click();
      await expect(page).toHaveURL('/es/account/activity');
      await expect(
        navigation.getByRole('link', { name: esMessages.Account.activity }),
      ).toHaveAttribute('aria-current', 'page');
      await expect(
        navigation.getByRole('link', { name: esMessages.Account.preferences }),
      ).not.toHaveAttribute('aria-current');
    }
  });

  test('preserves the locale and layout on localized missing routes', async ({
    page,
  }) => {
    const response = await page.goto('/es/pagina-inexistente');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      esMessages.NotFound.title,
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toHaveCount(1);
    await page
      .getByRole('link', { name: esMessages.NotFound.exploreGames })
      .click();
    await expect(page).toHaveURL('/es/games');
  });

  test('shows the standalone global fallback for a missing file', async ({
    page,
  }) => {
    const response = await page.goto('/unknown.txt');
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      enMessages.NotFound.title,
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('header')).toHaveCount(0);
    await expect(page.locator('main')).toHaveCount(1);
    await page
      .getByRole('link', { name: enMessages.Common.actions.backHome })
      .click();
    await expect(page).toHaveURL('/en');
  });
});
