'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { type ReactNode, useId, useState } from 'react';
import { useForm } from 'react-hook-form';

import { FeedbackAlert } from '@/components/feedback';
import { FormTextField } from '@/components/forms';
import { Button, FieldGroup } from '@/components/ui';
import { createLoginSchema, type LoginFormData } from '@/lib/schemas';

type LoginFormProps = {
  id?: string;
  passwordHelp?: ReactNode;
};

export function LoginForm({ id, passwordHelp }: LoginFormProps) {
  const t = useTranslations('Login');
  const validation = useTranslations('Login.validation');
  const [submitted, setSubmitted] = useState(false);
  const generatedId = useId();
  const form = useForm<LoginFormData>({
    mode: 'onTouched',
    reValidateMode: 'onChange',
    resolver: zodResolver(createLoginSchema((key) => validation(key))),
    defaultValues: { email: '', password: '' },
  });

  return (
    <form
      id={id ?? generatedId}
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
          {passwordHelp}
        </div>
        <div className='flex justify-end'>
          <Button type='submit' disabled={form.formState.isSubmitting}>
            {t('submit')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
