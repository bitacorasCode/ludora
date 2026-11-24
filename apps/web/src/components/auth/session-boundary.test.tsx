import { act, cleanup, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OPERATION_STATUS } from '@/lib/actions';
import { refreshAccountSession, refreshSession } from '@/lib/session/actions';
import {
  type RefreshSessionResult,
  SESSION_REFRESH_OUTCOME,
} from '@/lib/session/refresh-result';

import { SessionBoundary, useSessionRecovery } from './session-boundary';

const router = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => router,
}));
vi.mock('@/lib/session/actions', () => ({
  refreshAccountSession: vi.fn(),
  refreshSession: vi.fn(),
  recordSessionActivity: vi.fn(),
}));

const renewed = { status: OPERATION_STATUS.success, data: SESSION_REFRESH_OUTCOME.renewed } as const;

function Boundary({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale='en'>
      <SessionBoundary>{children}</SessionBoundary>
    </NextIntlClientProvider>
  );
}

beforeEach(() => vi.resetAllMocks());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SessionBoundary', () => {
  it('shares a single renewal while the server action is pending', async () => {
    const action = Promise.withResolvers<RefreshSessionResult>();
    vi.mocked(refreshSession).mockReturnValue(action.promise);
    const { result } = renderHook(useSessionRecovery, { wrapper: Boundary });
    let first!: Promise<RefreshSessionResult>;
    let second!: Promise<RefreshSessionResult>;

    await act(async () => {
      first = result.current.recoverSession();
      second = result.current.recoverSession();
    });

    expect(first).toBe(second);
    expect(refreshSession).toHaveBeenCalledOnce();
    expect(result.current.isRecoveringSession).toBe(true);

    await act(async () => action.resolve(renewed));
    await expect(first).resolves.toEqual(renewed);
    expect(result.current.isRecoveringSession).toBe(false);
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('allows a subsequent recovery when the previous action has resolved', async () => {
    vi.mocked(refreshSession).mockResolvedValue(renewed);
    const { result } = renderHook(useSessionRecovery, { wrapper: Boundary });

    await act(async () => { await result.current.recoverSession(); });
    await act(async () => { await result.current.recoverSession(); });

    expect(refreshSession).toHaveBeenCalledTimes(2);
    expect(result.current.isRecoveringSession).toBe(false);
  });

  it.each([SESSION_REFRESH_OUTCOME.active, SESSION_REFRESH_OUTCOME.ended])(
    'refreshes the router when the server returns %s without installing new cookies',
    async (outcome) => {
      vi.mocked(refreshSession).mockResolvedValue({ status: OPERATION_STATUS.success, data: outcome });
      const { result } = renderHook(useSessionRecovery, { wrapper: Boundary });

      await act(async () => { await result.current.recoverSession(); });

      expect(router.refresh).toHaveBeenCalledOnce();
      expect(result.current.isRecoveringSession).toBe(false);
    },
  );

  it('settles a pending recovery when its server action completes after unmount', async () => {
    const action = Promise.withResolvers<RefreshSessionResult>();
    vi.mocked(refreshSession).mockReturnValue(action.promise);
    const { result, unmount } = renderHook(useSessionRecovery, { wrapper: Boundary });
    let recovery!: Promise<RefreshSessionResult>;

    await act(async () => { recovery = result.current.recoverSession(); });
    unmount();
    action.resolve(renewed);

    await expect(recovery).resolves.toEqual(renewed);
  });

  it('uses the localized recovery action inside Account', async () => {
    vi.mocked(refreshAccountSession).mockResolvedValue(renewed);
    const { result } = renderHook(useSessionRecovery, {
      wrapper: ({ children }) => (
        <NextIntlClientProvider locale='es'>
          <SessionBoundary inAccount>{children}</SessionBoundary>
        </NextIntlClientProvider>
      ),
    });

    await act(async () => { await result.current.recoverSession(); });

    expect(refreshAccountSession).toHaveBeenCalledExactlyOnceWith('es');
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('requires a boundary for session recovery', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(useSessionRecovery)).toThrow(
      'SessionBoundary is required to recover a session.',
    );
  });
});
