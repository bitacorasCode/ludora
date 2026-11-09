'use client';

import { useTranslations } from 'next-intl';
import { Controller } from 'react-hook-form';

import { FormTextareaField, SubmitButton } from '@/components/forms';
import { useUnsavedChanges } from '@/components/navigation';
import { Button, Card, CardContent } from '@/components/ui';

import type { Profile } from '../../config';
import { useProfileForm } from '../../hooks/use-profile-form';
import { BIO_MAX_LENGTH, type ProfilePreferences } from '../../schema';
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
  const { form, onSubmit } = useProfileForm(profile, onSave);

  const { requestNavigation } = useUnsavedChanges(form.formState.isDirty);

  return (
    <Card>
      <CardContent>
        <form
          aria-label={t('edit')}
          aria-busy={form.formState.isSubmitting}
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
        >
          <fieldset
            disabled={form.formState.isSubmitting}
            className='space-y-8'
          >
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
              label={t('bio.label')}
              placeholder={t('bio.placeholder')}
              maxLength={BIO_MAX_LENGTH}
              rows={4}
              formatCounter={(count, max) => t('bio.counter', { count, max })}
            />

            <div className='flex flex-wrap gap-3'>
              <SubmitButton
                isSubmitting={form.formState.isSubmitting}
                mainText={common('actions.saveChanges')}
                submittingText={common('status.saving')}
              />
              <Button
                type='button'
                variant='outline'
                onClick={() => requestNavigation(onCancel)}
              >
                {common('actions.cancel')}
              </Button>
            </div>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}
