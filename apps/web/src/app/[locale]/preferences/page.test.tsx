import { cleanup, render, screen } from '@testing-library/react';
import { createTranslator } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentUser } from '@/lib/auth';
import esMessages from '@/messages/es.json';

import { currentUser } from '../../../../test/fixtures/current-user';
import { resolveSuspendedComponent } from '../../../../test/resolve-suspended-component';
import { GuestOnly } from '../_components/auth/guest-only';
import PreferencesPage from './page';

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn(() => {
    throw new Error('redirect');
  }),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({ redirect }));
vi.mock('next-intl', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next-intl')>()),
  useTranslations: () =>
    createTranslator({
      locale: 'es',
      messages: esMessages,
      namespace: 'Common.status',
    }),
}));
vi.mock('next-intl/server', () => ({
  getTranslations: async () =>
    createTranslator({
      locale: 'es',
      messages: esMessages,
      namespace: 'Preferences',
    }),
}));
vi.mock('@/features/preferences', () => ({
  PreferencesPageContent: () => <p>Preferencias públicas</p>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockReset();
});
afterEach(() => cleanup());

async function getContent() {
  const page = await PreferencesPage({
    params: Promise.resolve({ locale: 'es' }),
    searchParams: Promise.resolve({}),
  });
  return resolveSuspendedComponent(GuestOnly(page.props));
}

describe('PreferencesPage access', () => {
  it('redirects a signed-in user to account preferences', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(currentUser);
    await expect(getContent()).rejects.toThrow('redirect');
    expect(redirect).toHaveBeenCalledExactlyOnceWith({
      href: '/account/preferences',
      locale: 'es',
    });
  });

  it('renders public preferences for a guest', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    render(await getContent());
    expect(screen.getByText('Preferencias públicas')).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('propagates a session lookup failure', async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error('API_UNAVAILABLE'));
    await expect(getContent()).rejects.toThrow('API_UNAVAILABLE');
    expect(redirect).not.toHaveBeenCalled();
  });
});
