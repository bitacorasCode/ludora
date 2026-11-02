import { createTranslator } from 'next-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { redirect } from '@/i18n/navigation';
import { getCurrentUser } from '@/lib/auth';
import esMessages from '@/messages/es.json';

import { currentUser } from '../../../../../test/fixtures/current-user';
import { resolveSuspendedComponent } from '../../../../../test/resolve-suspended-component';
import { GuestOnly } from './guest-only';

vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('redirect');
  }),
}));
vi.mock('next-intl', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next-intl')>()),
  useTranslations: () =>
    createTranslator({
      locale: 'es',
      messages: esMessages,
      namespace: 'Common.status',
    }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getCurrentUser).mockReset();
});

describe('GuestOnly access', () => {
  it('renders its content for a guest', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const children = <p>Public form</p>;
    expect(
      await resolveSuspendedComponent(GuestOnly({ locale: 'es', children })),
    ).toBe(children);
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects an authenticated user to home preserving the locale', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(currentUser);
    await expect(
      resolveSuspendedComponent(GuestOnly({ locale: 'es', children: null })),
    ).rejects.toThrow('redirect');
    expect(redirect).toHaveBeenCalledExactlyOnceWith({
      href: '/',
      locale: 'es',
    });
  });

  it('allows a custom redirect destination', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(currentUser);
    await expect(
      resolveSuspendedComponent(
        GuestOnly({
          locale: 'es',
          redirectTo: '/account/preferences',
          children: null,
        }),
      ),
    ).rejects.toThrow('redirect');
    expect(redirect).toHaveBeenCalledExactlyOnceWith({
      href: '/account/preferences',
      locale: 'es',
    });
  });
});
