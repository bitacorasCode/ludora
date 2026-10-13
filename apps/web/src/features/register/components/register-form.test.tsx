import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';

import esMessages from '@/messages/es.json';

import { RegisterForm } from './register-form';

expect.extend(toHaveNoViolations);

beforeAll(() => {
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {};
  }
});

afterEach(() => {
  cleanup();
});

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
        <RegisterForm />
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

    fireEvent.change(screen.getByPlaceholderText('Juan'), {
      target: { value: 'Juan' },
    });

    fireEvent.change(screen.getByPlaceholderText('Pérez'), {
      target: { value: 'Pérez' },
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
        screen.getByText(esMessages.Register.validation.birthDateRequired),
      ).toBeTruthy();
    });
  });
});
