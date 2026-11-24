'use client';

import { EMAIL_VERIFICATION_CODE_LENGTH } from '@ludora/contracts/auth';
import { useTranslations } from 'next-intl';
import type { Control } from 'react-hook-form';

import { FormTextField } from '@/components/forms';
import { CardDescription, FieldGroup } from '@/components/ui';
import type { RegisterFormData } from '@/lib/schemas';

import { userFields } from '../config';

type RegisterFormDataProps = {
  control: Control<RegisterFormData>;
};

export function RegisterFormInstructions() {
  const t = useTranslations('Register');

  return (
    <div className='space-y-1'>
      <CardDescription>
        {t('verificationCodeNotice', { length: EMAIL_VERIFICATION_CODE_LENGTH })}
      </CardDescription>
      <CardDescription>{t('requiredFields')}</CardDescription>
    </div>
  );
}

export default function RegisterFormData({ control }: RegisterFormDataProps) {
  const t = useTranslations('Register');

  return (
    <div className='w-full space-y-4'>
      <RegisterFormInstructions />
      <FieldGroup>
        {userFields.map((field) => (
          <FormTextField
            key={field.name}
            control={control}
            name={field.name}
            label={t(`fields.${field.name}.label`)}
            placeholder={t(`fields.${field.name}.placeholder`)}
            inputType={field.inputType}
            autoComplete={field.autoComplete}
            required
          />
        ))}
      </FieldGroup>
    </div>
  );
}
