import { act, cleanup, renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import {
  Activity,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useLayoutEffect,
  useState,
} from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionBoundary } from '@/components/auth';
import { type ActionResult, OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, HTTP_STATUS } from '@/lib/api/constants';
import { refreshSession } from '@/lib/session/actions';
import {
  type RefreshSessionResult,
  SESSION_REFRESH_OUTCOME,
} from '@/lib/session/refresh-result';

import { useProtectedRequest } from './use-protected-request';

const router = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => router,
}));
vi.mock('@/lib/session/actions', () => ({
  refreshSession: vi.fn(),
  recordSessionActivity: vi.fn(),
}));

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((finish, fail) => {
    resolve = finish;
    reject = fail;
  });

  return { promise, resolve, reject };
}

type ActivityMode = 'visible' | 'hidden';

const renewed = { status: OPERATION_STATUS.success, data: SESSION_REFRESH_OUTCOME.renewed } as const;
let recovery = createDeferred<RefreshSessionResult>();
let setActivityMode!: Dispatch<SetStateAction<ActivityMode>>;

function Wrapper({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ActivityMode>('visible');

  useLayoutEffect(() => {
    setActivityMode = setMode;
  }, []);

  return (
    <NextIntlClientProvider locale='en'>
      <SessionBoundary>
        <Activity mode={mode}>{children}</Activity>
      </SessionBoundary>
    </NextIntlClientProvider>
  );
}

const success = {
  status: OPERATION_STATUS.success,
  data: { bio: 'My biography' },
} as const;
const authenticationFailure = {
  status: OPERATION_STATUS.error,
  error: {
    errorCode: API_ERROR_CODES.authenticationRequired,
    statusCode: HTTP_STATUS.unauthorized,
  },
} as const;

beforeEach(() => {
  router.refresh.mockReset();
  recovery = createDeferred<RefreshSessionResult>();
  vi.mocked(refreshSession).mockReset().mockReturnValue(recovery.promise);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('useProtectedRequest', () => {
  it('returns successful data without recovering the session', async () => {
    const { result } = renderHook(() => useProtectedRequest(), {
      wrapper: Wrapper,
    });
    const operation = vi.fn().mockResolvedValue(success);

    await expect(result.current.execute(operation)).resolves.toEqual(success);
    expect(operation).toHaveBeenCalledOnce();
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it.each([
    { errorCode: API_ERROR_CODES.unavailable, statusCode: HTTP_STATUS.serviceUnavailable },
    { errorCode: 'RATE_LIMIT_EXCEEDED', statusCode: HTTP_STATUS.tooManyRequests, retryAfterSeconds: 30 },
    { errorCode: 'ACTION_VALIDATION_FAILED', statusCode: HTTP_STATUS.badRequest },
  ])('preserves non-session failures: $errorCode', async (error) => {
    const { result } = renderHook(() => useProtectedRequest(), {
      wrapper: Wrapper,
    });
    const failure = { status: OPERATION_STATUS.error, error } as const;
    const operation = vi.fn().mockResolvedValue(failure);

    await expect(result.current.execute(operation)).resolves.toEqual(failure);
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('does not replay a mutation when the session has ended', async () => {
    const { result } = renderHook(() => useProtectedRequest(), {
      wrapper: Wrapper,
    });
    const operation = vi.fn().mockResolvedValue(authenticationFailure);
    let pending!: ReturnType<typeof result.current.execute>;

    await act(async () => {
      pending = result.current.execute(operation);
    });

    expect(refreshSession).toHaveBeenCalledOnce();
    expect(result.current.isRecoveringSession).toBe(true);
    expect(operation).toHaveBeenCalledOnce();

    await act(async () => {
      recovery.resolve({ status: OPERATION_STATUS.success, data: SESSION_REFRESH_OUTCOME.ended });
      await recovery.promise;
    });

    await expect(pending).resolves.toBeNull();
    expect(operation).toHaveBeenCalledOnce();
    expect(router.refresh).toHaveBeenCalledOnce();
  });

  it('retries a rejected operation once after the server renews the session', async () => {
    const { result } = renderHook(() => useProtectedRequest(), {
      wrapper: Wrapper,
    });
    const operation = vi.fn()
      .mockResolvedValueOnce(authenticationFailure)
      .mockResolvedValueOnce(success);
    let pending!: ReturnType<typeof result.current.execute>;

    await act(async () => {
      pending = result.current.execute(operation);
    });

    expect(operation).toHaveBeenCalledOnce();

    await act(async () => {
      recovery.resolve(renewed);
      await recovery.promise;
    });

    await expect(pending).resolves.toEqual(success);
    expect(operation).toHaveBeenCalledTimes(2);
    expect(refreshSession).toHaveBeenCalledOnce();
  });

  it('returns a second authentication failure without starting a recovery loop', async () => {
    const { result } = renderHook(() => useProtectedRequest(), {
      wrapper: Wrapper,
    });
    const operation = vi.fn().mockResolvedValue(authenticationFailure);
    let pending!: ReturnType<typeof result.current.execute>;

    await act(async () => {
      pending = result.current.execute(operation);
    });
    await act(async () => {
      recovery.resolve(renewed);
      await recovery.promise;
    });

    await expect(pending).resolves.toEqual(authenticationFailure);
    expect(operation).toHaveBeenCalledTimes(2);
    expect(refreshSession).toHaveBeenCalledOnce();
  });

  it('does not start an already aborted request', async () => {
    const { result } = renderHook(() => useProtectedRequest(), {
      wrapper: Wrapper,
    });
    const controller = new AbortController();
    controller.abort();
    const operation = vi.fn().mockResolvedValue(success);

    await expect(result.current.execute(operation, {
      signal: controller.signal,
    })).resolves.toBeNull();
    expect(operation).not.toHaveBeenCalled();
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('ignores an authentication response after its request was aborted', async () => {
    const { result } = renderHook(() => useProtectedRequest(), {
      wrapper: Wrapper,
    });
    const response = createDeferred<ActionResult<null>>();
    const controller = new AbortController();
    const pending = result.current.execute(() => response.promise, {
      signal: controller.signal,
    });

    controller.abort();
    response.resolve(authenticationFailure);

    await expect(pending).resolves.toBeNull();
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('does not retry a query aborted while the session is being recovered', async () => {
    const { result } = renderHook(() => useProtectedRequest(), {
      wrapper: Wrapper,
    });
    const controller = new AbortController();
    const operation = vi.fn().mockResolvedValue(authenticationFailure);
    let pending!: ReturnType<typeof result.current.execute>;

    await act(async () => {
      pending = result.current.execute(operation, {
        signal: controller.signal,
      });
    });
    controller.abort();
    await act(async () => {
      recovery.resolve(renewed);
      await recovery.promise;
    });

    await expect(pending).resolves.toBeNull();
    expect(operation).toHaveBeenCalledOnce();
  });

  it('ignores a late response after the requesting component unmounts', async () => {
    const { result, unmount } = renderHook(() => useProtectedRequest(), {
      wrapper: Wrapper,
    });
    const response = createDeferred<ActionResult<null>>();
    const pending = result.current.execute(() => response.promise);

    unmount();
    response.resolve(authenticationFailure);

    await expect(pending).resolves.toBeNull();
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('ignores a previous activity generation even after the route becomes visible again', async () => {
    const { result } = renderHook(() => useProtectedRequest(), {
      wrapper: Wrapper,
    });
    const response = createDeferred<ActionResult<null>>();
    const pending = result.current.execute(() => response.promise);

    act(() => setActivityMode('hidden'));
    act(() => setActivityMode('visible'));
    response.resolve(authenticationFailure);

    await expect(pending).resolves.toBeNull();
    expect(refreshSession).not.toHaveBeenCalled();
    await expect(result.current.execute(async () => success)).resolves.toEqual(
      success,
    );
  });

  it('propagates unexpected failures from an active request', async () => {
    const { result } = renderHook(() => useProtectedRequest(), {
      wrapper: Wrapper,
    });
    const operation = vi.fn().mockRejectedValue(new Error('Invalid API configuration'));

    await expect(result.current.execute(operation)).rejects.toThrow(
      'Invalid API configuration',
    );
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it('ignores a rejected request after its activity was hidden', async () => {
    const { result } = renderHook(() => useProtectedRequest(), {
      wrapper: Wrapper,
    });
    const response = createDeferred<ActionResult<null>>();
    const pending = result.current.execute(() => response.promise);

    act(() => setActivityMode('hidden'));
    response.reject(new Error('Request no longer relevant'));

    await expect(pending).resolves.toBeNull();
    expect(refreshSession).not.toHaveBeenCalled();
  });
});
