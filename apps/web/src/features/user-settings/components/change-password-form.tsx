'use client';

import { useTranslations } from 'next-intl';

import { FormActions, FormTextField, SubmitButton } from '@/components/forms';
import { useUnsavedChanges } from '@/components/navigation';
import { Button, FieldGroup, FieldSet } from '@/components/ui';

import { useChangePasswordForm } from '../hooks/use-change-password-form';

type ChangePasswordFormProps = {
  userId: string;
  onClose: () => void;
};

export function ChangePasswordForm({ userId, onClose }: ChangePasswordFormProps) {
  const t = useTranslations('UserSettings.password.form');
  const actions = useTranslations('Common.actions');
  const { form, onSubmit, dismissError, isSubmitting } = useChangePasswordForm(userId, onClose);
  const { requestNavigation } = useUnsavedChanges(form.formState.isDirty);

  return (
    <form
      className='w-full max-w-md'
      aria-label={t('title')}
      aria-busy={isSubmitting}
      onSubmit={form.handleSubmit(onSubmit)}
      onChange={dismissError}
      noValidate
    >
      <FieldSet disabled={isSubmitting}>
        <FieldGroup>
          <FormTextField
            control={form.control}
            name='currentPassword'
            label={t('currentPassword')}
            inputType='password'
            autoComplete='current-password'
            autoFocus
          />
          <FormTextField
            control={form.control}
            name='newPassword'
            label={t('newPassword')}
            inputType='password'
            autoComplete='new-password'
          />
          <FormTextField
            control={form.control}
            name='confirmPassword'
            label={t('confirmPassword')}
            inputType='password'
            autoComplete='new-password'
          />
          <FormActions secondaryAction={
            <Button type='button' variant='outline' onClick={() => requestNavigation(onClose)}>
              {actions('cancel')}
            </Button>
          }>
            <SubmitButton
              isSubmitting={isSubmitting}
              mainText={t('submit')}
              submittingText={t('submitting')}
            />
          </FormActions>
        </FieldGroup>
      </FieldSet>
    </form>
  );
}
