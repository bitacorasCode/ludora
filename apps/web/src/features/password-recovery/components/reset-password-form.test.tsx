import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import esMessages from '@/messages/es.json';

import { ResetPasswordForm } from './reset-password-form';

vi.mock('@/i18n/navigation', () => ({ Link: 'a' }));

expect.extend(toHaveNoViolations);

beforeAll(() => {
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {};
  }
});

afterEach(() => {
  cleanup();
});

describe('ResetPasswordForm integration', () => {
  it('didnt have accessibility violations', async () => {
    const { container } = render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ResetPasswordForm />
      </NextIntlClientProvider>,
    );

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  it('renders a skip link and a link back to login', () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ResetPasswordForm />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('link', { name: esMessages.PasswordRecovery.skipToForm }).getAttribute('href')).toBe('#reset-password-form');
    expect(screen.getByRole('link', { name: esMessages.PasswordRecovery.backToLogin }).getAttribute('href')).toContain('/login');
  });

  it('shows errors for a short password and empty confirmation', async () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ResetPasswordForm />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('Contraseña nueva'), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByText(esMessages.PasswordRecovery.validation.passwordMin)).toBeTruthy();
    expect(screen.getByText(esMessages.PasswordRecovery.validation.confirmPasswordRequired)).toBeTruthy();
  });

  it('shows the mismatch error on the confirmation field', async () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ResetPasswordForm />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('Contraseña nueva'), {
      target: { value: 'contraseña123' },
    });
    fireEvent.change(screen.getByLabelText('Confirmar contraseña nueva'), {
      target: { value: 'otraContraseña123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));

    expect(await screen.findByText(esMessages.PasswordRecovery.validation.passwordMismatch)).toBeTruthy();
    expect(screen.getByLabelText('Confirmar contraseña nueva').getAttribute('aria-invalid')).toBe('true');
  });

  it('lets the user toggle password visibility with the keyboard', async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ResetPasswordForm />
      </NextIntlClientProvider>,
    );

    const password = screen.getByLabelText('Contraseña nueva');
    const toggle = screen.getByRole('button', { name: 'Mostrar: Contraseña nueva' });

    password.focus();
    await user.tab();
    expect(document.activeElement).toBe(toggle);
    expect(password.getAttribute('type')).toBe('password');

    await user.keyboard('{Enter}');
    expect(password.getAttribute('type')).toBe('text');
    expect(screen.getByLabelText('Confirmar contraseña nueva').getAttribute('type')).toBe('password');
  });
});
