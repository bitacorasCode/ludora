import { beforeEach, describe, expect, it, vi } from 'vitest';

import { redirect } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { deleteSession } from '@/lib/session';

import { logoutUser } from './actions';

vi.mock('@/lib/session', () => ({ deleteSession: vi.fn() }));
vi.mock('@/i18n/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('redirect');
  }),
}));

beforeEach(() => {
  vi.mocked(deleteSession).mockReset();
  vi.mocked(redirect).mockClear();
});

describe('logoutUser', () => {
  it('deletes the cookie before redirecting with the active locale', async () => {
    await expect(logoutUser('es')).rejects.toThrow('redirect');
    expect(deleteSession).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledExactlyOnceWith({
      href: '/',
      locale: 'es',
    });
    expect(vi.mocked(deleteSession).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(redirect).mock.invocationCallOrder[0],
    );
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
