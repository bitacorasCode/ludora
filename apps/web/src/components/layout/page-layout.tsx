import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export function PageContainer({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'mx-auto mt-8 w-full max-w-6xl px-4 sm:mt-10 sm:px-6 lg:px-8',
        className,
      )}
      {...props}
    />
  );
}

type PageSectionProps = ComponentProps<'section'> & {
  separated?: boolean;
};

export function PageSection({
  className,
  separated = false,
  ...props
}: PageSectionProps) {
  return (
    <section
      className={cn(
        'scroll-mt-24 flex flex-col gap-6 py-14 sm:py-20',
        separated && 'border-t',
        className,
      )}
      {...props}
    />
  );
}
