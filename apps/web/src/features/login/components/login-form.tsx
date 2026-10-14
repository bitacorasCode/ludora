'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { FeedbackAlert } from '@/components/feedback';
import { FormPageCard, FormTextField } from '@/components/forms';
import { Button, FieldGroup } from '@/components/ui';
import { Link } from '@/i18n/navigation';
import { createLoginSchema, type LoginFormData } from '@/lib/schemas';

export function LoginForm() {
  const t = useTranslations('Login');
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
      formId='login-form'
      skipToForm={t('skipToForm')}
      title={t('title')}
      description={t('description')}
      footer={
        <div className='flex w-full flex-wrap items-center justify-between gap-2'>
          <Button asChild variant='link'>
            <Link href='/register'>{t('register')}</Link>
          </Button>
          <Button type='submit' form='login-form'>
            {t('submit')}
          </Button>
        </div>
      }
    >
      {submitted && (
        <FeedbackAlert
          status='warning'
          title={t('feedbackTitle')}
          message={t('feedbackMessage')}
        />
      )}
      <form
        id='login-form'
        tabIndex={-1}
        onSubmit={form.handleSubmit(() => setSubmitted(true))}
        onChange={() => setSubmitted(false)}
        noValidate
      >
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
        </FieldGroup>
      </form>
    </FormPageCard>
  );
}
