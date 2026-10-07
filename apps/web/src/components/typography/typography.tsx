import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

export function PageTitle({ className, ...props }: ComponentProps<'h1'>) {
  return (
    <h1
      className={cn(
        'text-4xl font-semibold tracking-tight sm:text-6xl',
        className,
      )}
      {...props}
    />
  );
}

export function SectionTitle({ className, ...props }: ComponentProps<'h2'>) {
  return (
    <h2
      className={cn('text-2xl font-semibold tracking-tight', className)}
      {...props}
    />
  );
}

export function SubsectionTitle({ className, ...props }: ComponentProps<'h3'>) {
  return (
    <h3
      className={cn('text-lg font-semibold tracking-tight', className)}
      {...props}
    />
  );
}

export function BodyText({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      className={cn('text-base leading-7 text-muted-foreground', className)}
      {...props}
    />
  );
}

export function Eyebrow({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'text-sm font-medium uppercase tracking-[0.18em] text-primary',
        className,
      )}
      {...props}
    />
  );
}

export function LeadText({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      className={cn('text-lg leading-8 text-muted-foreground', className)}
      {...props}
    />
  );
}
