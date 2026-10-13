'use client';

import { ErrorAlert } from '@/components/feedback/error-alert';
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
  const { form, submissionError, hasValidationErrors, onSubmit } =
    useRegisterForm();

  return (
    <div className='mx-auto md:w-1/2 w-full px-4 py-6 sm:px-6 lg:px-8'>
      <a
        href='#register-form'
        className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg'
      >
        Saltar al formulario
      </a>

      <Card className='w-full'>
        <CardHeader>
          <CardTitle>Registro</CardTitle>
        </CardHeader>
        <CardContent>
          {submissionError && (
            <ErrorAlert title='Algo salió mal' message={submissionError} />
          )}
          <form
            id='register-form'
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
          >
            <fieldset disabled={form.formState.isSubmitting}>
              <div className='grid gap-8 lg:grid-cols-2'>
                <RegisterFormData control={form.control} />
              </div>
            </fieldset>
          </form>
        </CardContent>
        <CardFooter className='pt-0'>
          <RegisterFormActions
            isSubmitting={form.formState.isSubmitting}
            disabled={form.formState.isSubmitting || hasValidationErrors}
          />
        </CardFooter>
      </Card>
    </div>
  );
}
