import { expect, test } from '@playwright/test';

import esMessages from '../src/messages/es.json';

test.describe('Profile persistence', () => {
  test('saves preferences across reloads and synchronizes another tab', async ({
    page,
    context,
  }) => {
    const hydrationErrors: string[] = [];
    page.on('console', (message) => {
      if (
        message.type() === 'error' &&
        /hydration failed|didn't match/i.test(message.text())
      )
        hydrationErrors.push(message.text());
    });
    await page.goto('/es/account/profile');
    const otherTab = await context.newPage();
    await otherTab.goto('/es/account/profile');
    await expect(otherTab.getByText(esMessages.Profile.emptyBio)).toBeVisible();
    await page.bringToFront();
    await page.getByRole('button', { name: esMessages.Profile.edit }).click();
    const initial = page.getByRole('radio', {
      name: esMessages.Profile.useInitial,
    });
    await initial.focus();
    await page.keyboard.down('ArrowRight');
    await expect(
      page.getByRole('radio', { name: esMessages.Profile.avatars.comet }),
    ).toBeChecked();
    await page.keyboard.up('ArrowRight');
    await page
      .getByRole('radio', { name: esMessages.Profile.avatars.fox })
      .click();
    await page
      .getByLabel(esMessages.Profile.bioLabel)
      .fill('Mi perfil persistido');
    await page.getByRole('button', { name: esMessages.Common.actions.saveChanges }).click();
    await expect(page.getByRole('status')).toHaveText(esMessages.Profile.saved);
    await expect(
      otherTab.getByText('Mi perfil persistido', { exact: true }),
    ).toBeVisible();
    await expect(otherTab.locator('img[src="/avatars/fox.svg"]')).toBeVisible();
    await page.reload();
    await expect(
      page.getByText('Mi perfil persistido', { exact: true }),
    ).toBeVisible();
    expect(hydrationErrors).toEqual([]);
    await otherTab.close();
  });

  test('discards cancelled edits without changing persisted data', async ({
    page,
  }) => {
    await page.goto('/es/account/profile');
    await page.getByRole('button', { name: esMessages.Profile.edit }).click();
    await page
      .getByLabel(esMessages.Profile.bioLabel)
      .fill('Cambio descartado');
    await page.getByRole('button', { name: esMessages.Common.actions.cancel }).click();
    await expect(page.getByText(esMessages.Profile.emptyBio)).toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem('ludora:preview-profile')),
    ).toBeNull();
  });
});
