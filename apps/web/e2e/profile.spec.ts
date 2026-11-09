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
    const confirmation = page.getByRole('alertdialog', {
      name: esMessages.Common.unsavedChanges.title,
    });
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', {
      name: esMessages.Common.unsavedChanges.cancel,
    }).click();
    await expect(page.getByRole('textbox', { name: esMessages.Profile.bio.label }))
      .toHaveValue('Cambio descartado');
    await page.getByRole('button', { name: esMessages.Common.actions.cancel }).click();
    await confirmation.getByRole('button', {
      name: esMessages.Common.unsavedChanges.confirm,
    }).click();
    await expect(page.getByText(esMessages.Profile.bio.empty)).toBeVisible();
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(
      page.getByRole('button', { name: esMessages.Profile.edit }),
    ).toBeVisible();
    await expect(page.getByText(esMessages.Profile.bio.empty)).toBeVisible();
    await expect(page.getByText('Cambio descartado')).toHaveCount(0);
  });

  test('confirms leaving a dirty profile and closes the editor after navigation', async ({
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
    const confirmation = page.getByRole('alertdialog', {
      name: esMessages.Common.unsavedChanges.title,
    });
    await expect(confirmation).toBeVisible();
    await expect(page).toHaveURL('/es/account/profile');
    await confirmation.getByRole('button', {
      name: esMessages.Common.unsavedChanges.cancel,
    }).click();
    await expect(page.getByRole('textbox', { name: esMessages.Profile.bio.label }))
      .toHaveValue('Borrador sin guardar');
    await page.locator('header')
      .getByRole('link', { name: esMessages.Header.games, exact: true })
      .click();
    await confirmation.getByRole('button', {
      name: esMessages.Common.unsavedChanges.confirm,
    }).click();
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

  test('navigates Back and Forward without confirmation when the editor has no changes', async ({
    page,
  }) => {
    await page.goto('/es/games');
    await page.locator('header')
      .getByRole('link', { name: esMessages.Header.account, exact: true })
      .click();
    await page.getByRole('button', { name: esMessages.Profile.edit }).click();

    await page.goBack();
    await expect(page).toHaveURL('/es/games');
    await expect(page.getByRole('alertdialog')).toHaveCount(0);

    await page.goForward();
    await expect(page).toHaveURL('/es/account/profile');
    await expect(page.getByRole('button', { name: esMessages.Profile.edit })).toBeVisible();
    await expect(page.getByRole('form', { name: esMessages.Profile.edit })).toHaveCount(0);
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
  });

  test('keeps a draft when Back is cancelled and discards it only after confirmation', async ({
    page,
  }) => {
    await page.goto('/es/games');
    await page.locator('header')
      .getByRole('link', { name: esMessages.Header.account, exact: true })
      .click();
    await page.getByRole('button', { name: esMessages.Profile.edit }).click();
    const biography = page.getByRole('textbox', { name: esMessages.Profile.bio.label });
    await biography.fill('Borrador antes de volver');

    // A cancelled traversal has no navigation completion for Playwright to await.
    await page.evaluate(() => window.history.back());
    const confirmation = page.getByRole('alertdialog', {
      name: esMessages.Common.unsavedChanges.title,
    });
    await expect(confirmation).toBeVisible();
    await expect(page).toHaveURL('/es/account/profile');
    await confirmation.getByRole('button', {
      name: esMessages.Common.unsavedChanges.cancel,
    }).click();
    await expect(confirmation).toBeHidden();
    await expect(biography).toHaveValue('Borrador antes de volver');

    const backNavigation = page.goBack();
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', {
      name: esMessages.Common.unsavedChanges.confirm,
    }).click();
    await backNavigation;
    await expect(page).toHaveURL('/es/games');
    await expect(page.getByRole('alertdialog')).toHaveCount(0);

    await page.goForward();
    await expect(page).toHaveURL('/es/account/profile');
    await expect(page.getByRole('button', { name: esMessages.Profile.edit })).toBeVisible();
    await expect(page.getByRole('form', { name: esMessages.Profile.edit })).toHaveCount(0);
    await expect(page.getByText(esMessages.Profile.bio.empty)).toBeVisible();
  });

  test('keeps a draft when Forward is cancelled and discards it only after confirmation', async ({
    page,
  }) => {
    await page.goto('/es/account/profile');
    await expect(page.getByRole('button', { name: esMessages.Profile.edit })).toBeVisible();
    await page.locator('header')
      .getByRole('link', { name: esMessages.Header.games, exact: true })
      .click();
    await expect(page).toHaveURL('/es/games');
    await page.goBack();
    await page.getByRole('button', { name: esMessages.Profile.edit }).click();
    const biography = page.getByRole('textbox', { name: esMessages.Profile.bio.label });
    await biography.fill('Borrador antes de avanzar');

    await page.evaluate(() => window.history.forward());
    const confirmation = page.getByRole('alertdialog', {
      name: esMessages.Common.unsavedChanges.title,
    });
    await expect(confirmation).toBeVisible();
    await expect(page).toHaveURL('/es/account/profile');
    await confirmation.getByRole('button', {
      name: esMessages.Common.unsavedChanges.cancel,
    }).click();
    await expect(confirmation).toBeHidden();
    await expect(biography).toHaveValue('Borrador antes de avanzar');

    const forwardNavigation = page.goForward();
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', {
      name: esMessages.Common.unsavedChanges.confirm,
    }).click();
    await forwardNavigation;
    await expect(page).toHaveURL('/es/games');
    await expect(page.getByRole('alertdialog')).toHaveCount(0);

    await page.goBack();
    await expect(page).toHaveURL('/es/account/profile');
    await expect(page.getByRole('button', { name: esMessages.Profile.edit })).toBeVisible();
    await expect(page.getByRole('form', { name: esMessages.Profile.edit })).toHaveCount(0);
    await expect(page.getByText(esMessages.Profile.bio.empty)).toBeVisible();
  });

  test('uses the browser confirmation when reloading a dirty profile', async ({ page }) => {
    await page.goto('/es/account/profile');
    await page.getByRole('button', { name: esMessages.Profile.edit }).click();
    const biography = page.getByRole('textbox', { name: esMessages.Profile.bio.label });
    await biography.fill('Borrador antes de recargar');

    const pendingDialog = page.waitForEvent('dialog');
    const reload = page.evaluate(() => window.location.reload());
    const dialog = await pendingDialog;
    expect(dialog.type()).toBe('beforeunload');
    await dialog.dismiss();
    await reload;

    await expect(page).toHaveURL('/es/account/profile');
    await expect(biography).toHaveValue('Borrador antes de recargar');
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
  });

  test('recovers an expired session without a profile error toast or discard dialog', async ({
    page,
    context,
  }) => {
    await page.goto('/es/account/profile');
    await page.getByRole('button', { name: esMessages.Profile.edit }).click();
    await page.getByRole('textbox', { name: esMessages.Profile.bio.label })
      .fill('Cambio pendiente');
    await context.clearCookies({ name: SESSION_COOKIE });
    await page.getByRole('button', { name: esMessages.Common.actions.saveChanges }).click();

    await expect(page).toHaveURL('/es/login');
    await expect(page.getByRole('heading', { name: esMessages.Login.title, exact: true }))
      .toBeVisible();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.getByText(esMessages.Profile.saveError, { exact: true })).toHaveCount(0);
  });
});
