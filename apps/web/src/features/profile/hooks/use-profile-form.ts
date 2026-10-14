'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import type { Profile } from '../config';
import { type ProfilePreferences, profilePreferencesSchema } from '../schema';

export function useProfileForm(
  profile: Profile,
  onSave: (preferences: ProfilePreferences) => Promise<void>,
) {
  const [saveError, setSaveError] = useState(false);
  const form = useForm<ProfilePreferences>({
    resolver: zodResolver(profilePreferencesSchema),
    mode: 'onTouched',
    reValidateMode: 'onChange',
    defaultValues: {
      avatarPresetId: profile.avatarPresetId,
      bio: profile.bio ?? '',
    },
  });

  async function onSubmit(values: ProfilePreferences) {
    setSaveError(false);

    try {
      await onSave({
        avatarPresetId: values.avatarPresetId,
        bio: values.bio?.trim() || null,
      });
    } catch {
      setSaveError(true);
    }
  }

  return { form, onSubmit, saveError };
}
