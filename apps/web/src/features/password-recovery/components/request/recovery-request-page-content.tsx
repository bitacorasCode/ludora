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
  createRecoveryRequestSchema,
  type RecoveryRequestFormData,
} from '@/lib/schemas';

const formId = 'recovery-request-form';

export function RecoveryRequestPageContent() {
  const t = useTranslations('PasswordRecovery');
  const common = useTranslations('Common');
  const validation = useTranslations('PasswordRecovery.validation');

  const [submitted, setSubmitted] = useState(false);

  const form = useForm<RecoveryRequestFormData>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    resolver: zodResolver(
      createRecoveryRequestSchema((key) => validation(key)),
    ),
    defaultValues: { email: '' },
  });

  return (
    <FormPageCard
      formId={formId}
      skipToForm={t('skipToForm')}
      title={t('request.title')}
      description={t('request.description')}
    >
      <form
        id={formId}
        aria-label={t('request.title')}
        tabIndex={-1}
        onSubmit={form.handleSubmit(() => setSubmitted(true))}
        onChange={() => setSubmitted(false)}
        noValidate
      >
        {submitted && (
          <div>
            <FeedbackAlert
              status='warning'
              title={t('request.feedbackTitle')}
              message={t('request.feedbackMessage')}
            />
            <Button asChild variant='link' className='px-0'>
              <Link href='/reset-password'>{t('request.previewReset')}</Link>
            </Button>
          </div>
        )}
        <FieldGroup>
          <FormTextField
            control={form.control}
            name='email'
            inputType='email'
            autoComplete='email'
            label={t('email')}
            placeholder={t('emailPlaceholder')}
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
              mainText={common('actions.continue')}
              submittingText={common('status.validating')}
            />
          </FormActions>
        </FieldGroup>
      </form>
    </FormPageCard>
  );
}
