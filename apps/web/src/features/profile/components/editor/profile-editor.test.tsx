import {
  act,
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
import { type ActionResult, OPERATION_STATUS } from '@/lib/actions';
import esMessages from '@/messages/es.json';

import { type Profile } from '../../config';
import { BIO_MAX_LENGTH, type ProfileResponse } from '../../schema';
import { ProfileEditor } from './profile-editor';

const profile: Profile = {
  nickname: 'jugador_demo',
  avatarPresetId: 'fox',
  bio: 'Mi biografía',
};

const savedProfile: ActionResult<ProfileResponse> = {
  status: OPERATION_STATUS.success,
  data: {
    userId: '5d107fa5-75f2-4fe3-9013-542d92dc82cf',
    avatarPresetId: profile.avatarPresetId,
    bio: profile.bio,
  },
};

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => router,
}));

expect.extend(toHaveNoViolations);

beforeEach(() => {
  router.refresh.mockReset();
  vi.spyOn(toast, 'error').mockReturnValue('profile-save-error');
  vi.spyOn(toast, 'dismiss').mockReturnValue('profile-save-error');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ProfileEditor integration', () => {
  it('renders current values without accessibility violations', async () => {
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <ProfileEditor profile={profile} onSave={vi.fn()} canEdit />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
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
    const results = await axe(document.body);
    expect(results).toHaveNoViolations();
  });

  it('saves the selected avatar and trims the biography', async () => {
    const onSave = vi.fn().mockResolvedValue(savedProfile);
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <ProfileEditor profile={profile} onSave={onSave} canEdit />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
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
    const onSave = vi.fn().mockResolvedValue(savedProfile);
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <ProfileEditor profile={profile} onSave={onSave} canEdit />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
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
          <ProfileEditor profile={profile} onSave={onSave} canEdit />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
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
      .mockResolvedValueOnce(savedProfile);
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <ProfileEditor profile={profile} onSave={onSave} canEdit />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
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
    let finishSave!: (result: ActionResult<ProfileResponse>) => void;
    const onSave = vi.fn(
      () =>
        new Promise<ActionResult<ProfileResponse>>((resolve) => {
          finishSave = resolve;
        }),
    );
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <ProfileEditor profile={profile} onSave={onSave} canEdit />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
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
    finishSave(savedProfile);
    await waitFor(() =>
      expect(
        screen.queryByRole('form', { name: esMessages.Profile.edit }),
      ).toBeNull(),
    );
  });

  it('cancels without saving', async () => {
    const onSave = vi.fn();
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <ProfileEditor profile={profile} onSave={onSave} canEdit />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Common.actions.cancel }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('form', { name: esMessages.Profile.edit }),
      ).toBeNull(),
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('asks before discarding changed values and lets the user keep editing', async () => {
    const onSave = vi.fn();
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <ProfileEditor profile={profile} onSave={onSave} canEdit />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
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
    expect(screen.getByRole('form', { hidden: true })).toBeTruthy();
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
    await waitFor(() =>
      expect(
        screen.queryByRole('form', { name: esMessages.Profile.edit }),
      ).toBeNull(),
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('lets the user select an avatar with the keyboard', async () => {
    const user = userEvent.setup();
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <ProfileEditor profile={profile} onSave={vi.fn()} canEdit />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
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

  it('keeps a new draft when an earlier save finishes after closing and reopening', async () => {
    let finishSave!: (result: ActionResult<ProfileResponse>) => void;
    const pending = new Promise<ActionResult<ProfileResponse>>((resolve) => {
      finishSave = resolve;
    });
    const onSave = vi.fn().mockReturnValue(pending);
    render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <ProfileEditor profile={profile} onSave={onSave} canEdit />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
    );
    fireEvent.change(screen.getByLabelText(esMessages.Profile.bio.label), {
      target: { value: 'Primer borrador' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: esMessages.Common.actions.saveChanges,
      }),
    );
    await waitFor(() => expect(onSave).toHaveBeenCalledOnce());

    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Common.actions.close }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: esMessages.Common.unsavedChanges.confirm,
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
    );
    fireEvent.change(screen.getByLabelText(esMessages.Profile.bio.label), {
      target: { value: 'Nuevo borrador' },
    });

    await act(async () => {
      finishSave(savedProfile);
      await pending;
    });

    expect(
      screen.getByRole('dialog', { name: esMessages.Profile.edit }),
    ).toBeTruthy();
    expect(screen.getByLabelText(esMessages.Profile.bio.label)).toHaveProperty(
      'value',
      'Nuevo borrador',
    );
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('loads current server values when reopening after the profile changes', async () => {
    const onSave = vi.fn();
    const { rerender } = render(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <ProfileEditor profile={profile} onSave={onSave} canEdit />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Common.actions.cancel }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    rerender(
      <NextIntlClientProvider locale='es' messages={esMessages}>
        <NavigationGuardProvider>
          <ProfileEditor
            profile={{ ...profile, bio: 'Perfil actualizado' }}
            onSave={onSave}
            canEdit
          />
        </NavigationGuardProvider>
      </NextIntlClientProvider>,
    );
    fireEvent.click(
      screen.getByRole('button', { name: esMessages.Profile.edit }),
    );

    expect(screen.getByLabelText(esMessages.Profile.bio.label)).toHaveProperty(
      'value',
      'Perfil actualizado',
    );
  });
});
