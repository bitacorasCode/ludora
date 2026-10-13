'use client';

import { Calendar01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { format } from 'date-fns';
import { useLocale } from 'next-intl';
import { useId } from 'react';
import { Controller, type FieldValues } from 'react-hook-form';

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
import { getDateFnsLocale } from '@/i18n/date-fns';

import { BaseFormFieldProps } from './types';

type Props<T extends FieldValues> = BaseFormFieldProps<T> & {
  placeholder: string;
};

export function FormDateField<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
}: Props<T>) {
  const locale = useLocale();
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>{label}</FieldLabel>

          <Popover
            onOpenChange={(open) => {
              if (!open) field.onBlur();
            }}
          >
            <PopoverTrigger asChild>
              <Button
                id={id}
                type='button'
                variant='outline'
                className='justify-between'
                aria-label={label}
                aria-invalid={fieldState.invalid}
                aria-describedby={fieldState.error ? errorId : undefined}
              >
                {field.value ? format(field.value, 'dd/MM/yyyy') : placeholder}
                <HugeiconsIcon icon={Calendar01Icon} />
              </Button>
            </PopoverTrigger>

            <PopoverContent className='w-auto p-0' align='start'>
              <Calendar
                mode='single'
                locale={getDateFnsLocale(locale)}
                selected={field.value}
                onSelect={field.onChange}
                captionLayout='dropdown'
              />
            </PopoverContent>
          </Popover>

          {fieldState.error && (
            <FieldError id={errorId} errors={[fieldState.error]} />
          )}
        </Field>
      )}
    />
  );
}
