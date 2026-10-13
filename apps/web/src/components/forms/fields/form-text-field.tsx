'use client';

import { useId } from 'react';
import { Controller, type FieldValues } from 'react-hook-form';

import { Field, FieldError, FieldLabel } from '../../ui/field';
import { Input } from '../../ui/input';
import { BaseFormFieldProps } from './types';

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
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>

          <Input
            {...field}
            id={id}
            type={inputType}
            autoComplete={autoComplete}
            placeholder={placeholder}
            aria-invalid={fieldState.invalid}
            aria-describedby={fieldState.error ? errorId : undefined}
          />
          {fieldState.error && (
            <FieldError id={errorId} errors={[fieldState.error]} />
          )}
        </Field>
      )}
    />
  );
}
