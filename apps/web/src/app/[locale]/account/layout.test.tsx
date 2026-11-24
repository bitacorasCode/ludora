import { cleanup, render, screen } from '@testing-library/react';
import { createTranslator, NextIntlClientProvider } from 'next-intl';
import type { ComponentProps } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES } from '@/lib/api/constants';
import { getCurrentUserResult } from '@/lib/auth';
import esMessages from '@/messages/es.json';

import { currentUser } from '../../../../test/fixtures/current-user';
import { SessionRecovery } from '../_components/auth/session-recovery';
import { AccountAccess } from './_components/account-access';
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

vi.mock('@/lib/auth', () => ({ getCurrentUserResult: vi.fn() }));
vi.mock('@/lib/session', () => ({ getRefreshToken: vi.fn(), getSessionToken: vi.fn() }));
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
  vi.mocked(getCurrentUserResult).mockResolvedValue({
    status: OPERATION_STATUS.success,
    data: currentUser,
  });
});
afterEach(() => cleanup());

describe('AccountLayout access', () => {
  it('redirects a guest to login preserving the locale', async () => {
    vi.mocked(getCurrentUserResult).mockResolvedValue({
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.authenticationRequired },
    });
    const children = vi.fn(() => <p>Private</p>);
    await expect(AccountAccess({ locale: 'es', children })).rejects.toThrow('redirect');
    expect(children).not.toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledExactlyOnceWith({
      href: '/login',
      locale: 'es',
    });
  });

  it('renders the account navigation and content for a signed-in user', () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        {AccountLayout({ children: <p>Private</p>, params: Promise.resolve({ locale: 'es' }) })}
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

  it('keeps the API error available for retry inside Account', async () => {
    const error = { errorCode: API_ERROR_CODES.unavailable };
    vi.mocked(getCurrentUserResult).mockResolvedValue({ status: OPERATION_STATUS.error, error });
    const children = vi.fn(() => <p>Private</p>);
    const fallback = <p>Loading</p>;

    await expect(AccountAccess({ locale: 'es', children, fallback })).resolves.toMatchObject({
      type: SessionRecovery,
      props: { inAccount: true, initialError: error, fallback },
    });
    expect(children).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
