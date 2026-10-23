'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import type { Profile } from '../config';
import { type ProfilePreferences, profilePreferencesSchema } from '../schema';

export function useProfileForm(
  profile: Profile,
  onSave: (preferences: ProfilePreferences) => Promise<void>,
) {
  const t = useTranslations('Profile');
  const isActive = useRef(true);
  const errorToastId = useRef<ReturnType<typeof toast.error> | null>(null);
  const form = useForm<ProfilePreferences>({
    resolver: zodResolver(profilePreferencesSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      avatarPresetId: profile.avatarPresetId,
      bio: profile.bio ?? '',
    },
  });

  const dismissSaveError = useCallback(() => {
    if (errorToastId.current === null) return;

    toast.dismiss(errorToastId.current);
    errorToastId.current = null;
  }, []);

  useEffect(() => {
    isActive.current = true;

    return () => {
      isActive.current = false;
      dismissSaveError();
    };
  }, [dismissSaveError]);

  async function onSubmit(values: ProfilePreferences) {
    dismissSaveError();

    try {
      await onSave({
        avatarPresetId: values.avatarPresetId,
        bio: values.bio?.trim() || null,
      });
    } catch {
      if (!isActive.current) return;

      errorToastId.current = toast.error(t('saveError'), {
        duration: Infinity,
      });
    }
  }

  return { form, onSubmit };
}
