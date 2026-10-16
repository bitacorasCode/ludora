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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import esMessages from '@/messages/es.json';

import { previewProfile } from '../config';
import { getStoredProfile, readPreferences, savePreferences } from '../storage';
import { ProfilePageContent } from './profile-page-content';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ProfilePageContent integration', () => {
  it('shows the default profile when no valid preferences are saved', () => {
    localStorage.setItem('ludora:preview-profile', '{broken');
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfilePageContent />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByRole('heading', { name: previewProfile.nickname }),
    ).toBeTruthy();
    expect(screen.getByText(esMessages.Profile.emptyBio)).toBeTruthy();
    expect(screen.getByText('J')).toBeTruthy();
  });

  it('renders the loading state on the server and hydrates saved preferences', async () => {
    savePreferences({ avatarPresetId: null, bio: 'Perfil guardado' });
    const ui = (
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfilePageContent />
      </NextIntlClientProvider>
    );
    const markup = renderToString(ui);
    expect(markup).toContain(esMessages.Profile.loading);
    expect(markup).not.toContain('Perfil guardado');
    expect(markup).not.toContain(esMessages.Profile.emptyBio);
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = markup;
    const consoleError = vi.spyOn(console, 'error');
    render(ui, { container, hydrate: true });
    expect(await screen.findByText('Perfil guardado')).toBeTruthy();
    expect(
      screen.queryByRole('status', { name: esMessages.Profile.loading }),
    ).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('updates the identity and storage after saving', async () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfilePageContent />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
    );
    fireEvent.change(screen.getByLabelText(esMessages.Profile.bioLabel), {
      target: { value: '  Mi nueva biografía  ' },
    });
    fireEvent.click(
      screen.getByRole('radio', { name: esMessages.Profile.avatars.fox }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Common.actions.saveChanges }),
    );
    expect(await screen.findByText(esMessages.Profile.saved)).toBeTruthy();
    expect(screen.getByText('Mi nueva biografía')).toBeTruthy();
    expect(screen.queryByLabelText(esMessages.Profile.bioLabel)).toBeNull();
    expect(readPreferences(getStoredProfile())).toEqual({
      avatarPresetId: 'fox',
      bio: 'Mi nueva biografía',
    });
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
    );
    expect(screen.queryByText(esMessages.Profile.saved)).toBeNull();
    expect(
      (
        screen.getByLabelText(
          esMessages.Profile.bioLabel,
        ) as HTMLTextAreaElement
      ).value,
    ).toBe('Mi nueva biografía');
  });

  it('discards cancelled changes and preserves saved data', () => {
    savePreferences({ avatarPresetId: null, bio: 'Biografía original' });
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfilePageContent />
      </NextIntlClientProvider>,
    );
    const original = getStoredProfile();
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
    );
    fireEvent.change(screen.getByLabelText(esMessages.Profile.bioLabel), {
      target: { value: 'Cambio descartado' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Common.actions.cancel }),
    );
    expect(screen.getByText('Biografía original')).toBeTruthy();
    expect(screen.queryByText('Cambio descartado')).toBeNull();
    expect(getStoredProfile()).toBe(original);
  });

  it('keeps the editor open after a storage failure', async () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfilePageContent />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
    );
    fireEvent.change(screen.getByLabelText(esMessages.Profile.bioLabel), {
      target: { value: 'Cambio pendiente' },
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage full');
    });
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Common.actions.saveChanges }),
    );
    expect(await screen.findByText(esMessages.Profile.saveError)).toBeTruthy();
    expect(
      (
        screen.getByLabelText(
          esMessages.Profile.bioLabel,
        ) as HTMLTextAreaElement
      ).value,
    ).toBe('Cambio pendiente');
    expect(screen.queryByText(esMessages.Profile.saved)).toBeNull();
    expect(getStoredProfile()).toBeNull();
  });

  it('updates the profile after local and cross-tab changes', async () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfilePageContent />
      </NextIntlClientProvider>,
    );
    act(() => savePreferences({ avatarPresetId: null, bio: 'Cambio local' }));
    expect(screen.getByText('Cambio local')).toBeTruthy();
    act(() => {
      localStorage.setItem(
        'ludora:preview-profile',
        JSON.stringify({ avatarPresetId: null, bio: 'Cambio externo' }),
      );
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'ludora:preview-profile' }),
      );
    });
    expect(await screen.findByText('Cambio externo')).toBeTruthy();
    act(() => {
      localStorage.clear();
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
    });
    await waitFor(() =>
      expect(screen.getByText(esMessages.Profile.emptyBio)).toBeTruthy(),
    );
  });
});
