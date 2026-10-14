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

import { registerUser } from '../actions';
import { RegisterForm } from './register-form';
import { RegisterPageContent } from './register-page-content';

vi.mock('../actions', () => ({ registerUser: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({ Link: 'a' }));

expect.extend(toHaveNoViolations);

beforeAll(() => {
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {};
  }
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function fillValidRegisterForm() {
  fireEvent.change(screen.getByLabelText('Nombre de usuario'), {
    target: { value: 'Juanito123' },
  });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), {
    target: { value: 'juan@example.com' },
  });
  fireEvent.change(screen.getByLabelText('Contraseña'), {
    target: { value: 'contraseña123' },
  });
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
    target: { value: 'contraseña123' },
  });
}

describe('RegisterForm integration', () => {
  it('didnt have accessibility violations', async () => {
    const { container } = render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <RegisterForm />
      </NextIntlClientProvider>,
    );

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  it('renders a skip link to the form', () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <RegisterPageContent />
      </NextIntlClientProvider>,
    );

    const skipLink = screen.getByRole('link', { name: 'Saltar al formulario' });

    expect(skipLink.getAttribute('href')).toBe('#register-form');
  });

  it('show specific errors when trying to save with invalid fields', async () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <RegisterForm />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByPlaceholderText('Juanito123'), {
      target: { value: 'A' },
    });

    fireEvent.change(screen.getByPlaceholderText('juan.perez@ejemplo.com'), {
      target: { value: 'correo-inválido' },
    });

    fireEvent.change(screen.getByPlaceholderText('Crea una contraseña'), {
      target: { value: 'corta' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    await waitFor(() => {
      expect(
        screen.getByText(esMessages.Register.validation.nicknameMin),
      ).toBeTruthy();
    });

    await waitFor(() => {
      expect(
        screen.getByText(esMessages.Register.validation.confirmPasswordRequired),
      ).toBeTruthy();
    });

    expect(registerUser).not.toHaveBeenCalled();
  });

  it('shows the mismatch error on the confirmation field', async () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <RegisterForm />
      </NextIntlClientProvider>,
    );

    fillValidRegisterForm();
    fireEvent.change(screen.getByLabelText('Confirmar contraseña'), {
      target: { value: 'otraContraseña123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText(esMessages.Register.validation.passwordMismatch)).toBeTruthy();
    expect(screen.getByLabelText('Confirmar contraseña').getAttribute('aria-invalid')).toBe('true');
    expect(registerUser).not.toHaveBeenCalled();
  });

  it('shows a server validation error', async () => {
    vi.mocked(registerUser).mockResolvedValueOnce({
      status: 'invalid',
      errors: [esMessages.Register.validation.emailInvalid],
    });

    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <RegisterForm />
      </NextIntlClientProvider>,
    );

    fillValidRegisterForm();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText(esMessages.Register.validation.emailInvalid)).toBeTruthy();
    expect(registerUser).toHaveBeenCalledOnce();
  });

  it('shows an error if the action fails', async () => {
    vi.mocked(registerUser).mockRejectedValueOnce(new Error('Network error'));

    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <RegisterForm />
      </NextIntlClientProvider>,
    );

    fillValidRegisterForm();
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByText(esMessages.Register.feedback.unexpectedError)).toBeTruthy();
    expect(registerUser).toHaveBeenCalledOnce();
  });

  it('lets the user toggle password visibility with the keyboard', async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <RegisterForm />
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

    await user.keyboard('{Enter}');
    expect(password.getAttribute('type')).toBe('password');
  });
});
