import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import esMessages from '@/messages/es.json';

import PreferencesPage from './page';

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
vi.mock('@/i18n/navigation', () => ({ redirect }));
vi.mock('next-intl/server', () => ({
  getTranslations: async () => (key: keyof typeof esMessages.Preferences) =>
    esMessages.Preferences[key],
}));
vi.mock('@/features/preferences', () => ({
  PreferencesPageContent: () => <p>Preferencias públicas</p>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('PreferencesPage access', () => {
  it('redirects a signed-in user to account preferences', async () => {
    auth.loggedIn = true;
    await expect(
      PreferencesPage({
        params: Promise.resolve({ locale: 'es' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('redirect');
    expect(redirect).toHaveBeenCalledExactlyOnceWith({
      href: '/account/preferences',
      locale: 'es',
    });
  });

  it('renders public preferences for a guest', async () => {
    auth.loggedIn = false;
    const content = await PreferencesPage({
      params: Promise.resolve({ locale: 'es' }),
      searchParams: Promise.resolve({}),
    });
    render(content);
    expect(screen.getByText('Preferencias públicas')).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });
});
