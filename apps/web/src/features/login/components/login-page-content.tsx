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
import { createLoginSchema, type LoginFormData } from '@/lib/schemas';

const formId = 'login-form';

export function LoginPageContent() {
  const t = useTranslations('Login');
  const common = useTranslations('Common');
  const validation = useTranslations('Login.validation');

  const [submitted, setSubmitted] = useState(false);

  const form = useForm<LoginFormData>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    resolver: zodResolver(createLoginSchema((key) => validation(key))),
    defaultValues: { email: '', password: '' },
  });

  return (
    <FormPageCard
      formId={formId}
      skipToForm={t('skipToForm')}
      title={t('title')}
      description={t('description')}
    >
      <form
        id={formId}
        aria-label={t('title')}
        tabIndex={-1}
        onSubmit={form.handleSubmit(() => setSubmitted(true))}
        onChange={() => setSubmitted(false)}
        noValidate
      >
        {submitted && (
          <FeedbackAlert
            status='warning'
            title={t('feedbackTitle')}
            message={t('feedbackMessage')}
          />
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
          <div>
            <FormTextField
              control={form.control}
              name='password'
              inputType='password'
              autoComplete='current-password'
              label={t('password')}
              placeholder={t('passwordPlaceholder')}
            />
            <Button asChild variant='link' className='mt-2 px-0'>
              <Link href='/forgot-password'>{t('forgotPassword')}</Link>
            </Button>
          </div>
          <FormActions
            secondaryAction={
              <Button asChild variant='link'>
                <Link href='/register'>{t('register')}</Link>
              </Button>
            }
          >
            <SubmitButton
              isSubmitting={form.formState.isSubmitting}
              mainText={t('submit')}
              submittingText={common('status.validating')}
            />
          </FormActions>
        </FieldGroup>
      </form>
    </FormPageCard>
  );
}
