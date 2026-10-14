import type { ReactNode } from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui';

type FormPageCardProps = {
  formId: string;
  skipToForm: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode;
};

export function FormPageCard({
  formId,
  skipToForm,
  title,
  description,
  children,
  footer,
}: FormPageCardProps) {
  return (
    <div className='mx-auto w-full max-w-xl px-4 py-10 sm:px-6 sm:py-16'>
      <a
        href={`#${formId}`}
        className='sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg'
      >
        {skipToForm}
      </a>
      <Card className='w-full'>
        <CardHeader>
          <CardTitle>
            <h1>{title}</h1>
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
        <CardFooter className='flex flex-wrap gap-3 pt-0'>{footer}</CardFooter>
      </Card>
    </div>
  );
}
