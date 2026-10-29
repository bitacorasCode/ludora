import { act, cleanup, renderHook } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCountdown } from './use-countdown';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-29T12:00:00.000Z'));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useCountdown', () => {
  it('starts without a waiting period by default', () => {
    const { result } = renderHook(() => useCountdown());

    expect(result.current.secondsRemaining).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('counts down from the initial waiting time', () => {
    const { result } = renderHook(() => useCountdown(3));

    expect(result.current.secondsRemaining).toBe(3);
    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current.secondsRemaining).toBe(2);
  });

  it('stops at zero and clears its interval', () => {
    const { result } = renderHook(() => useCountdown(2));

    act(() => vi.advanceTimersByTime(5_000));

    expect(result.current.secondsRemaining).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('restarts an active countdown with the new waiting time', () => {
    const { result } = renderHook(() => useCountdown(3));

    act(() => vi.advanceTimersByTime(1_000));
    act(() => result.current.restart(5));
    expect(result.current.secondsRemaining).toBe(5);

    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current.secondsRemaining).toBe(4);
  });

  it('starts a new countdown after the previous one finishes', () => {
    const { result } = renderHook(() => useCountdown(1));

    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current.secondsRemaining).toBe(0);

    act(() => result.current.restart(2));
    expect(result.current.secondsRemaining).toBe(2);
    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current.secondsRemaining).toBe(1);
  });

  it.each([
    { seconds: 2.1, expected: 3 },
    { seconds: -5, expected: 0 },
    { seconds: 0, expected: 0 },
  ])('normalizes a restarted waiting time: $seconds', ({ seconds, expected }) => {
    const { result } = renderHook(() => useCountdown());

    act(() => result.current.restart(seconds));

    expect(result.current.secondsRemaining).toBe(expected);
  });

  it('uses elapsed time when the clock advances between interval callbacks', () => {
    const { result } = renderHook(() => useCountdown(60));

    vi.setSystemTime(new Date('2026-10-29T12:01:00.000Z'));
    act(() => vi.advanceTimersByTime(250));

    expect(result.current.secondsRemaining).toBe(0);
  });

  it('keeps a single countdown in Strict Mode', () => {
    const { result } = renderHook(() => useCountdown(3), {
      wrapper: StrictMode,
    });

    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(1_000));
    expect(result.current.secondsRemaining).toBe(2);
  });

  it('clears its interval when the component unmounts', () => {
    const { unmount } = renderHook(() => useCountdown(60));

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
