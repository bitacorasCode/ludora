import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { APP_ROUTES } from '@/config/routes';

import { installBrowserHistoryGuard } from './browser-history-guard';

const CURRENT_ENTRY_KEY = 'profile-entry';
const DESTINATION_ENTRY_KEY = 'games-entry';
const originalNavigation = Object.getOwnPropertyDescriptor(window, 'navigation');

type HistoryEntry = { key: string; sameDocument: boolean };

function createNavigation() {
  const entries: HistoryEntry[] = [
    { key: CURRENT_ENTRY_KEY, sameDocument: true },
    { key: DESTINATION_ENTRY_KEY, sameDocument: true },
  ];

  return Object.assign(new EventTarget(), {
    currentEntry: entries[0] as HistoryEntry | null,
    entries: vi.fn(() => entries),
    traverseTo: vi.fn((_key: string, _options?: { info?: unknown }) => ({
      committed: Promise.resolve(),
      finished: Promise.resolve(),
    })),
  });
}

function createNavigateEvent({
  navigationType = 'traverse',
  cancelable = true,
  sameDocument = true,
  url = new URL(APP_ROUTES.games, window.location.origin).href,
  key = DESTINATION_ENTRY_KEY,
  info,
}: {
  navigationType?: string;
  cancelable?: boolean;
  sameDocument?: boolean;
  url?: string;
  key?: string;
  info?: unknown;
} = {}) {
  return Object.assign(new Event('navigate', { cancelable }), {
    navigationType,
    destination: { key, url, sameDocument },
    info,
  });
}

let navigation: ReturnType<typeof createNavigation>;
let isBlocked: ReturnType<typeof vi.fn<() => boolean>>;
let requestNavigation: ReturnType<typeof vi.fn<(action: () => void) => void>>;
let dispose: (() => void) | undefined;

beforeEach(() => {
  window.history.replaceState({ __NA: true }, '', APP_ROUTES.accountProfile);
  navigation = createNavigation();
  isBlocked = vi.fn(() => true);
  requestNavigation = vi.fn();
  Object.defineProperty(window, 'navigation', {
    configurable: true,
    value: navigation,
  });
});

afterEach(() => {
  dispose?.();
  dispose = undefined;
  if (originalNavigation) {
    Object.defineProperty(window, 'navigation', originalNavigation);
  } else {
    Reflect.deleteProperty(window, 'navigation');
  }
  window.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

describe('installBrowserHistoryGuard', () => {
  it.each(['Navigation API', 'entries', 'traverseTo'] as const)(
    'preserves normal navigation without %s',
    (capability) => {
      const candidate = capability === 'Navigation API'
        ? undefined
        : Object.assign(navigation, { [capability]: undefined });
      Object.defineProperty(window, 'navigation', { value: candidate });

      expect(installBrowserHistoryGuard({ isBlocked, requestNavigation }))
        .toBeUndefined();
      expect(requestNavigation).not.toHaveBeenCalled();
    },
  );

  it('does not cancel history navigation when the form has no changes', () => {
    isBlocked.mockReturnValue(false);
    dispose = installBrowserHistoryGuard({ isBlocked, requestNavigation });
    const event = createNavigateEvent();

    navigation.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(requestNavigation).not.toHaveBeenCalled();
    expect(navigation.traverseTo).not.toHaveBeenCalled();
  });

  it.each([
    ['push', { navigationType: 'push' }],
    ['replace', { navigationType: 'replace' }],
    ['reload', { navigationType: 'reload' }],
    ['a noncancelable traversal', { cancelable: false }],
    ['another document', { sameDocument: false }],
    ['another origin', { url: 'https://example.com/games' }],
    ['the current route', { url: new URL(APP_ROUTES.accountProfile, window.location.origin).href }],
    ['a hash change', { url: new URL(`${APP_ROUTES.accountProfile}#bio`, window.location.origin).href }],
  ])('leaves %s to the browser', (_name, options) => {
    dispose = installBrowserHistoryGuard({ isBlocked, requestNavigation });
    const event = createNavigateEvent(options);

    navigation.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
    expect(requestNavigation).not.toHaveBeenCalled();
  });

  it('respects navigation already cancelled by another handler', () => {
    dispose = installBrowserHistoryGuard({ isBlocked, requestNavigation });
    const event = createNavigateEvent();
    event.preventDefault();

    navigation.dispatchEvent(event);

    expect(requestNavigation).not.toHaveBeenCalled();
    expect(navigation.traverseTo).not.toHaveBeenCalled();
  });

  it('cancels a dirty traversal and defers the original entry until confirmation', () => {
    dispose = installBrowserHistoryGuard({ isBlocked, requestNavigation });
    const event = createNavigateEvent();
    const originalHref = window.location.href;
    const originalState = window.history.state;

    navigation.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(requestNavigation).toHaveBeenCalledOnce();
    expect(navigation.traverseTo).not.toHaveBeenCalled();
    expect(window.location.href).toBe(originalHref);
    expect(window.history.state).toEqual(originalState);

    requestNavigation.mock.calls[0][0]();

    expect(navigation.traverseTo).toHaveBeenCalledExactlyOnceWith(
      DESTINATION_ENTRY_KEY,
      { info: expect.any(Symbol) },
    );
  });

  it('does not ask again when the confirmed traversal is replayed', () => {
    dispose = installBrowserHistoryGuard({ isBlocked, requestNavigation });
    navigation.dispatchEvent(createNavigateEvent());
    requestNavigation.mock.calls[0][0]();
    const [, options] = navigation.traverseTo.mock.calls[0];
    const approvedEvent = createNavigateEvent({ info: options?.info });

    navigation.dispatchEvent(approvedEvent);

    expect(approvedEvent.defaultPrevented).toBe(false);
    expect(requestNavigation).toHaveBeenCalledOnce();
    expect(navigation.traverseTo).toHaveBeenCalledOnce();
  });

  it.each(['source entry', 'source URL', 'missing destination', 'different document'] as const)(
    'discards a pending traversal after a change to its %s',
    (change) => {
      dispose = installBrowserHistoryGuard({ isBlocked, requestNavigation });
      navigation.dispatchEvent(createNavigateEvent());

      if (change === 'source entry') {
        navigation.currentEntry = { key: 'new-entry', sameDocument: true };
      } else if (change === 'source URL') {
        window.history.replaceState(null, '', APP_ROUTES.accountSettings);
      } else if (change === 'missing destination') {
        navigation.entries.mockReturnValue([]);
      } else {
        navigation.entries.mockReturnValue([
          { key: DESTINATION_ENTRY_KEY, sameDocument: false },
        ]);
      }

      requestNavigation.mock.calls[0][0]();

      expect(navigation.traverseTo).not.toHaveBeenCalled();
    },
  );

  it('removes its listener and discards pending work when disposed', () => {
    dispose = installBrowserHistoryGuard({ isBlocked, requestNavigation });
    navigation.dispatchEvent(createNavigateEvent());
    dispose?.();
    requestNavigation.mock.calls[0][0]();
    const laterEvent = createNavigateEvent();

    navigation.dispatchEvent(laterEvent);

    expect(laterEvent.defaultPrevented).toBe(false);
    expect(requestNavigation).toHaveBeenCalledOnce();
    expect(navigation.traverseTo).not.toHaveBeenCalled();
  });

  it('handles a confirmed traversal cancelled by a competing navigation', async () => {
    dispose = installBrowserHistoryGuard({ isBlocked, requestNavigation });
    navigation.dispatchEvent(createNavigateEvent());
    navigation.traverseTo.mockImplementationOnce(() => ({
      committed: Promise.reject(new DOMException('Navigation cancelled', 'AbortError')),
      finished: Promise.reject(new DOMException('Navigation cancelled', 'AbortError')),
    }));

    requestNavigation.mock.calls[0][0]();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(navigation.traverseTo).toHaveBeenCalledOnce();
  });
});
