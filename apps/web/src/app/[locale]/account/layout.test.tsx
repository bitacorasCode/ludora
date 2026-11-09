import { cleanup, render, screen } from '@testing-library/react';
import { createTranslator, NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NavigationGuardProvider } from '@/components/navigation';
import { getCurrentUser } from '@/lib/auth';
import esMessages from '@/messages/es.json';

import { currentUser } from '../../../../test/fixtures/current-user';
import { resolveSuspendedComponent } from '../../../../test/resolve-suspended-component';
import AccountLayout from './layout';

const router = vi.hoisted(() => ({
  refresh: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => router,
}));

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn(() => {
    throw new Error('redirect');
  }),
}));

vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }));
vi.mock('@/features/logout', () => ({
  LogoutButton: () => <button>Log out</button>,
}));
vi.mock('@/i18n/navigation', () => ({
  redirect,
  Link: (props: ComponentProps<'a'> & { onNavigate?: unknown }) => {
    const anchorProps = { ...props };
    delete anchorProps.onNavigate;
    return <a {...anchorProps} />;
  },
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
    children: <p>Private</p>,
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
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>{await getContent()}</NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    expect(screen.getByText('Private')).toBeTruthy();
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
