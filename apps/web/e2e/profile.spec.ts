import esMessages from '../src/messages/es.json';
import { API_URL, expect, SESSION_COOKIE, test } from './fixtures/auth';

test.beforeEach(async ({ context, request, testAccount }) => {
  const session = (await context.cookies()).find(
    ({ name }) => name === SESSION_COOKIE,
  );
  if (!session) throw new Error('Profile tests require an authenticated session.');

  const response = await request.put(`${API_URL}/profile`, {
    headers: { Authorization: `Bearer ${session.value}` },
    data: { avatarPresetId: null, bio: null },
  });

  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({
    userId: testAccount.id,
    avatarPresetId: null,
    bio: null,
  });
});

test.describe('Profile persistence', () => {
  test('persists the profile on the server without browser cache and synchronizes another tab', async ({
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
    await expect(otherTab.getByText(esMessages.Profile.bio.empty)).toBeVisible();
    await page.bringToFront();
    await page.getByRole('button', { name: esMessages.Profile.edit }).click();
    const initial = page.getByRole('radio', {
      name: esMessages.Profile.avatar.useInitial,
    });
    await initial.focus();
    await page.keyboard.down('ArrowRight');
    await expect(
      page.getByRole('radio', { name: esMessages.Profile.avatar.options.comet }),
    ).toBeChecked();
    await page.keyboard.up('ArrowRight');
    await page
      .getByRole('radio', { name: esMessages.Profile.avatar.options.fox })
      .click();
    await page
      .getByLabel(esMessages.Profile.bio.label)
      .fill('Mi perfil persistido');
    await page
      .getByRole('button', { name: esMessages.Common.actions.saveChanges })
      .click();
    await expect(page.getByText(esMessages.Profile.saved, { exact: true })).toBeVisible();
    await expect(
      otherTab.getByText('Mi perfil persistido', { exact: true }),
    ).toBeVisible();
    await expect(otherTab.locator('img[src="/avatars/fox.svg"]')).toBeVisible();
    await otherTab.close();
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(
      page.getByRole('button', { name: esMessages.Profile.edit }),
    ).toBeVisible();
    await expect(
      page.getByText('Mi perfil persistido', { exact: true }),
    ).toBeVisible();
    await expect(page.locator('img[src="/avatars/fox.svg"]')).toBeVisible();
    expect(hydrationErrors).toEqual([]);
  });

  test('discards cancelled edits without changing persisted data', async ({
    page,
  }) => {
    await page.goto('/es/account/profile');
    await page.getByRole('button', { name: esMessages.Profile.edit }).click();
    await page
      .getByLabel(esMessages.Profile.bio.label)
      .fill('Cambio descartado');
    await page
      .getByRole('button', { name: esMessages.Common.actions.cancel })
      .click();
    await expect(page.getByText(esMessages.Profile.bio.empty)).toBeVisible();
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(
      page.getByRole('button', { name: esMessages.Profile.edit }),
    ).toBeVisible();
    await expect(page.getByText(esMessages.Profile.bio.empty)).toBeVisible();
    await expect(page.getByText('Cambio descartado')).toHaveCount(0);
  });

  test('closes the editor and discards drafts after link and browser-back navigation', async ({
    page,
  }) => {
    await page.goto('/es/account/profile');
    await page.getByRole('button', { name: esMessages.Profile.edit }).click();
    await page
      .getByRole('textbox', { name: esMessages.Profile.bio.label })
      .fill('Biografía guardada');
    await page
      .getByRole('button', { name: esMessages.Common.actions.saveChanges })
      .click();
    await expect(page.getByText(esMessages.Profile.saved, { exact: true })).toBeVisible();

    await page.getByRole('button', { name: esMessages.Profile.edit }).click();
    await page
      .getByRole('textbox', { name: esMessages.Profile.bio.label })
      .fill('Borrador sin guardar');
    await page.locator('header')
      .getByRole('link', { name: esMessages.Header.games, exact: true })
      .click();
    await expect(page).toHaveURL('/es/games');
    await expect(page.getByRole('heading', { name: esMessages.Catalog.title, exact: true }))
      .toBeVisible();

    const preservedHeading = page.locator('h1').filter({ hasText: esMessages.Profile.title });
    await expect(preservedHeading).toHaveCount(1);
    await expect(preservedHeading).toBeHidden();

    await page.locator('header')
      .getByRole('link', { name: esMessages.Header.account, exact: true })
      .click();
    await expect(page).toHaveURL('/es/account/profile');
    await expect(page.getByRole('button', { name: esMessages.Profile.edit })).toBeVisible();
    await expect(page.getByRole('form', { name: esMessages.Profile.edit })).toHaveCount(0);
    await expect(page.getByText('Biografía guardada', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: esMessages.Profile.edit }).click();
    const biography = page.getByRole('textbox', { name: esMessages.Profile.bio.label });
    await expect(biography).toHaveValue('Biografía guardada');
    await biography.fill('Otro borrador sin guardar');
    await page.locator('header')
      .getByRole('link', { name: esMessages.Header.games, exact: true })
      .click();
    await expect(page).toHaveURL('/es/games');

    await page.goBack();
    await expect(page).toHaveURL('/es/account/profile');
    await expect(page.getByRole('button', { name: esMessages.Profile.edit })).toBeVisible();
    await expect(page.getByRole('form', { name: esMessages.Profile.edit })).toHaveCount(0);
    await page.getByRole('button', { name: esMessages.Profile.edit }).click();
    await expect(biography).toHaveValue('Biografía guardada');
  });
});
