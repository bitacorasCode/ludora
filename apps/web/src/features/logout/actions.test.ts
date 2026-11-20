import { beforeEach, describe, expect, it, vi } from 'vitest';

import { redirect } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { OPERATION_STATUS } from '@/lib/actions';
import { publicApi } from '@/lib/api';
import { deleteSession, getRefreshToken } from '@/lib/session';

import { logoutUser } from './actions';

vi.mock('@/lib/session', () => ({ deleteSession: vi.fn(), getRefreshToken: vi.fn() }));
vi.mock('@/lib/api', () => ({
  publicApi: { post: vi.fn() },
}));
vi.mock('@/i18n/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('redirect');
  }),
}));

beforeEach(() => {
  vi.mocked(deleteSession).mockReset();
  vi.mocked(getRefreshToken).mockReset();
  vi.mocked(publicApi.post).mockReset();
  vi.mocked(redirect).mockClear();
});

describe('logoutUser', () => {
  it('revokes the session before clearing cookies and redirecting', async () => {
    vi.mocked(getRefreshToken).mockResolvedValue('opaque-refresh-token');
    vi.mocked(publicApi.post).mockResolvedValue({
      status: OPERATION_STATUS.success,
      data: { loggedOut: true },
    });
    await expect(logoutUser('es')).rejects.toThrow('redirect');
    expect(publicApi.post).toHaveBeenCalledExactlyOnceWith('/auth/logout', {
      refreshToken: 'opaque-refresh-token',
    });
    expect(deleteSession).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledExactlyOnceWith({
      href: '/',
      locale: 'es',
    });
    expect(publicApi.post).toHaveBeenCalledBefore(vi.mocked(deleteSession));
    expect(deleteSession).toHaveBeenCalledBefore(vi.mocked(redirect));
  });

  it('uses the default locale when the supplied locale is unsupported', async () => {
    await expect(logoutUser('unknown')).rejects.toThrow('redirect');
    expect(redirect).toHaveBeenCalledExactlyOnceWith({
      href: '/',
      locale: routing.defaultLocale,
    });
  });

  it('does not redirect if deleting the cookie fails', async () => {
    vi.mocked(deleteSession).mockRejectedValue(new Error('Cookie failure'));
    await expect(logoutUser('es')).rejects.toThrow('Cookie failure');
    expect(redirect).not.toHaveBeenCalled();
  });
});
