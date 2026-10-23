'use client';

import { useId } from 'react';
import { Controller, type FieldValues } from 'react-hook-form';

import { Field, FieldLabel, Input } from '@/components/ui';

import { FormFieldFeedback } from './form-field-feedback';
import { BaseFormFieldProps } from './types';

export function FormFileField<T extends FieldValues>({
  control,
  name,
  label,
}: BaseFormFieldProps<T>) {
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
            id={id}
            type='file'
            accept='.pdf,application/pdf'
            aria-label={label}
            aria-invalid={fieldState.invalid}
            aria-describedby={fieldState.error ? errorId : undefined}
            onChange={(event) => {
              field.onChange(event.target.files?.[0]);
            }}
            onBlur={field.onBlur}
          />

          <FormFieldFeedback id={errorId} errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}
