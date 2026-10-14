'use client';

import { useTranslations } from 'next-intl';
import type { Control } from 'react-hook-form';

import { FormTextField } from '@/components/forms';
import { CardDescription, FieldGroup } from '@/components/ui';
import type { UserRegistrationFormData } from '@/lib/schemas';

import { userFields } from '../config';

type RegisterFormDataProps = {
  control: Control<UserRegistrationFormData>;
};

export default function RegisterFormData({ control }: RegisterFormDataProps) {
  const t = useTranslations('Register');

  return (
    <div className='w-full'>
      <CardDescription>{t('accountData')}</CardDescription>

      <FieldGroup className='mt-4'>
        {userFields.map((field) => (
          <FormTextField
            key={field.name}
            control={control}
            name={field.name}
            label={t(`fields.${field.name}.label`)}
            placeholder={t(`fields.${field.name}.placeholder`)}
            inputType={field.inputType}
            autoComplete={field.autoComplete}
          />
        ))}
      </FieldGroup>
    </div>
  );
}
