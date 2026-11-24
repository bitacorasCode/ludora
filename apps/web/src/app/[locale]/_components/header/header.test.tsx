import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { createTranslator, NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { APP_ROUTES } from '@/config/routes';
import { getCurrentUser } from '@/lib/auth';
import esMessages from '@/messages/es.json';

import { currentUser } from '../../../../../test/fixtures/current-user';
import { Header } from './header';

const accountLinkName = new RegExp(currentUser.nickname);
const pathname = vi.hoisted(() => ({ current: '/es' }));
const router = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => router,
  usePathname: () => pathname.current,
}));

let accountLinks: { desktop: ReactNode; mobile: ReactNode };

vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }));
vi.mock('next-intl/server', () => ({
  getTranslations: async () =>
    createTranslator({
      locale: 'es',
      messages: esMessages,
    }),
}));
// Resolve this async server child before mounting the synchronous header in jsdom.
vi.mock('./header-account-links', () => ({
  HeaderAccountLinks: ({ isSideMenu = false }: { isSideMenu?: boolean }) =>
    isSideMenu ? accountLinks.mobile : accountLinks.desktop,
}));

const { HeaderAccountLinks } = await vi.importActual<
  typeof import('./header-account-links')
>('./header-account-links');

beforeEach(() => {
  pathname.current = '/es';
  vi.mocked(getCurrentUser).mockReset();
  vi.mocked(getCurrentUser).mockResolvedValue(currentUser);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function renderHeader() {
  accountLinks = {
    desktop: await HeaderAccountLinks({}),
    mobile: await HeaderAccountLinks({ isSideMenu: true }),
  };
  render(
    <NextIntlClientProvider locale='es' messages={esMessages}>
      <Header />
    </NextIntlClientProvider>,
  );
}

describe('Header navigation', () => {
  it('renders signed-in account links with the active locale', async () => {
    await renderHeader();
    expect(
      screen
        .getByRole('link', { name: accountLinkName })
        .getAttribute('href'),
    ).toBe('/es/account/profile');
    const accountLink = screen.getByRole('link', { name: accountLinkName });
    const avatar = accountLink.querySelector('[data-slot="avatar"]');
    expect(avatar?.getAttribute('data-size')).toBe('sm');
    expect(avatar?.getAttribute('aria-hidden')).toBe('true');
    expect(avatar?.textContent).toBe('J');
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

  it('renders the saved avatar before the nickname', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      ...currentUser,
      avatarPresetId: 'fox',
    });
    vi.spyOn(window, 'Image').mockImplementation(function () {
      const image = document.createElement('img');
      Object.defineProperties(image, {
        complete: { value: true },
        naturalWidth: { value: 1 },
      });
      return image;
    });

    await renderHeader();

    const accountLink = screen.getByRole('link', { name: accountLinkName });
    const image = accountLink.querySelector('img');
    expect(image?.getAttribute('src')).toBe('/avatars/fox.svg');
    expect(image?.getAttribute('alt')).toBe('');
    expect(accountLink.firstElementChild?.getAttribute('data-slot')).toBe('avatar');
  });

  it('keeps the nickname and small avatar left-aligned in the mobile menu', async () => {
    await renderHeader();
    fireEvent.click(screen.getByRole('button', { name: esMessages.Header.menu.label }));
    const menu = await screen.findByRole('dialog', { name: esMessages.Header.menu.title });
    const accountLink = within(menu).getByRole('link', { name: accountLinkName });

    expect(accountLink.getAttribute('href')).toBe('/es/account/profile');
    expect(accountLink.className).toContain('justify-start');
    expect(accountLink.querySelector('[data-slot="avatar"]')?.getAttribute('data-size'))
      .toBe('sm');
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
      screen.queryByRole('link', { name: accountLinkName }),
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

  it('keeps public navigation visible while completing Google sign-in', async () => {
    pathname.current = `/es${APP_ROUTES.completeGoogleAuth}`;
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    await renderHeader();

    expect(screen.getByRole('link', { name: esMessages.Header.games })).toBeTruthy();
    expect(screen.queryByRole('link', { name: esMessages.Header.login })).toBeNull();
    expect(screen.queryByRole('link', { name: esMessages.Header.register })).toBeNull();
    expect(
      screen.getByRole('navigation', { name: esMessages.Header.navigation.main })
        .querySelector('[data-slot="skeleton"]'),
    ).toBeTruthy();
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

  it.each([false, true])(
    'propagates prerender cancellation without logging a session failure (side menu: %s)',
    async (isSideMenu) => {
      const error = Object.assign(new Error('Prerender completed while reading cookies.'), {
        digest: 'HANGING_PROMISE_REJECTION',
      });
      vi.mocked(getCurrentUser).mockRejectedValue(error);
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(HeaderAccountLinks({ isSideMenu })).rejects.toBe(error);

      expect(console.error).not.toHaveBeenCalled();
    },
  );

  it('propagates a framework interruption wrapped by a session error', async () => {
    const interruption = Object.assign(new Error('Prerender interrupted.'), {
      digest: 'NEXT_PRERENDER_INTERRUPTED',
    });
    vi.mocked(getCurrentUser).mockRejectedValue(
      new Error('Session lookup interrupted.', { cause: interruption }),
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(HeaderAccountLinks({})).rejects.toBe(interruption);

    expect(console.error).not.toHaveBeenCalled();
  });
});
