import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { Activity } from 'react';
import { renderToString } from 'react-dom/server';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionBoundary } from '@/components/auth';
import { NavigationGuardProvider } from '@/components/navigation';
import { type ActionResult, OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES, HTTP_STATUS } from '@/lib/api/constants';
import { refreshSession } from '@/lib/session/actions';
import {
  type RefreshSessionResult,
  SESSION_REFRESH_OUTCOME,
} from '@/lib/session/refresh-result';
import esMessages from '@/messages/es.json';

import { saveProfile } from '../actions';
import { loadProfile } from '../client/load-profile';
import type { ProfileResponse } from '../schema';
import { createProfileStorage, readPreferences } from '../storage';
import { ProfilePageContent } from './profile-page-content';

vi.mock('../actions', () => ({ saveProfile: vi.fn() }));
vi.mock('../client/load-profile', () => ({ loadProfile: vi.fn() }));
vi.mock('@/lib/session/actions', () => ({
  refreshSession: vi.fn(),
  recordSessionActivity: vi.fn(),
}));

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

function profileResult(data = profileResponse): ActionResult<ProfileResponse> {
  return { status: OPERATION_STATUS.success, data };
}

const initialProfile = profileResult();
const unavailableProfile = {
  status: OPERATION_STATUS.error,
  error: { errorCode: API_ERROR_CODES.unavailable },
} as const satisfies ActionResult<ProfileResponse>;

function ProfileView({
  initialResult = initialProfile,
  mode = 'visible',
}: {
  initialResult?: ActionResult<ProfileResponse>;
  mode?: 'visible' | 'hidden';
}) {
  return (
    <NextIntlClientProvider locale='es' messages={esMessages}>
      <NavigationGuardProvider>
        <SessionBoundary>
          <Activity mode={mode}>
            <ProfilePageContent
              userId={PROFILE_USER_ID}
              nickname={PROFILE_NICKNAME}
              initialResult={initialResult}
            />
          </Activity>
        </SessionBoundary>
      </NavigationGuardProvider>
    </NextIntlClientProvider>
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((finish) => {
    resolve = finish;
  });

  return { promise, resolve };
}

const renewed = { status: OPERATION_STATUS.success, data: SESSION_REFRESH_OUTCOME.renewed } as const;

beforeEach(() => {
  localStorage.clear();
  router.refresh.mockReset();
  vi.mocked(refreshSession).mockReset().mockResolvedValue(renewed);
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
  it('hydrates the server profile without fetching again or showing an older local copy', () => {
    profileStorage.save({ avatarPresetId: null, bio: 'Perfil guardado' });
    const result = profileResult({ ...profileResponse, bio: 'Perfil desde Nest' });
    const ui = <ProfileView initialResult={result} />;
    const markup = renderToString(ui);
    expect(markup).toContain('Perfil desde Nest');
    expect(markup).not.toContain('Perfil guardado');

    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = markup;
    const consoleError = vi.spyOn(console, 'error');
    render(ui, { container, hydrate: true });

    expect(screen.getByText('Perfil desde Nest')).toBeTruthy();
    expect(screen.queryByText('Perfil guardado')).toBeNull();
    expect(screen.getByRole('button', { name: esMessages.Profile.edit })).toBeTruthy();
    expect(loadProfile).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('updates the identity and storage only after the server confirms the save', async () => {
    const pendingSave = deferred<ActionResult<ProfileResponse>>();
    vi.mocked(saveProfile).mockReturnValueOnce(pendingSave.promise);
    render(<ProfileView />);
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
    const result = profileResult({ ...profileResponse, bio: 'Biografía original' });
    render(<ProfileView initialResult={result} />);
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
    const result = profileResult({
        ...profileResponse,
        avatarPresetId: 'fox',
        bio: 'Biografía guardada',
      });
    const { rerender } = render(<ProfileView initialResult={result} mode='visible' />);
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

    rerender(<ProfileView initialResult={result} mode='hidden' />);
    expect(
      screen.queryByRole('form', { name: esMessages.Profile.edit }),
    ).toBeNull();
    expect(profileStorage.getSnapshot()).toBe(original);

    rerender(<ProfileView initialResult={result} mode='visible' />);
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
    render(<ProfileView />);
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
    const result = profileResult({ ...profileResponse, bio: 'Biografía original' });
    vi.mocked(saveProfile).mockResolvedValueOnce({
      status: OPERATION_STATUS.success,
      data: { ...profileResponse, bio: 'Cambio confirmado' },
    });
    render(<ProfileView initialResult={result} />);
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
    const result = profileResult({ ...profileResponse, bio: 'Biografía del servidor' });
    render(<ProfileView initialResult={result} />);
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

  it('shows a server read failure and loads Profile when the user retries', async () => {
    profileStorage.save({ avatarPresetId: null, bio: 'Perfil guardado' });
    vi.mocked(loadProfile).mockResolvedValueOnce({
      status: OPERATION_STATUS.success,
      data: { ...profileResponse, bio: 'Perfil actualizado desde Nest' },
    });
    render(<ProfileView initialResult={unavailableProfile} />);
    expect(screen.getByText(esMessages.Profile.loadError)).toBeTruthy();
    expect(screen.queryByText('Perfil guardado')).toBeNull();
    expect(loadProfile).not.toHaveBeenCalled();
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
      await screen.findByRole('button', { name: esMessages.Profile.edit }),
    ).toBeTruthy();
    expect(loadProfile).toHaveBeenCalledOnce();
  });

  it('rechecks the session and retries a protected read once without an error toast', async () => {
    const recovery = deferred<RefreshSessionResult>();
    vi.mocked(refreshSession).mockReturnValue(recovery.promise);
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
    render(<ProfileView initialResult={unavailableProfile} />);
    fireEvent.click(screen.getByRole('button', { name: esMessages.Common.actions.retry }));
    await waitFor(() => expect(refreshSession).toHaveBeenCalledOnce());
    expect(loadProfile).toHaveBeenCalledOnce();
    expect(screen.queryByText(esMessages.Profile.loadError)).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();

    await act(async () => {
      recovery.resolve(renewed);
      await recovery.promise;
    });

    expect(
      await screen.findByText('Perfil después de comprobar la sesión'),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
    ).toBeTruthy();
    expect(loadProfile).toHaveBeenCalledTimes(2);
    expect(refreshSession).toHaveBeenCalledOnce();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('renews the session and saves the same draft without another submission', async () => {
    const recovery = deferred<RefreshSessionResult>();
    vi.mocked(refreshSession).mockReturnValue(recovery.promise);
    const draft = { avatarPresetId: null, bio: 'Cambio pendiente' };
    vi.mocked(saveProfile)
      .mockResolvedValueOnce({
        status: OPERATION_STATUS.error,
        error: {
          errorCode: API_ERROR_CODES.authenticationRequired,
          statusCode: HTTP_STATUS.unauthorized,
        },
      })
      .mockResolvedValueOnce({
        status: OPERATION_STATUS.success,
        data: { ...profileResponse, ...draft },
      });
    render(<ProfileView />);
    fireEvent.click(
      await screen.findByRole('button', { name: esMessages.Profile.edit }),
    );
    const original = profileStorage.getSnapshot();
    fireEvent.change(
      screen.getByRole('textbox', { name: esMessages.Profile.bio.label }),
      {
        target: { value: draft.bio },
      },
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: esMessages.Common.actions.saveChanges,
      }),
    );
    await waitFor(() => expect(refreshSession).toHaveBeenCalledOnce());
    expect(saveProfile).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(profileStorage.getSnapshot()).toBe(original);

    await act(async () => {
      recovery.resolve(renewed);
      await recovery.promise;
    });

    await waitFor(() => expect(toast.success).toHaveBeenCalledOnce());
    expect(saveProfile).toHaveBeenCalledTimes(2);
    expect(saveProfile).toHaveBeenNthCalledWith(1, PROFILE_USER_ID, draft);
    expect(saveProfile).toHaveBeenNthCalledWith(2, PROFILE_USER_ID, draft);
    expect(toast.error).not.toHaveBeenCalled();
    expect(profileStorage.getSnapshot()).toBe(JSON.stringify(draft));
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
    render(<ProfileView initialResult={unavailableProfile} />);
    fireEvent.click(screen.getByRole('button', { name: esMessages.Common.actions.retry }));
    expect(await screen.findByText(esMessages.Common.errors.API_INVALID_RESPONSE)).toBeTruthy();
    expect(screen.queryByText('Perfil de otra cuenta')).toBeNull();
    expect(screen.queryByText('Perfil guardado')).toBeNull();
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
    render(<ProfileView />);
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

  it('ignores profile updates from another account', () => {
    render(<ProfileView />);
    act(() => createProfileStorage(OTHER_USER_ID).save({
      avatarPresetId: 'fox',
      bio: 'Perfil de otra cuenta',
    }));
    expect(screen.queryByText('Perfil de otra cuenta')).toBeNull();
    expect(screen.getByText(esMessages.Profile.bio.empty)).toBeTruthy();
  });

  it('aborts a pending read when leaving the page and ignores its late response', async () => {
    const pendingRead = deferred<ActionResult<ProfileResponse>>();
    vi.mocked(loadProfile).mockReturnValueOnce(pendingRead.promise);
    const { unmount } = render(<ProfileView initialResult={unavailableProfile} />);
    fireEvent.click(screen.getByRole('button', { name: esMessages.Common.actions.retry }));
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
