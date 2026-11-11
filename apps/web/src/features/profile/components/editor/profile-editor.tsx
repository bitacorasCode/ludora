'use client';

import { useTranslations } from 'next-intl';
import { Controller, type ControllerProps } from 'react-hook-form';

import {
  FormDialog,
  FormTextareaField,
  SubmitButton,
} from '@/components/forms';
import { Button } from '@/components/ui';

import {
  useProfileEditor,
  type UseProfileEditorOptions,
} from '../../hooks/use-profile-editor';
import { BIO_MAX_LENGTH, type ProfilePreferences } from '../../schema';
import { AvatarPicker } from './avatar-picker';

type ProfileEditorProps = UseProfileEditorOptions & {
  canEdit: boolean;
};

export function ProfileEditor({
  profile,
  canEdit,
  onSave,
}: ProfileEditorProps) {
  const t = useTranslations('Profile');
  const common = useTranslations('Common');
  const { form, isEditing, onSubmit, handleOpenChange, handleCancel } =
    useProfileEditor({ profile, onSave });

  function formatBioCounter(count: number, max: number) {
    return t('bio.counter', { count, max });
  }

  const renderAvatarPicker: ControllerProps<
    ProfilePreferences,
    'avatarPresetId'
  >['render'] = ({ field }) => (
    <AvatarPicker
      nickname={profile.nickname}
      value={field.value}
      onChange={field.onChange}
    />
  );

  const trigger = canEdit ? (
    <Button
      type='button'
      variant='outline'
      className='self-start sm:self-center'
    >
      {t('edit')}
    </Button>
  ) : undefined;

  return (
    <FormDialog
      open={isEditing}
      onOpenChange={handleOpenChange}
      title={t('edit')}
      description={t('description')}
      trigger={trigger}
      className='max-w-2xl'
    >
      <form
        aria-label={t('edit')}
        aria-busy={form.formState.isSubmitting}
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
      >
        <fieldset
          disabled={!isEditing || form.formState.isSubmitting}
          className='space-y-8'
        >
          <Controller
            control={form.control}
            name='avatarPresetId'
            render={renderAvatarPicker}
          />

          <FormTextareaField
            control={form.control}
            name='bio'
            label={t('bio.label')}
            placeholder={t('bio.placeholder')}
            maxLength={BIO_MAX_LENGTH}
            rows={4}
            formatCounter={formatBioCounter}
          />

          <div className='flex flex-wrap gap-3'>
            <SubmitButton
              isSubmitting={form.formState.isSubmitting}
              mainText={common('actions.saveChanges')}
              submittingText={common('status.saving')}
            />
            <Button type='button' variant='outline' onClick={handleCancel}>
              {common('actions.cancel')}
            </Button>
          </div>
        </fieldset>
      </form>
    </FormDialog>
  );
}
