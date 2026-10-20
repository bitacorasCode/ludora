import { cleanup, render, screen } from '@testing-library/react';
import { createTranslator, NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentUser } from '@/lib/auth';
import esMessages from '@/messages/es.json';

import { currentUser } from '../../../../test/fixtures/current-user';
import { resolveSuspendedComponent } from '../../../../test/resolve-suspended-component';
import AccountLayout from './layout';

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn(() => {
    throw new Error('redirect');
  }),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@/features/logout', () => ({
  LogoutButton: () => <button>Cerrar sesión</button>,
}));
vi.mock('@/i18n/navigation', () => ({
  redirect,
  Link: 'a',
  usePathname: () => '/account/profile',
}));
vi.mock('next-intl/server', () => ({
  getTranslations: async () =>
    createTranslator({
      locale: 'es',
      messages: esMessages,
      namespace: 'Account',
    }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockReset();
  vi.mocked(getCurrentUser).mockResolvedValue(currentUser);
});
afterEach(() => cleanup());

async function getContent() {
  const layout = await AccountLayout({
    children: <p>Privado</p>,
    params: Promise.resolve({ locale: 'es' }),
  });
  return resolveSuspendedComponent(layout);
}

describe('AccountLayout access', () => {
  it('redirects a guest to login preserving the locale', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    await expect(getContent()).rejects.toThrow('redirect');
    expect(redirect).toHaveBeenCalledExactlyOnceWith({
      href: '/login',
      locale: 'es',
    });
  });

  it('renders the account navigation and content for a signed-in user', async () => {
    render(
      <NextIntlClientProvider locale="es" messages={esMessages}>
        {await getContent()}
      </NextIntlClientProvider>,
    );
    expect(screen.getByText('Privado')).toBeTruthy();
    expect(
      screen.getByRole('navigation', {
        name: esMessages.Account.navigationLabel,
      }),
    ).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('propagates an API failure instead of redirecting to login', async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('API_UNAVAILABLE'));
    await expect(getContent()).rejects.toThrow('API_UNAVAILABLE');
    expect(redirect).not.toHaveBeenCalled();
  });
});
