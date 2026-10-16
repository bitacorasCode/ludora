import { cleanup, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import esMessages from '@/messages/es.json';

import AccountLayout from './layout';

const { auth, redirect } = vi.hoisted(() => ({
  auth: { loggedIn: true },
  redirect: vi.fn(() => {
    throw new Error('redirect');
  }),
}));

vi.mock('@/config/auth', () => ({
  get isLoggedIn() {
    return auth.loggedIn;
  },
}));
vi.mock('@/i18n/navigation', () => ({
  redirect,
  Link: 'a',
  usePathname: () => '/account/profile',
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AccountLayout access', () => {
  it('redirects a guest to login preserving the locale', async () => {
    auth.loggedIn = false;
    await expect(
      AccountLayout({
        children: <p>Privado</p>,
        params: Promise.resolve({ locale: 'es' }),
      }),
    ).rejects.toThrow('redirect');
    expect(redirect).toHaveBeenCalledExactlyOnceWith({
      href: '/login',
      locale: 'es',
    });
  });

  it('renders the account navigation and content for a signed-in user', async () => {
    auth.loggedIn = true;
    const content = await AccountLayout({
      children: <p>Privado</p>,
      params: Promise.resolve({ locale: 'es' }),
    });
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        {content}
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
});
