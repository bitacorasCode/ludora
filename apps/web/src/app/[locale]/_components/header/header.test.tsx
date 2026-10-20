import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import esMessages from '@/messages/es.json';

const auth = vi.hoisted(() => ({ isLoggedIn: true }));

vi.mock('@/config/auth', () => ({
  get isLoggedIn() {
    return auth.isLoggedIn;
  },
}));

beforeEach(() => {
  // Header builds its links when the module loads, so reload it for each session.
  vi.resetModules();
  auth.isLoggedIn = true;
});

afterEach(() => {
  cleanup();
});

async function renderHeader() {
  const [{ Header }, { NextIntlClientProvider }] = await Promise.all([
    import('./header'),
    import('next-intl'),
  ]);

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
    auth.isLoggedIn = false;
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
});
