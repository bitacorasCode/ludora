'use client';

import { useTranslations } from 'next-intl';
import { Controller } from 'react-hook-form';

import { FormTextareaField } from '@/components/forms';
import { Button, Card, CardContent } from '@/components/ui';

import type { Profile } from '../config';
import { useProfileForm } from '../hooks/use-profile-form';
import { BIO_MAX_LENGTH, type ProfilePreferences } from '../schema';
import { AvatarPicker } from './avatar-picker';

type ProfileEditorProps = {
  profile: Profile;
  onSave: (preferences: ProfilePreferences) => Promise<void>;
  onCancel: () => void;
};

export function ProfileEditor({
  profile,
  onSave,
  onCancel,
}: ProfileEditorProps) {
  const t = useTranslations('Profile');
  const common = useTranslations('Common');
  const { form, onSubmit, saveError } = useProfileForm(profile, onSave);

  return (
    <Card>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <fieldset disabled={form.formState.isSubmitting} className='space-y-8'>
            <Controller
              control={form.control}
              name='avatarPresetId'
              render={({ field }) => (
                <AvatarPicker
                  nickname={profile.nickname}
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />

            <FormTextareaField
              control={form.control}
              name='bio'
              label={t('bioLabel')}
              placeholder={t('bioPlaceholder')}
              maxLength={BIO_MAX_LENGTH}
              rows={4}
              formatCounter={(count, max) => t('bioCounter', { count, max })}
            />

            {saveError && <p role='alert'>{t('saveError')}</p>}

            <div className='flex flex-wrap gap-3'>
              <Button type='submit'>{common('actions.saveChanges')}</Button>
              <Button type='button' variant='outline' onClick={onCancel}>
                {common('actions.cancel')}
              </Button>
            </div>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
