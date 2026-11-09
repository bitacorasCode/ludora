import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { type ComponentProps, createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GuardedLink } from './guarded-link';

const navigation = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  nativeNavigation: vi.fn(),
  isBlocked: vi.fn(() => false),
  requestNavigation: vi.fn<(action: () => void) => void>(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => navigation }));
vi.mock('./navigation-guard-provider', () => ({
  useNavigationGuard: () => navigation,
}));
vi.mock('@/i18n/navigation', () => ({
  // Model only the Link event contract; real routing is covered in Playwright.
  Link: ({
    href,
    onClick,
    onNavigate,
    replace: _replace,
    scroll: _scroll,
    transitionTypes: _transitionTypes,
    locale = 'es',
    ...props
  }: Omit<ComponentProps<'a'>, 'href'> & {
    href: string;
    onNavigate?: (event: { preventDefault: () => void }) => void;
    replace?: boolean;
    scroll?: boolean;
    transitionTypes?: string[];
    locale?: string;
  }) => {
    const localizedHref = href.startsWith('/') ? `/${locale}${href}` : href;

    return (
      <a
        {...props}
        href={localizedHref}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented) return;

          event.preventDefault();
          const destination = event.currentTarget.href;
          if (
            event.ctrlKey || event.metaKey || event.shiftKey || event.altKey
            || props.target === '_blank' || props.download !== undefined
            || new URL(destination).origin !== window.location.origin
          ) return;

          let cancelled = false;
          onNavigate?.({ preventDefault: () => { cancelled = true; } });
          if (!cancelled) navigation.nativeNavigation(destination);
        }}
      />
    );
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  navigation.isBlocked.mockReturnValue(false);
  window.history.replaceState(null, '', '/es/account/profile');
});

afterEach(() => {
  cleanup();
});

describe('GuardedLink', () => {
  it('keeps normal Link navigation when there are no pending changes', () => {
    render(<GuardedLink href='/games'>Juegos</GuardedLink>);
    fireEvent.click(screen.getByRole('link', { name: 'Juegos' }));

    expect(navigation.nativeNavigation).toHaveBeenCalledExactlyOnceWith(
      `${window.location.origin}/es/games`,
    );
    expect(navigation.requestNavigation).not.toHaveBeenCalled();
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it('waits for confirmation and then navigates to the resolved localized URL', () => {
    navigation.isBlocked.mockReturnValue(true);
    render(<GuardedLink href='/games?sort=name#catalog'>Juegos</GuardedLink>);
    fireEvent.click(screen.getByRole('link', { name: 'Juegos' }));

    expect(navigation.nativeNavigation).not.toHaveBeenCalled();
    expect(navigation.push).not.toHaveBeenCalled();
    expect(navigation.requestNavigation).toHaveBeenCalledOnce();
    const [confirm] = navigation.requestNavigation.mock.calls[0];
    confirm();
    expect(navigation.push).toHaveBeenCalledExactlyOnceWith(
      `${window.location.origin}/es/games?sort=name#catalog`,
      { scroll: undefined, transitionTypes: undefined },
    );
  });

  it('preserves replace, scroll, and transition options after confirmation', () => {
    navigation.isBlocked.mockReturnValue(true);
    render(
      <GuardedLink href='/ranking' replace scroll={false} transitionTypes={['ranking']}>
        Ranking
      </GuardedLink>,
    );
    fireEvent.click(screen.getByRole('link', { name: 'Ranking' }));
    const [confirm] = navigation.requestNavigation.mock.calls[0];
    confirm();

    expect(navigation.replace).toHaveBeenCalledExactlyOnceWith(
      `${window.location.origin}/es/ranking`,
      { scroll: false, transitionTypes: ['ranking'] },
    );
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it('lets the consumer cancel onNavigate without scheduling another navigation', () => {
    navigation.isBlocked.mockReturnValue(true);
    const onNavigate = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    render(<GuardedLink href='/games' onNavigate={onNavigate}>Juegos</GuardedLink>);
    fireEvent.click(screen.getByRole('link', { name: 'Juegos' }));

    expect(onNavigate).toHaveBeenCalledOnce();
    expect(navigation.requestNavigation).not.toHaveBeenCalled();
    expect(navigation.nativeNavigation).not.toHaveBeenCalled();
  });

  it('preserves consumer click cancellation and forwards the anchor ref', () => {
    navigation.isBlocked.mockReturnValue(true);
    const ref = createRef<HTMLAnchorElement>();
    render(
      <GuardedLink href='/games' ref={ref} onClick={(event) => event.preventDefault()}>
        Juegos
      </GuardedLink>,
    );
    const link = screen.getByRole('link', { name: 'Juegos' });
    fireEvent.click(link);

    expect(ref.current).toBe(link);
    expect(navigation.requestNavigation).not.toHaveBeenCalled();
    expect(navigation.nativeNavigation).not.toHaveBeenCalled();
  });

  it('keeps navigation within the current document and its anchors unblocked', () => {
    navigation.isBlocked.mockReturnValue(true);
    render(<GuardedLink href='/account/profile#bio'>Biografía</GuardedLink>);
    fireEvent.click(screen.getByRole('link', { name: 'Biografía' }));

    expect(navigation.requestNavigation).not.toHaveBeenCalled();
    expect(navigation.nativeNavigation).toHaveBeenCalledOnce();
  });

  it.each([{ ctrlKey: true }, { metaKey: true }])(
    'keeps modified clicks unblocked: %j',
    (modifier) => {
      navigation.isBlocked.mockReturnValue(true);
      render(<GuardedLink href='/games'>Juegos</GuardedLink>);
      fireEvent.click(screen.getByRole('link', { name: 'Juegos' }), modifier);
      expect(navigation.requestNavigation).not.toHaveBeenCalled();
    },
  );

  it('keeps external links unblocked', () => {
    navigation.isBlocked.mockReturnValue(true);
    render(<GuardedLink href='https://example.test/'>External</GuardedLink>);
    fireEvent.click(screen.getByRole('link', { name: 'External' }));
    expect(navigation.requestNavigation).not.toHaveBeenCalled();
  });
});
