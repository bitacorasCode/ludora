'use client';

import { EyeIcon, EyeOffIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Controller, type FieldValues } from 'react-hook-form';

import { Button, Field, FieldError, FieldLabel, Input } from '@/components/ui';

import type { BaseFormFieldProps } from './types';

type Props<T extends FieldValues> = BaseFormFieldProps<T> & {
  placeholder?: string;
  inputType?: 'text' | 'email' | 'password';
  autoComplete?: string;
};

export function FormTextField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  inputType = 'text',
  autoComplete,
}: Props<T>) {
  const t = useTranslations('FormTextField');
  const id = useId();
  const errorId = `${id}-error`;
  const [passwordVisible, setPasswordVisible] = useState(false);
  const showVisibilityToggle = inputType === 'password';

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>

          <div className='relative'>
            <Input
              {...field}
              id={id}
              type={
                inputType === 'password' && passwordVisible ? 'text' : inputType
              }
              autoComplete={autoComplete}
              placeholder={placeholder}
              className={showVisibilityToggle ? 'pr-10' : undefined}
              aria-invalid={fieldState.invalid}
              aria-describedby={fieldState.error ? errorId : undefined}
            />
            {showVisibilityToggle && (
              <Button
                type='button'
                variant='ghost'
                size='icon'
                className='absolute inset-y-0 right-0 my-auto rounded-l-none'
                aria-label={`${passwordVisible ? t('hide') : t('show')}: ${label}`}
                aria-controls={id}
                aria-pressed={passwordVisible}
                onClick={() => setPasswordVisible((visible) => !visible)}
              >
                <HugeiconsIcon
                  icon={passwordVisible ? EyeOffIcon : EyeIcon}
                  strokeWidth={2}
                  aria-hidden='true'
                />
              </Button>
            )}
          </div>
          {fieldState.error && (
            <FieldError id={errorId} errors={[fieldState.error]} />
          )}
        </Field>
      )}
    />
  );
}
