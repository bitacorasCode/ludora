import type { ReactNode } from 'react';

import { BodyText, SectionTitle } from '@/components/typography';
import { Card, CardFooter, CardHeader } from '@/components/ui';

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
  variant?: 'card' | 'inline';
};

export function EmptyState({
  title,
  description,
  action,
  icon,
  variant = 'card',
}: EmptyStateProps) {
  if (variant === 'inline') {
    return (
      <div className='flex w-full flex-col items-start gap-3'>
        {icon && (
          <span aria-hidden='true' className='text-primary'>
            {icon}
          </span>
        )}
        <BodyText className='font-medium text-foreground'>{title}</BodyText>
        <BodyText className='text-sm'>{description}</BodyText>
        {action}
      </div>
    );
  }

  return (
    <Card variant='empty'>
      <CardHeader>
        {icon && (
          <span aria-hidden='true' className='text-primary'>
            {icon}
          </span>
        )}
        <SectionTitle>{title}</SectionTitle>
        <BodyText>{description}</BodyText>
      </CardHeader>
      {action && <CardFooter>{action}</CardFooter>}
    </Card>
  );
}
