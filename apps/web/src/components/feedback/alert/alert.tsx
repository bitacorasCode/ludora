import type { ComponentProps } from 'react';

import { Alert as BaseAlert, AlertDescription, AlertTitle } from '@/components/ui';

type AlertVariant = NonNullable<ComponentProps<typeof BaseAlert>['variant']>;

const statusConfig = {
  success: {
    variant: 'default',
    role: 'status',
    className:
      'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  },
  warning: {
    variant: 'default',
    role: 'alert',
    className:
      'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
  },
  error: {
    variant: 'destructive',
    role: 'alert',
    className: 'border-destructive/40 bg-destructive/10',
  },
} as const satisfies Record<
  string,
  {
    variant: AlertVariant;
    role: 'status' | 'alert';
    className: string;
  }
>;

type AlertStatus = keyof typeof statusConfig;

type AlertProps = {
  status: AlertStatus;
  title?: string;
  message: string;
  role?: 'status' | 'alert';
};

export function Alert({
  status,
  title,
  message,
  role,
}: AlertProps) {
  const config = statusConfig[status];

  return (
    <BaseAlert
      variant={config.variant}
      role={role ?? config.role}
      aria-atomic='true'
      className={`mb-4 w-full ${config.className}`}
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription>{message}</AlertDescription>
    </BaseAlert>
  );
}
