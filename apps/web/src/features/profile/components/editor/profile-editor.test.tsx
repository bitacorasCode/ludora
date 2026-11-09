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
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NavigationGuardProvider } from '@/components/navigation';
import esMessages from '@/messages/es.json';

import { type Profile } from '../../config';
import { BIO_MAX_LENGTH } from '../../schema';
import { ProfileEditor } from './profile-editor';

const profile: Profile = {
  nickname: 'jugador_demo',
  avatarPresetId: 'fox',
  bio: 'Mi biografía',
};

expect.extend(toHaveNoViolations);

beforeEach(() => {
  vi.spyOn(toast, 'error').mockReturnValue('profile-save-error');
  vi.spyOn(toast, 'dismiss').mockReturnValue('profile-save-error');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ProfileEditor integration', () => {
  it('renders current values without accessibility violations', async () => {
    const { container } = render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <ProfileEditor
            profile={profile}
            onSave={vi.fn()}
            onCancel={vi.fn()}
          />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    expect(
      (
        screen.getByLabelText(
          esMessages.Profile.bio.label,
        ) as HTMLTextAreaElement
      ).value,
    ).toBe(profile.bio);
    expect(
      screen
        .getByRole('radio', { name: esMessages.Profile.avatar.options.fox })
        .getAttribute('aria-checked'),
    ).toBe('true');
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('saves the selected avatar and trims the biography', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <ProfileEditor profile={profile} onSave={onSave} onCancel={vi.fn()} />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('radio', {
        name: esMessages.Profile.avatar.options.planet,
      }),
    );
    fireEvent.change(screen.getByLabelText(esMessages.Profile.bio.label), {
      target: { value: '  Otra biografía  ' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: esMessages.Common.actions.saveChanges,
      }),
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
        <NavigationGuardProvider>
          <ProfileEditor profile={profile} onSave={onSave} onCancel={vi.fn()} />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('radio', { name: esMessages.Profile.avatar.useInitial }),
    );
    fireEvent.change(screen.getByLabelText(esMessages.Profile.bio.label), {
      target: { value: '   ' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: esMessages.Common.actions.saveChanges,
      }),
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
        <NavigationGuardProvider>
          <ProfileEditor profile={profile} onSave={onSave} onCancel={vi.fn()} />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.change(screen.getByLabelText(esMessages.Profile.bio.label), {
      target: { value: 'a'.repeat(BIO_MAX_LENGTH + 1) },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: esMessages.Common.actions.saveChanges,
      }),
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
        <NavigationGuardProvider>
          <ProfileEditor profile={profile} onSave={onSave} onCancel={vi.fn()} />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    const bio = screen.getByLabelText(
      esMessages.Profile.bio.label,
    ) as HTMLTextAreaElement;
    fireEvent.change(bio, { target: { value: 'Mi cambio' } });
    fireEvent.click(
      screen.getByRole('button', {
        name: esMessages.Common.actions.saveChanges,
      }),
    );
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledExactlyOnceWith(
        esMessages.Profile.saveError,
        { duration: Infinity },
      ),
    );
    expect(bio.value).toBe('Mi cambio');
    fireEvent.click(
      screen.getByRole('button', {
        name: esMessages.Common.actions.saveChanges,
      }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(toast.dismiss).toHaveBeenCalledOnce();
    expect(toast.dismiss).toHaveBeenLastCalledWith('profile-save-error');
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
        <NavigationGuardProvider>
          <ProfileEditor profile={profile} onSave={onSave} onCancel={vi.fn()} />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    const save = screen.getByRole('button', {
      name: esMessages.Common.actions.saveChanges,
    });
    fireEvent.click(save);
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());
    expect(save.matches(':disabled')).toBe(true);
    expect(
      screen.getByLabelText(esMessages.Profile.bio.label).matches(':disabled'),
    ).toBe(true);
    expect(
      screen
        .getByRole('button', { name: esMessages.Common.actions.cancel })
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
        <NavigationGuardProvider>
          <ProfileEditor
            profile={profile}
            onSave={onSave}
            onCancel={onCancel}
          />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Common.actions.cancel }),
    );
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('asks before discarding changed values and lets the user keep editing', async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <ProfileEditor
            profile={profile}
            onSave={onSave}
            onCancel={onCancel}
          />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.change(
      screen.getByRole('textbox', { name: esMessages.Profile.bio.label }),
      {
        target: { value: 'Cambio pendiente' },
      },
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Common.actions.cancel }),
    );
    expect(
      await screen.findByRole('alertdialog', {
        name: esMessages.Common.unsavedChanges.title,
      }),
    ).toBeTruthy();
    expect(onCancel).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', {
        name: esMessages.Common.unsavedChanges.cancel,
      }),
    );
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(
      (
        screen.getByRole('textbox', {
          name: esMessages.Profile.bio.label,
        }) as HTMLTextAreaElement
      ).value,
    ).toBe('Cambio pendiente');

    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Common.actions.cancel }),
    );
    fireEvent.click(
      await screen.findByRole('button', {
        name: esMessages.Common.unsavedChanges.confirm,
      }),
    );
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('lets the user select an avatar with the keyboard', async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <ProfileEditor
            profile={profile}
            onSave={vi.fn()}
            onCancel={vi.fn()}
          />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    screen
      .getByRole('radio', { name: esMessages.Profile.avatar.useInitial })
      .focus();
    await user.keyboard('{ArrowRight>}');
    await waitFor(() =>
      expect(
        screen
          .getByRole('radio', { name: esMessages.Profile.avatar.options.comet })
          .getAttribute('aria-checked'),
      ).toBe('true'),
    );
    await user.keyboard('{/ArrowRight}');
  });
});
