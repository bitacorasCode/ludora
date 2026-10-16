'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FeedbackAlert } from '@/components/feedback';
import {
  FormActions,
  FormPageCard,
  FormTextField,
  SubmitButton,
} from '@/components/forms';
import { Button, FieldGroup } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import {
  createPasswordResetSchema,
  type PasswordResetFormData,
} from '@/lib/schemas';

const formId = 'reset-password-form';

export function ResetPasswordPageContent() {
  const t = useTranslations('PasswordRecovery');
  const common = useTranslations('Common');
  const validation = useTranslations('PasswordRecovery.validation');

  const [submitted, setSubmitted] = useState(false);

  const form = useForm<PasswordResetFormData>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    resolver: zodResolver(createPasswordResetSchema((key) => validation(key))),
    defaultValues: { password: '', confirmPassword: '' },
  });

  return (
    <FormPageCard
      formId={formId}
      skipToForm={t('skipToForm')}
      title={t('reset.title')}
      description={t('reset.description')}
    >
      <form
        id={formId}
        aria-label={t('reset.title')}
        tabIndex={-1}
        onSubmit={form.handleSubmit(() => setSubmitted(true))}
        onChange={() => setSubmitted(false)}
        noValidate
      >
        {submitted && (
          <FeedbackAlert
            status='warning'
            title={t('reset.feedbackTitle')}
            message={t('reset.feedbackMessage')}
          />
        )}
        <FieldGroup>
          <FormTextField
            control={form.control}
            name='password'
            inputType='password'
            autoComplete='new-password'
            label={t('password')}
            placeholder={t('passwordPlaceholder')}
          />
          <FormTextField
            control={form.control}
            name='confirmPassword'
            inputType='password'
            autoComplete='new-password'
            label={t('confirmPassword')}
            placeholder={t('confirmPasswordPlaceholder')}
          />
          <FormActions
            secondaryAction={
              <Button asChild variant='link'>
                <Link href='/login'>{t('backToLogin')}</Link>
              </Button>
            }
          >
            <SubmitButton
              isSubmitting={form.formState.isSubmitting}
              mainText={t('reset.submit')}
              submittingText={common('status.validating')}
            />
          </FormActions>
        </FieldGroup>
      </form>
    </FormPageCard>
  );
}
