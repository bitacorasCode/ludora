import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import {
  type ReactNode,
  Suspense,
  use,
  useLayoutEffect,
  useState,
} from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionBoundary, useSessionRecovery } from './session-boundary';

const router = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => router }));

function createRefresh() {
  let resolve!: () => void;
  const promise = new Promise<void>((finish) => {
    resolve = finish;
  });

  return { promise, resolve };
}

let refresh = createRefresh();

function RefreshedRoute({ resource }: { resource: Promise<void> | null }) {
  if (resource) use(resource);

  return null;
}

function Wrapper({ children }: { children: ReactNode }) {
  const [resource, setResource] = useState<Promise<void> | null>(null);

  useLayoutEffect(() => {
    router.refresh.mockImplementation(() => setResource(refresh.promise));
  }, []);

  return (
    <SessionBoundary>
      <Suspense fallback={<p>Loading session</p>}>
        <RefreshedRoute resource={resource} />
        {children}
      </Suspense>
    </SessionBoundary>
  );
}

beforeEach(() => {
  router.refresh.mockReset();
  refresh = createRefresh();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('SessionBoundary', () => {
  it('shares one recovery and waits until the refreshed route finishes rendering', async () => {
    const { result } = renderHook(() => useSessionRecovery(), {
      wrapper: Wrapper,
    });
    const completed = vi.fn();
    let first!: Promise<void>;
    let second!: Promise<void>;

    expect(result.current.isRecoveringSession).toBe(false);

    await act(async () => {
      first = result.current.recoverSession();
      second = result.current.recoverSession();
      void first.then(completed);
    });

    expect(first).toBe(second);
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(result.current.isRecoveringSession).toBe(true);
    expect(completed).not.toHaveBeenCalled();

    await act(async () => {
      refresh.resolve();
      await refresh.promise;
    });
    await first;

    expect(result.current.isRecoveringSession).toBe(false);
    expect(completed).toHaveBeenCalledOnce();
  });

  it('allows another recovery after the previous refresh completes', async () => {
    const { result } = renderHook(() => useSessionRecovery(), {
      wrapper: Wrapper,
    });
    let first!: Promise<void>;

    await act(async () => {
      first = result.current.recoverSession();
    });
    await act(async () => {
      refresh.resolve();
      await refresh.promise;
    });
    await first;

    refresh = createRefresh();
    let second!: Promise<void>;

    await act(async () => {
      second = result.current.recoverSession();
    });

    expect(second).not.toBe(first);
    expect(router.refresh).toHaveBeenCalledTimes(2);
    expect(result.current.isRecoveringSession).toBe(true);

    await act(async () => {
      refresh.resolve();
      await refresh.promise;
    });
    await second;

    expect(result.current.isRecoveringSession).toBe(false);
  });

  it('finishes a refresh that does not suspend without leaving recovery locked', async () => {
    const { result } = renderHook(() => useSessionRecovery(), {
      wrapper: Wrapper,
    });
    router.refresh.mockImplementation(() => undefined);
    const completed = vi.fn();

    await act(async () => {
      void result.current.recoverSession().then(completed);
    });

    await waitFor(() => expect(completed).toHaveBeenCalledOnce());
    expect(result.current.isRecoveringSession).toBe(false);
  });

  it('releases pending consumers if the boundary unmounts during recovery', async () => {
    const { result, unmount } = renderHook(() => useSessionRecovery(), {
      wrapper: Wrapper,
    });
    let recovery!: Promise<void>;

    await act(async () => {
      recovery = result.current.recoverSession();
    });

    unmount();

    await expect(recovery).resolves.toBeUndefined();
    refresh.resolve();
  });

  it('requires a boundary for session recovery', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useSessionRecovery())).toThrow(
      'SessionBoundary is required to recover a session.',
    );
  });
});
