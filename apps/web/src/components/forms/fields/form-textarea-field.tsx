'use client';

import { useId } from 'react';
import { Controller, type FieldValues } from 'react-hook-form';

import { Field, FieldError, FieldLabel } from '../../ui/field';
import { Textarea } from '../../ui/textarea';
import type { BaseFormFieldProps } from './types';

type Props<T extends FieldValues> = BaseFormFieldProps<T> & {
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  formatCounter?: (count: number, max: number) => string;
};

export function FormTextareaField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  maxLength,
  rows,
  formatCounter,
}: Props<T>) {
  const id = useId();
  const counterId = `${id}-counter`;
  const errorId = `${id}-error`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const value = typeof field.value === 'string' ? field.value : '';
        const showCounter = maxLength !== undefined && formatCounter !== undefined;
        const describedBy = [
          showCounter ? counterId : null,
          fieldState.error ? errorId : null,
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id}>{label}</FieldLabel>
            <Textarea
              {...field}
              id={id}
              value={value}
              placeholder={placeholder}
              maxLength={maxLength}
              rows={rows}
              aria-invalid={fieldState.invalid}
              aria-describedby={describedBy || undefined}
            />
            {showCounter && (
              <p id={counterId} className='text-sm text-muted-foreground'>
                {formatCounter(value.length, maxLength)}
              </p>
            )}
            {fieldState.error && (
              <FieldError id={errorId} errors={[fieldState.error]} />
            )}
          </Field>
        );
      }}
    />
  );
}
