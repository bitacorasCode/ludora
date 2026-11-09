import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Activity, Suspense, use, useEffect, useState } from 'react';
import { renderToString } from 'react-dom/server';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionBoundary } from '@/components/auth';
import { NavigationGuardProvider } from '@/components/navigation';
import { type ActionResult, OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, HTTP_STATUS } from '@/lib/api/constants';
import esMessages from '@/messages/es.json';

import { saveProfile } from '../actions';
import { loadProfile } from '../client/load-profile';
import type { ProfileResponse } from '../schema';
import { createProfileStorage, readPreferences } from '../storage';
import { ProfilePageContent } from './profile-page-content';

vi.mock('../actions', () => ({ saveProfile: vi.fn() }));
vi.mock('../client/load-profile', () => ({ loadProfile: vi.fn() }));

const router = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => router,
}));

const PROFILE_USER_ID = 'd5a705f8-bffa-4c42-817f-aa61b901eab1';
const OTHER_USER_ID = 'b2cd9d1f-b863-4640-bc42-94a3b69c7559';
const PROFILE_NICKNAME = 'jugador';
const PROFILE_STORAGE_KEY = `ludora:profile:${PROFILE_USER_ID}`;
const profileStorage = createProfileStorage(PROFILE_USER_ID);
const profileResponse: ProfileResponse = {
  userId: PROFILE_USER_ID,
  avatarPresetId: null,
  bio: null,
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((finish) => {
    resolve = finish;
  });

  return { promise, resolve };
}

function RefreshableProfile({ recovery }: { recovery: Promise<void> }) {
  const [hasRefreshed, setHasRefreshed] = useState(false);

  useEffect(() => {
    router.refresh.mockImplementation(() => setHasRefreshed(true));
  }, []);

  if (hasRefreshed) use(recovery);

  return (
    <ProfilePageContent userId={PROFILE_USER_ID} nickname={PROFILE_NICKNAME} />
  );
}

beforeEach(() => {
  localStorage.clear();
  router.refresh.mockReset();
  vi.mocked(loadProfile).mockReset().mockResolvedValue({
    status: OPERATION_STATUS.success,
    data: profileResponse,
  });
  vi.mocked(saveProfile).mockReset().mockResolvedValue({
    status: OPERATION_STATUS.success,
    data: profileResponse,
  });
  vi.spyOn(toast, 'success').mockReturnValue('profile-saved');
  vi.spyOn(toast, 'error').mockReturnValue('profile-save-error');
  vi.spyOn(toast, 'dismiss').mockReturnValue('profile-save-error');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ProfilePageContent integration', () => {
  it('loads the authenticated profile when no valid preferences are saved', async () => {
    profileStorage.set('{broken');
    const pendingRead = deferred<ActionResult<ProfileResponse>>();
    vi.mocked(loadProfile).mockReturnValueOnce(pendingRead.promise);
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <SessionBoundary>
            <ProfilePageContent
              userId={PROFILE_USER_ID}
              nickname={PROFILE_NICKNAME}
            />
          </SessionBoundary>
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByRole('status', { name: esMessages.Profile.loading }),
    ).toBeTruthy();
    expect(screen.queryByText(esMessages.Profile.bio.empty)).toBeNull();

    await act(async () => {
      pendingRead.resolve({
        status: OPERATION_STATUS.success,
        data: profileResponse,
      });
      await pendingRead.promise;
    });

    expect(
      screen.getByRole('heading', { name: PROFILE_NICKNAME }),
    ).toBeTruthy();
    expect(screen.getByText(esMessages.Profile.bio.empty)).toBeTruthy();
    expect(screen.getByText('J')).toBeTruthy();
    expect(readPreferences(profileStorage.getSnapshot())).toEqual({
      avatarPresetId: null,
      bio: null,
    });
  });

  it('renders the loading state on the server and shows cached data until Nest responds', async () => {
    profileStorage.save({ avatarPresetId: null, bio: 'Perfil guardado' });
    const pendingRead = deferred<ActionResult<ProfileResponse>>();
    vi.mocked(loadProfile).mockReturnValueOnce(pendingRead.promise);
    const ui = (
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <SessionBoundary>
            <ProfilePageContent
              userId={PROFILE_USER_ID}
              nickname={PROFILE_NICKNAME}
            />
          </SessionBoundary>
        </NavigationGuardProvider>
      </NextIntlClientProvider>
    );
    const markup = renderToString(ui);
    expect(markup).toContain(esMessages.Profile.loading);
    expect(markup).not.toContain('Perfil guardado');
    expect(markup).not.toContain(esMessages.Profile.bio.empty);
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = markup;
    const consoleError = vi.spyOn(console, 'error');
    render(ui, { container, hydrate: true });

    expect(await screen.findByText('Perfil guardado')).toBeTruthy();
    expect(
      screen.queryByRole('status', { name: esMessages.Profile.loading }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: esMessages.Profile.edit }),
    ).toBeNull();

    await act(async () => {
      pendingRead.resolve({
        status: OPERATION_STATUS.success,
        data: { ...profileResponse, bio: 'Perfil desde Nest' },
      });
      await pendingRead.promise;
    });

    expect(screen.getByText('Perfil desde Nest')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
    ).toBeTruthy();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('updates the identity and storage only after the server confirms the save', async () => {
    const pendingSave = deferred<ActionResult<ProfileResponse>>();
    vi.mocked(saveProfile).mockReturnValueOnce(pendingSave.promise);
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <SessionBoundary>
            <ProfilePageContent
              userId={PROFILE_USER_ID}
              nickname={PROFILE_NICKNAME}
            />
          </SessionBoundary>
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: esMessages.Profile.edit }),
    );
    const original = profileStorage.getSnapshot();
    fireEvent.change(screen.getByLabelText(esMessages.Profile.bio.label), {
      target: { value: '  Mi nueva biografía  ' },
    });
    fireEvent.click(
      screen.getByRole('radio', {
        name: esMessages.Profile.avatar.options.fox,
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: esMessages.Common.actions.saveChanges,
      }),
    );
    await waitFor(() =>
      expect(saveProfile).toHaveBeenCalledExactlyOnceWith(PROFILE_USER_ID, {
        avatarPresetId: 'fox',
        bio: 'Mi nueva biografía',
      }),
    );
    expect(profileStorage.getSnapshot()).toBe(original);
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByText(esMessages.Profile.bio.empty)).toBeTruthy();

    await act(async () => {
      pendingSave.resolve({
        status: OPERATION_STATUS.success,
        data: {
          ...profileResponse,
          avatarPresetId: 'fox',
          bio: 'Biografía confirmada',
        },
      });
      await pendingSave.promise;
    });

    expect(toast.success).toHaveBeenCalledExactlyOnceWith(
      esMessages.Profile.saved,
      { id: 'profile-saved' },
    );
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(screen.getByText('Biografía confirmada')).toBeTruthy();
    expect(screen.queryByLabelText(esMessages.Profile.bio.label)).toBeNull();
    expect(readPreferences(profileStorage.getSnapshot())).toEqual({
      avatarPresetId: 'fox',
      bio: 'Biografía confirmada',
    });
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
    );
    expect(toast.success).toHaveBeenCalledOnce();
    expect(
      (
        screen.getByLabelText(
          esMessages.Profile.bio.label,
        ) as HTMLTextAreaElement
      ).value,
    ).toBe('Biografía confirmada');
  });

  it('discards cancelled changes and preserves saved data', async () => {
    vi.mocked(loadProfile).mockResolvedValueOnce({
      status: OPERATION_STATUS.success,
      data: { ...profileResponse, bio: 'Biografía original' },
    });
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <SessionBoundary>
            <ProfilePageContent
              userId={PROFILE_USER_ID}
              nickname={PROFILE_NICKNAME}
            />
          </SessionBoundary>
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: esMessages.Profile.edit }),
    );
    const original = profileStorage.getSnapshot();
    fireEvent.change(screen.getByLabelText(esMessages.Profile.bio.label), {
      target: { value: 'Cambio descartado' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Common.actions.cancel }),
    );
    expect(
      await screen.findByRole('alertdialog', {
        name: esMessages.Common.unsavedChanges.title,
      }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', {
        name: esMessages.Common.unsavedChanges.confirm,
      }),
    );
    expect(screen.getByText('Biografía original')).toBeTruthy();
    expect(screen.queryByText('Cambio descartado')).toBeNull();
    expect(profileStorage.getSnapshot()).toBe(original);
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it('closes the editor and discards unsaved changes when the preserved page becomes visible again', async () => {
    vi.mocked(loadProfile).mockResolvedValue({
      status: OPERATION_STATUS.success,
      data: {
        ...profileResponse,
        avatarPresetId: 'fox',
        bio: 'Biografía guardada',
      },
    });
    const { rerender } = render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <SessionBoundary>
            <Activity mode='visible'>
              <ProfilePageContent
                userId={PROFILE_USER_ID}
                nickname={PROFILE_NICKNAME}
              />
            </Activity>
          </SessionBoundary>
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: esMessages.Profile.edit }),
    );
    const original = profileStorage.getSnapshot();
    fireEvent.change(
      screen.getByRole('textbox', { name: esMessages.Profile.bio.label }),
      {
        target: { value: 'Borrador sin guardar' },
      },
    );
    fireEvent.click(
      screen.getByRole('radio', {
        name: esMessages.Profile.avatar.options.planet,
      }),
    );

    rerender(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <SessionBoundary>
            <Activity mode='hidden'>
              <ProfilePageContent
                userId={PROFILE_USER_ID}
                nickname={PROFILE_NICKNAME}
              />
            </Activity>
          </SessionBoundary>
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    expect(
      screen.queryByRole('form', { name: esMessages.Profile.edit }),
    ).toBeNull();
    expect(profileStorage.getSnapshot()).toBe(original);

    rerender(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <SessionBoundary>
            <Activity mode='visible'>
              <ProfilePageContent
                userId={PROFILE_USER_ID}
                nickname={PROFILE_NICKNAME}
              />
            </Activity>
          </SessionBoundary>
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    const edit = await screen.findByRole('button', {
      name: esMessages.Profile.edit,
    });
    expect(
      screen.queryByRole('form', { name: esMessages.Profile.edit }),
    ).toBeNull();
    expect(screen.getByText('Biografía guardada')).toBeTruthy();
    fireEvent.click(edit);
    expect(
      (
        screen.getByRole('textbox', {
          name: esMessages.Profile.bio.label,
        }) as HTMLTextAreaElement
      ).value,
    ).toBe('Biografía guardada');
    expect(
      screen
        .getByRole('radio', { name: esMessages.Profile.avatar.options.fox })
        .getAttribute('aria-checked'),
    ).toBe('true');
    expect(profileStorage.getSnapshot()).toBe(original);
    expect(saveProfile).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('keeps the editor and cache unchanged when the API rejects the save', async () => {
    vi.mocked(saveProfile).mockResolvedValueOnce({
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.unavailable },
    });
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <SessionBoundary>
            <ProfilePageContent
              userId={PROFILE_USER_ID}
              nickname={PROFILE_NICKNAME}
            />
          </SessionBoundary>
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: esMessages.Profile.edit }),
    );
    const original = profileStorage.getSnapshot();
    fireEvent.change(screen.getByLabelText(esMessages.Profile.bio.label), {
      target: { value: 'Cambio pendiente' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: esMessages.Common.actions.saveChanges,
      }),
    );
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledExactlyOnceWith(
        esMessages.Profile.saveError,
        {
          description: esMessages.Common.errors.API_UNAVAILABLE,
          duration: Infinity,
        },
      ),
    );
    expect(
      (
        screen.getByLabelText(
          esMessages.Profile.bio.label,
        ) as HTMLTextAreaElement
      ).value,
    ).toBe('Cambio pendiente');
    expect(toast.success).not.toHaveBeenCalled();
    expect(profileStorage.getSnapshot()).toBe(original);
  });

  it('uses the confirmed server response when writing the cache fails', async () => {
    vi.mocked(loadProfile).mockResolvedValueOnce({
      status: OPERATION_STATUS.success,
      data: { ...profileResponse, bio: 'Biografía original' },
    });
    vi.mocked(saveProfile).mockResolvedValueOnce({
      status: OPERATION_STATUS.success,
      data: { ...profileResponse, bio: 'Cambio confirmado' },
    });
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <SessionBoundary>
            <ProfilePageContent
              userId={PROFILE_USER_ID}
              nickname={PROFILE_NICKNAME}
            />
          </SessionBoundary>
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: esMessages.Profile.edit }),
    );
    const original = profileStorage.getSnapshot();
    fireEvent.change(screen.getByLabelText(esMessages.Profile.bio.label), {
      target: { value: 'Cambio confirmado' },
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: esMessages.Common.actions.saveChanges,
      }),
    );
    await waitFor(() => expect(toast.success).toHaveBeenCalledOnce());
    expect(screen.getByText('Cambio confirmado')).toBeTruthy();
    expect(screen.queryByLabelText(esMessages.Profile.bio.label)).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
    expect(profileStorage.getSnapshot()).toBe(original);
  });

  it('updates the profile after local and cross-tab changes and retains server data when cache is cleared', async () => {
    vi.mocked(loadProfile).mockResolvedValueOnce({
      status: OPERATION_STATUS.success,
      data: { ...profileResponse, bio: 'Biografía del servidor' },
    });
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <SessionBoundary>
            <ProfilePageContent
              userId={PROFILE_USER_ID}
              nickname={PROFILE_NICKNAME}
            />
          </SessionBoundary>
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    await screen.findByRole('button', { name: esMessages.Profile.edit });
    act(() =>
      profileStorage.save({ avatarPresetId: null, bio: 'Cambio local' }),
    );
    expect(screen.getByText('Cambio local')).toBeTruthy();
    act(() => {
      localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify({ avatarPresetId: null, bio: 'Cambio externo' }),
      );
      window.dispatchEvent(
        new StorageEvent('storage', { key: PROFILE_STORAGE_KEY }),
      );
    });
    expect(await screen.findByText('Cambio externo')).toBeTruthy();
    act(() => {
      localStorage.clear();
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
    });
    expect(screen.getByText('Biografía del servidor')).toBeTruthy();
  });

  it('keeps cached data visible after a load failure and allows retrying', async () => {
    profileStorage.save({ avatarPresetId: null, bio: 'Perfil guardado' });
    vi.mocked(loadProfile)
      .mockResolvedValueOnce({
        status: OPERATION_STATUS.error,
        error: { errorCode: API_ERROR_CODES.unavailable },
      })
      .mockResolvedValueOnce({
        status: OPERATION_STATUS.success,
        data: { ...profileResponse, bio: 'Perfil actualizado desde Nest' },
      });
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <SessionBoundary>
            <ProfilePageContent
              userId={PROFILE_USER_ID}
              nickname={PROFILE_NICKNAME}
            />
          </SessionBoundary>
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    expect(await screen.findByText(esMessages.Profile.loadError)).toBeTruthy();
    expect(screen.getByText('Perfil guardado')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: esMessages.Profile.edit }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Common.actions.retry }),
    );
    expect(
      await screen.findByText('Perfil actualizado desde Nest'),
    ).toBeTruthy();
    expect(screen.queryByText(esMessages.Profile.loadError)).toBeNull();
    expect(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
    ).toBeTruthy();
    expect(loadProfile).toHaveBeenCalledTimes(2);
  });

  it('rechecks the session and retries a protected read once without an error toast', async () => {
    const recovery = deferred<void>();
    vi.mocked(loadProfile)
      .mockResolvedValueOnce({
        status: OPERATION_STATUS.error,
        error: {
          errorCode: API_ERROR_CODES.authenticationRequired,
          statusCode: HTTP_STATUS.unauthorized,
        },
      })
      .mockResolvedValueOnce({
        status: OPERATION_STATUS.success,
        data: {
          ...profileResponse,
          bio: 'Perfil después de comprobar la sesión',
        },
      });
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <SessionBoundary>
            <Suspense fallback={<p>Recovering session</p>}>
              <RefreshableProfile recovery={recovery.promise} />
            </Suspense>
          </SessionBoundary>
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(loadProfile).toHaveBeenCalledOnce();
    expect(screen.queryByText(esMessages.Profile.loadError)).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();

    await act(async () => {
      recovery.resolve();
      await recovery.promise;
    });

    expect(
      await screen.findByText('Perfil después de comprobar la sesión'),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
    ).toBeTruthy();
    expect(loadProfile).toHaveBeenCalledTimes(2);
    expect(router.refresh).toHaveBeenCalledOnce();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('rechecks an expired session during save without retrying the mutation or showing an error toast', async () => {
    const recovery = deferred<void>();
    vi.mocked(saveProfile).mockResolvedValueOnce({
      status: OPERATION_STATUS.error,
      error: {
        errorCode: API_ERROR_CODES.authenticationRequired,
        statusCode: HTTP_STATUS.unauthorized,
      },
    });
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <SessionBoundary>
            <Suspense fallback={<p>Recovering session</p>}>
              <RefreshableProfile recovery={recovery.promise} />
            </Suspense>
          </SessionBoundary>
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: esMessages.Profile.edit }),
    );
    const original = profileStorage.getSnapshot();
    fireEvent.change(
      screen.getByRole('textbox', { name: esMessages.Profile.bio.label }),
      {
        target: { value: 'Cambio pendiente' },
      },
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: esMessages.Common.actions.saveChanges,
      }),
    );
    await waitFor(() => expect(router.refresh).toHaveBeenCalledOnce());
    expect(saveProfile).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(profileStorage.getSnapshot()).toBe(original);

    await act(async () => {
      recovery.resolve();
      await recovery.promise;
    });

    await waitFor(() =>
      expect(
        screen
          .getByRole('button', { name: esMessages.Common.actions.saveChanges })
          .matches(':disabled'),
      ).toBe(false),
    );
    expect(saveProfile).toHaveBeenCalledOnce();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(profileStorage.getSnapshot()).toBe(original);
  });

  it('rejects a loaded profile that belongs to a different user', async () => {
    profileStorage.save({ avatarPresetId: null, bio: 'Perfil guardado' });
    vi.mocked(loadProfile).mockResolvedValueOnce({
      status: OPERATION_STATUS.success,
      data: {
        ...profileResponse,
        userId: OTHER_USER_ID,
        bio: 'Perfil de otra cuenta',
      },
    });
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <SessionBoundary>
            <ProfilePageContent
              userId={PROFILE_USER_ID}
              nickname={PROFILE_NICKNAME}
            />
          </SessionBoundary>
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    expect(await screen.findByText(esMessages.Profile.loadError)).toBeTruthy();
    expect(screen.queryByText('Perfil de otra cuenta')).toBeNull();
    expect(screen.getByText('Perfil guardado')).toBeTruthy();
    expect(readPreferences(profileStorage.getSnapshot())?.bio).toBe(
      'Perfil guardado',
    );
  });

  it('rejects a save response for another user without replacing the cache', async () => {
    vi.mocked(saveProfile).mockResolvedValueOnce({
      status: OPERATION_STATUS.success,
      data: {
        ...profileResponse,
        userId: OTHER_USER_ID,
        bio: 'Perfil de otra cuenta',
      },
    });
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <SessionBoundary>
            <ProfilePageContent
              userId={PROFILE_USER_ID}
              nickname={PROFILE_NICKNAME}
            />
          </SessionBoundary>
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: esMessages.Profile.edit }),
    );
    const original = profileStorage.getSnapshot();
    fireEvent.change(screen.getByLabelText(esMessages.Profile.bio.label), {
      target: { value: 'Cambio pendiente' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: esMessages.Common.actions.saveChanges,
      }),
    );
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledExactlyOnceWith(
        esMessages.Profile.saveError,
        {
          description: esMessages.Common.errors.API_INVALID_RESPONSE,
          duration: Infinity,
        },
      ),
    );
    expect(screen.queryByText('Perfil de otra cuenta')).toBeNull();
    expect(
      (
        screen.getByLabelText(
          esMessages.Profile.bio.label,
        ) as HTMLTextAreaElement
      ).value,
    ).toBe('Cambio pendiente');
    expect(profileStorage.getSnapshot()).toBe(original);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('does not show cached preferences from another user', async () => {
    createProfileStorage(OTHER_USER_ID).save({
      avatarPresetId: 'fox',
      bio: 'Perfil de otra cuenta',
    });
    const pendingRead = deferred<ActionResult<ProfileResponse>>();
    vi.mocked(loadProfile).mockReturnValueOnce(pendingRead.promise);
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <SessionBoundary>
            <ProfilePageContent
              userId={PROFILE_USER_ID}
              nickname={PROFILE_NICKNAME}
            />
          </SessionBoundary>
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    expect(screen.queryByText('Perfil de otra cuenta')).toBeNull();
    expect(
      screen.getByRole('status', { name: esMessages.Profile.loading }),
    ).toBeTruthy();
    await act(async () => {
      pendingRead.resolve({
        status: OPERATION_STATUS.success,
        data: profileResponse,
      });
      await pendingRead.promise;
    });
    expect(
      screen.getByRole('heading', { name: PROFILE_NICKNAME }),
    ).toBeTruthy();
  });

  it('aborts a pending read when leaving the page and ignores its late response', async () => {
    const pendingRead = deferred<ActionResult<ProfileResponse>>();
    vi.mocked(loadProfile).mockReturnValueOnce(pendingRead.promise);
    const { unmount } = render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <SessionBoundary>
            <ProfilePageContent
              userId={PROFILE_USER_ID}
              nickname={PROFILE_NICKNAME}
            />
          </SessionBoundary>
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    const [signal] = vi.mocked(loadProfile).mock.calls[0];
    unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      pendingRead.resolve({
        status: OPERATION_STATUS.success,
        data: profileResponse,
      });
      await pendingRead.promise;
    });
    expect(profileStorage.getSnapshot()).toBeNull();
  });
});
