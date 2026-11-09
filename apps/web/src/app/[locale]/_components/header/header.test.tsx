import { cleanup, render, screen } from '@testing-library/react';
import { createTranslator, NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NavigationGuardProvider } from '@/components/navigation';
import { getCurrentUser } from '@/lib/auth';
import esMessages from '@/messages/es.json';

import { currentUser } from '../../../../../test/fixtures/current-user';
import { Header } from './header';

const router = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => router,
}));

let accountLinks: ReactNode;

vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }));
vi.mock('next-intl/server', () => ({
  getTranslations: async () =>
    createTranslator({
      locale: 'es',
      messages: esMessages,
      namespace: 'Header',
    }),
}));
// Resolve this async server child before mounting the synchronous header in jsdom.
vi.mock('./header-account-links', () => ({
  HeaderAccountLinks: () => accountLinks,
}));

beforeEach(() => {
  vi.mocked(getCurrentUser).mockReset();
  vi.mocked(getCurrentUser).mockResolvedValue(currentUser);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function renderHeader() {
  const { HeaderAccountLinks } = await vi.importActual<
    typeof import('./header-account-links')
  >('./header-account-links');
  accountLinks = await HeaderAccountLinks({});
  render(
    <NextIntlClientProvider locale='es' messages={esMessages}>
      <NavigationGuardProvider>
        <Header />
      </NavigationGuardProvider>
    </NextIntlClientProvider>,
  );
}

describe('Header navigation', () => {
  it('renders signed-in account links with the active locale', async () => {
    await renderHeader();
    expect(
      screen
        .getByRole('link', { name: esMessages.Header.account })
        .getAttribute('href'),
    ).toBe('/es/account/profile');
    expect(
      screen.queryByRole('link', { name: esMessages.Header.login }),
    ).toBeNull();
    expect(
      screen.queryByRole('link', { name: esMessages.Header.register }),
    ).toBeNull();
    expect(
      screen
        .getByRole('link', { name: esMessages.Header.games })
        .getAttribute('href'),
    ).toBe('/es/games');
    expect(
      screen
        .getByRole('link', { name: esMessages.Header.ranking })
        .getAttribute('href'),
    ).toBe('/es/ranking');
  });

  it('renders guest account links with the active locale', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    await renderHeader();
    expect(
      screen
        .getByRole('link', { name: esMessages.Header.login })
        .getAttribute('href'),
    ).toBe('/es/login');
    expect(
      screen
        .getByRole('link', { name: esMessages.Header.register })
        .getAttribute('href'),
    ).toBe('/es/register');
    expect(
      screen
        .getByRole('link', { name: esMessages.Header.preferences })
        .getAttribute('href'),
    ).toBe('/es/preferences');
    expect(
      screen.queryByRole('link', { name: esMessages.Header.account }),
    ).toBeNull();
    expect(
      screen
        .getByRole('link', { name: esMessages.Header.games })
        .getAttribute('href'),
    ).toBe('/es/games');
    expect(
      screen
        .getByRole('link', { name: esMessages.Header.ranking })
        .getAttribute('href'),
    ).toBe('/es/ranking');
  });

  it('shows a local session error while keeping public navigation available', async () => {
    const error = new Error('API_UNAVAILABLE');
    vi.mocked(getCurrentUser).mockRejectedValue(error);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await renderHeader();
    expect(
      screen.getByText(esMessages.Header.session.unavailable),
    ).toBeTruthy();
    expect(
      screen.getByRole('link', { name: esMessages.Header.games }),
    ).toBeTruthy();
    expect(
      screen.queryByRole('link', { name: esMessages.Header.login }),
    ).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      'Unable to load the header session.',
      error,
    );
  });
});
