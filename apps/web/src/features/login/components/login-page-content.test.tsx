import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import esMessages from '@/messages/es.json';

import { LoginPageContent } from './login-page-content';

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

describe('LoginPageContent integration', () => {
  it('didnt have accessibility violations', async () => {
    const { container } = render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <LoginPageContent />
      </NextIntlClientProvider>,
    );

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  it('renders the skip link and account links', () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <LoginPageContent />
      </NextIntlClientProvider>,
    );

    expect(screen.getByRole('link', { name: esMessages.Login.skipToForm }).getAttribute('href')).toBe('#login-form');
    expect(screen.getByRole('link', { name: esMessages.Login.register }).getAttribute('href')).toContain('/register');
    expect(screen.getByRole('link', { name: esMessages.Login.forgotPassword }).getAttribute('href')).toContain('/forgot-password');
  });

  it('shows email and password errors when submitting invalid fields', async () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <LoginPageContent />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText(esMessages.Login.validation.emailInvalid)).toBeTruthy();
    expect(screen.getByText(esMessages.Login.validation.passwordRequired)).toBeTruthy();
  });

  it('removes the email error after correcting the field', async () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <LoginPageContent />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(await screen.findByText(esMessages.Login.validation.emailInvalid)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'juan@example.com' },
    });

    await waitFor(() => {
      expect(screen.queryByText(esMessages.Login.validation.emailInvalid)).toBeNull();
    });
  });

  it('lets the user toggle password visibility with the keyboard', async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <LoginPageContent />
      </NextIntlClientProvider>,
    );

    const password = screen.getByLabelText('Contraseña');
    const toggle = screen.getByRole('button', { name: 'Mostrar: Contraseña' });

    password.focus();
    await user.tab();
    expect(document.activeElement).toBe(toggle);
    expect(password.getAttribute('type')).toBe('password');

    await user.keyboard('{Enter}');
    expect(password.getAttribute('type')).toBe('text');
    expect(screen.getByRole('button', { name: 'Ocultar: Contraseña' }).getAttribute('aria-pressed')).toBe('true');
  });
});
