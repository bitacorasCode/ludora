'use client';

import { useTranslations } from 'next-intl';

import { FeedbackAlert } from '@/components/feedback';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui';

import useRegisterForm from '../hooks/use-register-form';
import RegisterFormActions from './register-form-actions';
import RegisterFormData from './register-form-data';

export function RegisterForm() {
  const { form, submissionFeedback, onSubmit } = useRegisterForm();
  const t = useTranslations('Register');

  return (
    <div className='mx-auto md:w-1/2 w-full px-4 py-6 sm:px-6 lg:px-8'>
      <a
        href='#register-form'
        className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg'
      >
        {t('skipToForm')}
      </a>

      <Card className='w-full'>
        <CardHeader>
          <CardTitle>
            <h1>{t('title')}</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {submissionFeedback && (
            <FeedbackAlert
              status={submissionFeedback.status}
              title={submissionFeedback.title}
              message={submissionFeedback.message}
            />
          )}
          <form
            id='register-form'
            tabIndex={-1}
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            <fieldset disabled={form.formState.isSubmitting}>
              <legend className='sr-only'>{t('accountData')}</legend>
              <RegisterFormData control={form.control} />
            </fieldset>
          </form>
        </CardContent>
        <CardFooter className='pt-0'>
          <RegisterFormActions isSubmitting={form.formState.isSubmitting} />
        </CardFooter>
      </Card>
    </div>
  );
}
