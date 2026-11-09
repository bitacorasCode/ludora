import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { renderToString } from 'react-dom/server';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type ActionResult, OPERATION_STATUS } from '@/lib/actions';
import { API_ERROR_CODES } from '@/lib/api/constants';
import esMessages from '@/messages/es.json';

import { saveProfile } from '../actions';
import { loadProfile } from '../client/load-profile';
import type { ProfileResponse } from '../schema';
import { createProfileStorage, readPreferences } from '../storage';
import { ProfilePageContent } from './profile-page-content';

vi.mock('../actions', () => ({ saveProfile: vi.fn() }));
vi.mock('../client/load-profile', () => ({ loadProfile: vi.fn() }));

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

beforeEach(() => {
  localStorage.clear();
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
        <ProfilePageContent userId={PROFILE_USER_ID} nickname={PROFILE_NICKNAME} />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByRole('status', { name: esMessages.Profile.loading }),
    ).toBeTruthy();
    expect(screen.queryByText(esMessages.Profile.bio.empty)).toBeNull();

    await act(async () => {
      pendingRead.resolve({ status: OPERATION_STATUS.success, data: profileResponse });
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
        <ProfilePageContent userId={PROFILE_USER_ID} nickname={PROFILE_NICKNAME} />
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
    expect(screen.queryByRole('button', { name: esMessages.Profile.edit })).toBeNull();

    await act(async () => {
      pendingRead.resolve({
        status: OPERATION_STATUS.success,
        data: { ...profileResponse, bio: 'Perfil desde Nest' },
      });
      await pendingRead.promise;
    });

    expect(screen.getByText('Perfil desde Nest')).toBeTruthy();
    expect(screen.getByRole('button', { name: esMessages.Profile.edit })).toBeTruthy();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('updates the identity and storage only after the server confirms the save', async () => {
    const pendingSave = deferred<ActionResult<ProfileResponse>>();
    vi.mocked(saveProfile).mockReturnValueOnce(pendingSave.promise);
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfilePageContent userId={PROFILE_USER_ID} nickname={PROFILE_NICKNAME} />
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
      screen.getByRole('radio', { name: esMessages.Profile.avatar.options.fox }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Common.actions.saveChanges }),
    );
    await waitFor(() => expect(saveProfile).toHaveBeenCalledExactlyOnceWith(
      PROFILE_USER_ID,
      { avatarPresetId: 'fox', bio: 'Mi nueva biografía' },
    ));
    expect(profileStorage.getSnapshot()).toBe(original);
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByText(esMessages.Profile.bio.empty)).toBeTruthy();

    await act(async () => {
      pendingSave.resolve({
        status: OPERATION_STATUS.success,
        data: { ...profileResponse, avatarPresetId: 'fox', bio: 'Biografía confirmada' },
      });
      await pendingSave.promise;
    });

    expect(toast.success).toHaveBeenCalledExactlyOnceWith(
      esMessages.Profile.saved,
      { id: 'profile-saved' },
    );
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
      (screen.getByLabelText(esMessages.Profile.bio.label) as HTMLTextAreaElement).value,
    ).toBe('Biografía confirmada');
  });

  it('discards cancelled changes and preserves saved data', async () => {
    vi.mocked(loadProfile).mockResolvedValueOnce({
      status: OPERATION_STATUS.success,
      data: { ...profileResponse, bio: 'Biografía original' },
    });
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfilePageContent userId={PROFILE_USER_ID} nickname={PROFILE_NICKNAME} />
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
    expect(screen.getByText('Biografía original')).toBeTruthy();
    expect(screen.queryByText('Cambio descartado')).toBeNull();
    expect(profileStorage.getSnapshot()).toBe(original);
    expect(saveProfile).not.toHaveBeenCalled();
  });

  it('keeps the editor and cache unchanged when the API rejects the save', async () => {
    vi.mocked(saveProfile).mockResolvedValueOnce({
      status: OPERATION_STATUS.error,
      error: { errorCode: API_ERROR_CODES.unavailable },
    });
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfilePageContent userId={PROFILE_USER_ID} nickname={PROFILE_NICKNAME} />
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
      screen.getByRole('button', { name: esMessages.Common.actions.saveChanges }),
    );
    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      esMessages.Profile.saveError,
      { description: esMessages.Common.errors.API_UNAVAILABLE, duration: Infinity },
    ));
    expect(
      (screen.getByLabelText(esMessages.Profile.bio.label) as HTMLTextAreaElement).value,
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
        <ProfilePageContent userId={PROFILE_USER_ID} nickname={PROFILE_NICKNAME} />
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
      screen.getByRole('button', { name: esMessages.Common.actions.saveChanges }),
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
        <ProfilePageContent userId={PROFILE_USER_ID} nickname={PROFILE_NICKNAME} />
      </NextIntlClientProvider>,
    );
    await screen.findByRole('button', { name: esMessages.Profile.edit });
    act(() => profileStorage.save({ avatarPresetId: null, bio: 'Cambio local' }));
    expect(screen.getByText('Cambio local')).toBeTruthy();
    act(() => {
      localStorage.setItem(
        PROFILE_STORAGE_KEY,
        JSON.stringify({ avatarPresetId: null, bio: 'Cambio externo' }),
      );
      window.dispatchEvent(new StorageEvent('storage', { key: PROFILE_STORAGE_KEY }));
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
        <ProfilePageContent userId={PROFILE_USER_ID} nickname={PROFILE_NICKNAME} />
      </NextIntlClientProvider>,
    );
    expect(await screen.findByText(esMessages.Profile.loadError)).toBeTruthy();
    expect(screen.getByText('Perfil guardado')).toBeTruthy();
    expect(screen.queryByRole('button', { name: esMessages.Profile.edit })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: esMessages.Common.actions.retry }));
    expect(await screen.findByText('Perfil actualizado desde Nest')).toBeTruthy();
    expect(screen.queryByText(esMessages.Profile.loadError)).toBeNull();
    expect(screen.getByRole('button', { name: esMessages.Profile.edit })).toBeTruthy();
    expect(loadProfile).toHaveBeenCalledTimes(2);
  });

  it('rejects a loaded profile that belongs to a different user', async () => {
    profileStorage.save({ avatarPresetId: null, bio: 'Perfil guardado' });
    vi.mocked(loadProfile).mockResolvedValueOnce({
      status: OPERATION_STATUS.success,
      data: { ...profileResponse, userId: OTHER_USER_ID, bio: 'Perfil de otra cuenta' },
    });
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfilePageContent userId={PROFILE_USER_ID} nickname={PROFILE_NICKNAME} />
      </NextIntlClientProvider>,
    );
    expect(await screen.findByText(esMessages.Profile.loadError)).toBeTruthy();
    expect(screen.queryByText('Perfil de otra cuenta')).toBeNull();
    expect(screen.getByText('Perfil guardado')).toBeTruthy();
    expect(readPreferences(profileStorage.getSnapshot())?.bio).toBe('Perfil guardado');
  });

  it('rejects a save response for another user without replacing the cache', async () => {
    vi.mocked(saveProfile).mockResolvedValueOnce({
      status: OPERATION_STATUS.success,
      data: { ...profileResponse, userId: OTHER_USER_ID, bio: 'Perfil de otra cuenta' },
    });
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfilePageContent userId={PROFILE_USER_ID} nickname={PROFILE_NICKNAME} />
      </NextIntlClientProvider>,
    );
    fireEvent.click(await screen.findByRole('button', { name: esMessages.Profile.edit }));
    const original = profileStorage.getSnapshot();
    fireEvent.change(screen.getByLabelText(esMessages.Profile.bio.label), {
      target: { value: 'Cambio pendiente' },
    });
    fireEvent.click(screen.getByRole('button', { name: esMessages.Common.actions.saveChanges }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledExactlyOnceWith(
      esMessages.Profile.saveError,
      { description: esMessages.Common.errors.API_INVALID_RESPONSE, duration: Infinity },
    ));
    expect(screen.queryByText('Perfil de otra cuenta')).toBeNull();
    expect((screen.getByLabelText(esMessages.Profile.bio.label) as HTMLTextAreaElement).value)
      .toBe('Cambio pendiente');
    expect(profileStorage.getSnapshot()).toBe(original);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('does not show cached preferences from another user', async () => {
    createProfileStorage(OTHER_USER_ID).save({ avatarPresetId: 'fox', bio: 'Perfil de otra cuenta' });
    const pendingRead = deferred<ActionResult<ProfileResponse>>();
    vi.mocked(loadProfile).mockReturnValueOnce(pendingRead.promise);
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfilePageContent userId={PROFILE_USER_ID} nickname={PROFILE_NICKNAME} />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByText('Perfil de otra cuenta')).toBeNull();
    expect(screen.getByRole('status', { name: esMessages.Profile.loading })).toBeTruthy();
    await act(async () => {
      pendingRead.resolve({ status: OPERATION_STATUS.success, data: profileResponse });
      await pendingRead.promise;
    });
    expect(screen.getByRole('heading', { name: PROFILE_NICKNAME })).toBeTruthy();
  });

  it('aborts a pending read when leaving the page and ignores its late response', async () => {
    const pendingRead = deferred<ActionResult<ProfileResponse>>();
    vi.mocked(loadProfile).mockReturnValueOnce(pendingRead.promise);
    const { unmount } = render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfilePageContent userId={PROFILE_USER_ID} nickname={PROFILE_NICKNAME} />
      </NextIntlClientProvider>,
    );
    const [signal] = vi.mocked(loadProfile).mock.calls[0];
    unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => {
      pendingRead.resolve({ status: OPERATION_STATUS.success, data: profileResponse });
      await pendingRead.promise;
    });
    expect(profileStorage.getSnapshot()).toBeNull();
  });
});
