import { expect, type Page } from '@playwright/test';

import esMessages from '../../src/messages/es.json';

export async function fillLogin(page: Page, email: string, password: string) {
  const emailInput = page.getByLabel(esMessages.Login.fields.email.label, { exact: true });
  const passwordInput = page.getByLabel(esMessages.Login.fields.password.label, { exact: true });

  // SSR inputs can be visible before React attaches their event handlers.
  // A successful visibility toggle proves that the form is interactive.
  await expect.poll(async () => {
    if (await passwordInput.getAttribute('type') === 'password') {
      await page.getByRole('button', {
        name: `${esMessages.FormTextField.show}: ${esMessages.Login.fields.password.label}`,
        exact: true,
      }).click();
    }

    return passwordInput.getAttribute('type');
  }, { message: 'Login controls must be interactive before entering credentials' }).toBe('text');

  await page.getByRole('button', {
    name: `${esMessages.FormTextField.hide}: ${esMessages.Login.fields.password.label}`,
    exact: true,
  }).click();
  await expect(passwordInput).toHaveAttribute('type', 'password');

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await expect(emailInput).toHaveValue(email);
  expect(await passwordInput.inputValue() === password, 'The password must remain filled').toBe(true);

  await page.getByRole('button', {
    name: esMessages.Login.submit,
    exact: true,
  }).click();
}
