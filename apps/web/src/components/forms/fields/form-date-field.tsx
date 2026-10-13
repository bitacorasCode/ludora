'use client';

import { Calendar01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { format } from 'date-fns';
import { Controller, FieldValues } from 'react-hook-form';

import {
  Button,
  Calendar,
  Field,
  FieldError,
  FieldLabel,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui';

import { BaseFormFieldProps } from './types';

type Props<T extends FieldValues> = BaseFormFieldProps<T> & {
  placeholder?: string;
};

export function FormDateField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder = 'Seleccionar fecha',
}: Props<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel>{label}</FieldLabel>

          <Popover
            onOpenChange={(open) => {
              if (!open) field.onBlur();
            }}
          >
            <PopoverTrigger asChild>
              <Button
                type='button'
                variant='outline'
                className='justify-between'
                aria-label={label}
                aria-invalid={fieldState.invalid}
              >
                {field.value ? format(field.value, 'dd/MM/yyyy') : placeholder}
                <HugeiconsIcon icon={Calendar01Icon} />
              </Button>
            </PopoverTrigger>

            <PopoverContent className='w-auto p-0' align='start'>
              <Calendar
                mode='single'
                selected={field.value}
                onSelect={field.onChange}
                captionLayout='dropdown'
              />
            </PopoverContent>
          </Popover>

          {fieldState.error && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
