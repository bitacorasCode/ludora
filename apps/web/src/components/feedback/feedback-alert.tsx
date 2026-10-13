import type { ComponentProps } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui';

type AlertVariant = NonNullable<ComponentProps<typeof Alert>['variant']>;

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
  { variant: AlertVariant; role: 'status' | 'alert'; className: string }
>;

type FeedbackStatus = keyof typeof statusConfig;

type FeedbackAlertProps = {
  status: FeedbackStatus;
  title: string;
  message: string;
};

export function FeedbackAlert({ status, title, message }: FeedbackAlertProps) {
  const config = statusConfig[status];

  return (
    <Alert
      variant={config.variant}
      role={config.role}
      className={`mb-4 w-full ${config.className}`}
    >
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
