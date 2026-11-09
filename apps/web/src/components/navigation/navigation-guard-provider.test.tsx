import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Activity } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { APP_ROUTES } from '@/config/routes';
import esMessages from '@/messages/es.json';

import { NavigationGuardProvider, useUnsavedChanges } from './navigation-guard-provider';

const messages = esMessages.Common.unsavedChanges;
const originalNavigation = Object.getOwnPropertyDescriptor(window, 'navigation');

function createHistoryNavigation() {
  const currentEntry = { key: 'profile-entry', sameDocument: true };
  const destination = {
    key: 'games-entry',
    sameDocument: true,
    url: new URL(APP_ROUTES.games, window.location.origin).href,
  };
  const navigation = Object.assign(new EventTarget(), {
    currentEntry,
    entries: () => [currentEntry, destination],
    traverseTo: vi.fn((_key: string, _options?: { info?: unknown }) => ({
      committed: Promise.resolve(),
      finished: Promise.resolve(),
    })),
  });

  Object.defineProperty(window, 'navigation', {
    configurable: true,
    value: navigation,
  });

  function navigate(info?: unknown) {
    const event = Object.assign(new Event('navigate', { cancelable: true }), {
      navigationType: 'traverse',
      destination,
      info,
    });
    act(() => { navigation.dispatchEvent(event); });
    return event;
  }

  return { navigation, destination, navigate };
}

function Form({ dirty, onLeave }: { dirty: boolean; onLeave: () => void }) {
  const { requestNavigation } = useUnsavedChanges(dirty);

  return <button onClick={() => requestNavigation(onLeave)}>Salir</button>;
}

afterEach(() => {
  cleanup();
  if (originalNavigation) {
    Object.defineProperty(window, 'navigation', originalNavigation);
  } else {
    Reflect.deleteProperty(window, 'navigation');
  }
  vi.restoreAllMocks();
});

describe('NavigationGuardProvider', () => {
  it('leaves immediately when no form has changes', () => {
    const onLeave = vi.fn();
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <Form dirty={false} onLeave={onLeave} />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));

    expect(onLeave).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('keeps the action pending and lets the user keep editing', async () => {
    const onLeave = vi.fn();
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <Form dirty onLeave={onLeave} />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));

    expect(screen.getByRole('alertdialog', { name: messages.title })).toBeTruthy();
    expect(screen.getByText(messages.description)).toBeTruthy();
    expect(onLeave).not.toHaveBeenCalled();
    const keepEditing = screen.getByRole('button', { name: messages.cancel });
    await waitFor(() => expect(document.activeElement).toBe(keepEditing));
    fireEvent.click(keepEditing);

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('executes the pending action once after confirmation', async () => {
    const onLeave = vi.fn();
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <Form dirty onLeave={onLeave} />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));
    fireEvent.click(screen.getByRole('button', { name: messages.confirm }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(onLeave).toHaveBeenCalledOnce();
  });

  it('protects browser unload only while unsaved changes are registered', () => {
    const onLeave = vi.fn();
    const { rerender } = render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <Form dirty onLeave={onLeave} />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    const dirtyUnload = new Event('beforeunload', { cancelable: true });
    act(() => { window.dispatchEvent(dirtyUnload); });
    expect(dirtyUnload.defaultPrevented).toBe(true);

    rerender(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <Form dirty={false} onLeave={onLeave} />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    const cleanUnload = new Event('beforeunload', { cancelable: true });
    act(() => { window.dispatchEvent(cleanUnload); });
    expect(cleanUnload.defaultPrevented).toBe(false);
  });

  it('keeps unload protected until the last dirty form unregisters', () => {
    function Forms({ firstDirty, secondDirty }: { firstDirty: boolean; secondDirty: boolean }) {
      return (
        <NextIntlClientProvider locale='es' messages={esMessages}>
          <NavigationGuardProvider>
            <Form dirty={firstDirty} onLeave={vi.fn()} />
            <Form dirty={secondDirty} onLeave={vi.fn()} />
          </NavigationGuardProvider>
        </NextIntlClientProvider>
      );
    }

    const { rerender } = render(<Forms firstDirty secondDirty />);
    rerender(<Forms firstDirty={false} secondDirty />);
    const oneDirty = new Event('beforeunload', { cancelable: true });
    act(() => { window.dispatchEvent(oneDirty); });
    expect(oneDirty.defaultPrevented).toBe(true);

    rerender(<Forms firstDirty={false} secondDirty={false} />);
    const noneDirty = new Event('beforeunload', { cancelable: true });
    act(() => { window.dispatchEvent(noneDirty); });
    expect(noneDirty.defaultPrevented).toBe(false);
  });

  it('unregisters hidden forms and discards their pending navigation', async () => {
    const onLeave = vi.fn();
    function View({ mode }: { mode: 'visible' | 'hidden' }) {
      return (
        <NextIntlClientProvider locale='es' messages={esMessages}>
          <NavigationGuardProvider>
            <Activity mode={mode}>
              <Form dirty onLeave={onLeave} />
            </Activity>
          </NavigationGuardProvider>
        </NextIntlClientProvider>
      );
    }

    const { rerender } = render(<View mode='visible' />);
    fireEvent.click(screen.getByRole('button', { name: 'Salir' }));
    expect(screen.getByRole('alertdialog')).toBeTruthy();
    rerender(<View mode='hidden' />);

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    const unload = new Event('beforeunload', { cancelable: true });
    act(() => { window.dispatchEvent(unload); });
    expect(unload.defaultPrevented).toBe(false);
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('allows cancelling and then confirming a later history traversal', async () => {
    const { navigation, destination, navigate } = createHistoryNavigation();
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <Form dirty onLeave={vi.fn()} />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );

    const event = navigate();

    expect(event.defaultPrevented).toBe(true);
    expect(screen.getByRole('alertdialog', { name: messages.title })).toBeTruthy();
    expect(navigation.traverseTo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: messages.cancel }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(navigation.traverseTo).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Salir' })).toBeTruthy();

    const retryEvent = navigate();

    expect(retryEvent.defaultPrevented).toBe(true);
    expect(screen.getByRole('alertdialog', { name: messages.title })).toBeTruthy();
    expect(navigation.traverseTo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: messages.confirm }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(navigation.traverseTo).toHaveBeenCalledExactlyOnceWith(
      destination.key,
      { info: expect.any(Symbol) },
    );
  });

  it('continues the original history traversal once after confirmation', async () => {
    const { navigation, destination, navigate } = createHistoryNavigation();
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <Form dirty onLeave={vi.fn()} />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    navigate();
    navigate();

    fireEvent.click(screen.getByRole('button', { name: messages.confirm }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(navigation.traverseTo).toHaveBeenCalledExactlyOnceWith(
      destination.key,
      { info: expect.any(Symbol) },
    );
    const [, options] = navigation.traverseTo.mock.calls[0];
    const approvedEvent = navigate(options?.info);
    expect(approvedEvent.defaultPrevented).toBe(false);
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(navigation.traverseTo).toHaveBeenCalledOnce();
  });
});
