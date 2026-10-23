import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import esMessages from '@/messages/es.json';

import { loginUser } from '../actions';
import { LoginPageContent } from './login-page-content';

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock('@/i18n/navigation', () => ({ Link: 'a', useRouter: () => router }));

vi.mock('../actions', () => ({
  loginUser: vi.fn().mockResolvedValue({
    status: 'success',
    data: null,
  }),
}));

expect.extend(toHaveNoViolations);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(toast, 'error').mockReturnValue('login-error');
  vi.mocked(loginUser).mockReset();
  vi.mocked(loginUser).mockResolvedValue({ status: 'success', data: null });
});

beforeAll(() => {
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {};
  }
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('LoginPageContent integration', () => {
  async function submitValidLogin() {
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'jugador@example.test' },
    });
    fireEvent.change(screen.getByLabelText('Contraseña'), {
      target: { value: 'password123' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Login.submit }),
    );
  }

  function renderLogin() {
    return render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
        <LoginPageContent />
      </NextIntlClientProvider>,
    );
  }

  it('submits valid credentials and navigates home', async () => {
    renderLogin();
    await submitValidLogin();
    await waitFor(() => expect(router.replace).toHaveBeenCalledExactlyOnceWith('/'));
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(loginUser).toHaveBeenCalledExactlyOnceWith('es', {
      email: 'jugador@example.test',
      password: 'password123',
    });
  });

  it('translates invalid credentials from the backend error code', async () => {
    vi.mocked(loginUser).mockResolvedValue({
      status: 'error',
      error: { errorCode: 'AUTH_INVALID_CREDENTIALS', statusCode: 401 },
    });
    renderLogin();
    await submitValidLogin();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(esMessages.Login.feedback.errorTitle);
    expect(alert.textContent).toContain(esMessages.Login.errors.AUTH_INVALID_CREDENTIALS);
    expect(toast.error).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('keeps a transport error toast persistent when editing the form', async () => {
    vi.mocked(loginUser).mockResolvedValue({
      status: 'error',
      error: { errorCode: 'API_UNAVAILABLE' },
    });
    renderLogin();
    await submitValidLogin();
    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      esMessages.Login.feedback.errorTitle,
      {
        description: esMessages.Common.errors.API_UNAVAILABLE,
        duration: Infinity,
      },
    ));
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'otro@example.test' },
    });
    expect(toast.error).toHaveBeenCalledOnce();
  });

  it('shows a generic message for unexpected action failures', async () => {
    vi.mocked(loginUser).mockRejectedValue(new Error('Unexpected failure'));
    renderLogin();
    await submitValidLogin();
    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      esMessages.Login.feedback.errorTitle,
      {
        description: esMessages.Common.errors.unknown,
        duration: Infinity,
      },
    ));
  });

  it('disables submission and fields while the action is pending', async () => {
    const pending =
      Promise.withResolvers<Awaited<ReturnType<typeof loginUser>>>();
    vi.mocked(loginUser).mockReturnValue(pending.promise);
    renderLogin();
    await submitValidLogin();
    const button = await screen.findByRole('button', {
      name: esMessages.Login.submitting,
    });
    expect(button.hasAttribute('disabled')).toBe(true);
    expect(
      screen
        .getByLabelText('Correo electrónico')
        .closest('fieldset')
        ?.hasAttribute('disabled'),
    ).toBe(true);
    await act(async () => pending.resolve({ status: 'success', data: null }));
    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: esMessages.Login.submit })
          .hasAttribute('disabled'),
      ).toBe(false),
    );
  });

  it('didnt have accessibility violations', async () => {
    const { container } = render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
        <LoginPageContent />
      </NextIntlClientProvider>,
    );

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });

  it('renders the skip link and account links', () => {
    render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
        <LoginPageContent />
      </NextIntlClientProvider>,
    );

    expect(
      screen
        .getByRole('link', { name: esMessages.Login.skipToForm })
        .getAttribute('href'),
    ).toBe('#login-form');
    expect(
      screen
        .getByRole('link', { name: esMessages.Login.register })
        .getAttribute('href'),
    ).toContain('/register');
    expect(
      screen
        .getByRole('link', { name: esMessages.Login.forgotPassword })
        .getAttribute('href'),
    ).toContain('/forgot-password');
  });

  it('shows email and password errors when submitting invalid fields', async () => {
    render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
        <LoginPageContent />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(
      await screen.findByText(esMessages.Login.validation.emailInvalid),
    ).toBeTruthy();
    expect(
      screen.getByText(esMessages.Login.validation.passwordRequired),
    ).toBeTruthy();
  });

  it('removes the email error after correcting the field', async () => {
    render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
        <LoginPageContent />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    expect(
      await screen.findByText(esMessages.Login.validation.emailInvalid),
    ).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'juan@example.com' },
    });

    await waitFor(() => {
      expect(
        screen.queryByText(esMessages.Login.validation.emailInvalid),
      ).toBeNull();
    });
  });

  it('lets the user toggle password visibility with the keyboard', async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
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
    expect(
      screen
        .getByRole('button', { name: 'Ocultar: Contraseña' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
  });
});
