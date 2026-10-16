import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';

import esMessages from '@/messages/es.json';

import { type Profile } from '../config';
import { BIO_MAX_LENGTH } from '../schema';
import { ProfileEditor } from './profile-editor';

const profile: Profile = {
  nickname: 'jugador_demo',
  avatarPresetId: 'fox',
  bio: 'Mi biografía',
};

expect.extend(toHaveNoViolations);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ProfileEditor integration', () => {
  it('renders current values without accessibility violations', async () => {
    const { container } = render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfileEditor profile={profile} onSave={vi.fn()} onCancel={vi.fn()} />
      </NextIntlClientProvider>,
    );
    expect(
      (
        screen.getByLabelText(
          esMessages.Profile.bioLabel,
        ) as HTMLTextAreaElement
      ).value,
    ).toBe(profile.bio);
    expect(
      screen
        .getByRole('radio', { name: esMessages.Profile.avatars.fox })
        .getAttribute('aria-checked'),
    ).toBe('true');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('saves the selected avatar and trims the biography', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfileEditor profile={profile} onSave={onSave} onCancel={vi.fn()} />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('radio', { name: esMessages.Profile.avatars.planet }),
    );
    fireEvent.change(screen.getByLabelText(esMessages.Profile.bioLabel), {
      target: { value: '  Otra biografía  ' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.save }),
    );
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledExactlyOnceWith({
        avatarPresetId: 'planet',
        bio: 'Otra biografía',
      }),
    );
  });

  it('saves an empty biography and the initial avatar as null', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfileEditor profile={profile} onSave={onSave} onCancel={vi.fn()} />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('radio', { name: esMessages.Profile.useInitial }),
    );
    fireEvent.change(screen.getByLabelText(esMessages.Profile.bioLabel), {
      target: { value: '   ' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.save }),
    );
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledExactlyOnceWith({
        avatarPresetId: null,
        bio: null,
      }),
    );
  });

  it('rejects an oversized biography even if native input restrictions are bypassed', async () => {
    const onSave = vi.fn();
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfileEditor profile={profile} onSave={onSave} onCancel={vi.fn()} />
      </NextIntlClientProvider>,
    );
    fireEvent.change(screen.getByLabelText(esMessages.Profile.bioLabel), {
      target: { value: 'a'.repeat(BIO_MAX_LENGTH + 1) },
    });
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.save }),
    );
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('preserves edited values after a save failure and allows retrying', async () => {
    const onSave = vi
      .fn()
      .mockRejectedValueOnce(new Error('Save failed'))
      .mockResolvedValueOnce(undefined);
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfileEditor profile={profile} onSave={onSave} onCancel={vi.fn()} />
      </NextIntlClientProvider>,
    );
    const bio = screen.getByLabelText(
      esMessages.Profile.bioLabel,
    ) as HTMLTextAreaElement;
    fireEvent.change(bio, { target: { value: 'Mi cambio' } });
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.save }),
    );
    expect(await screen.findByText(esMessages.Profile.saveError)).toBeTruthy();
    expect(bio.value).toBe('Mi cambio');
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.save }),
    );
    await waitFor(() =>
      expect(screen.queryByText(esMessages.Profile.saveError)).toBeNull(),
    );
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it('disables editing until an asynchronous save finishes', async () => {
    let finishSave!: () => void;
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishSave = resolve;
        }),
    );
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfileEditor profile={profile} onSave={onSave} onCancel={vi.fn()} />
      </NextIntlClientProvider>,
    );
    const save = screen.getByRole('button', { name: esMessages.Profile.save });
    fireEvent.click(save);
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(save.matches(':disabled')).toBe(true);
    expect(
      screen.getByLabelText(esMessages.Profile.bioLabel).matches(':disabled'),
    ).toBe(true);
    expect(
      screen
        .getByRole('button', { name: esMessages.Profile.cancel })
        .matches(':disabled'),
    ).toBe(true);
    finishSave();
    await waitFor(() => expect(save.matches(':disabled')).toBe(false));
  });

  it('cancels without saving', () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfileEditor profile={profile} onSave={onSave} onCancel={onCancel} />
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.cancel }),
    );
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('lets the user select an avatar with the keyboard', async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <ProfileEditor profile={profile} onSave={vi.fn()} onCancel={vi.fn()} />
      </NextIntlClientProvider>,
    );
    screen.getByRole('radio', { name: esMessages.Profile.useInitial }).focus();
    await user.keyboard('{ArrowRight>}');
    await waitFor(() =>
      expect(
        screen
          .getByRole('radio', { name: esMessages.Profile.avatars.comet })
          .getAttribute('aria-checked'),
      ).toBe('true'),
    );
    await user.keyboard('{/ArrowRight}');
  });
});
